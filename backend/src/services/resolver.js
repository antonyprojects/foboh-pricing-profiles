import { store } from "../store/store.js";
import { applyAdjustment, describeAdjustment, productInScope } from "./pricing.js";
import { HttpError } from "../middleware/errorHandler.js";
import { logger } from "../config/logger.js";

/**
 * Precedence rule — "most specific commercial intent wins".
 *
 * Each candidate profile is scored as a tuple, compared lexicographically:
 *
 *   (customerScore, productScore, priority, -updatedAtMs, profileId)
 *
 *   customerScore : customer (1) < customer_group (2) < all_customers (3)
 *   productScore  : sku (1) < brand|sub_category (2) < segment (3) < all_products (4)
 *   priority      : explicit override field on the profile; lower wins
 *   updatedAtMs   : negated so newer wins on ties
 *   profileId     : deterministic final tiebreaker
 *
 * The smallest tuple wins.
 *
 * Error handling stance: every scoring lookup checks that it found a
 * real value. A profile with a corrupted `customerScope.kind` would
 * otherwise produce `undefined - undefined = NaN`, which makes the
 * sort comparator non-deterministic — exactly the silent-fail we
 * don't want. We throw with the offending profile id so the operator
 * can grep for it.
 */

const CUSTOMER_SCORE = {
  customer: 1,
  customer_group: 2,
  all_customers: 3,
};

const PRODUCT_SCORE = {
  sku: 1,
  brand: 2,
  sub_category: 2,
  segment: 3,
  all_products: 4,
};

const scoreOf = (table, key, fieldName, profileId) => {
  const v = table[key];
  if (typeof v !== "number") {
    throw new Error(
      `Resolver: profile ${profileId} has unknown ${fieldName}=${JSON.stringify(key)}; ` +
      `expected one of ${Object.keys(table).join(", ")}`,
    );
  }
  return v;
};

const specificityOf = (profile) => ({
  customer: scoreOf(CUSTOMER_SCORE, profile.customerScope?.kind, "customerScope.kind", profile.id),
  product: scoreOf(PRODUCT_SCORE, profile.productScope?.kind, "productScope.kind", profile.id),
  priority: typeof profile.priority === "number" ? profile.priority : 100,
});

const updatedAtMs = (profile) => {
  const ms = Date.parse(profile.updatedAt);
  if (Number.isNaN(ms)) {
    // Not throw-worthy on its own (the resolver can still produce a
    // deterministic answer using the profileId tiebreaker), but log
    // loudly so the bad data surfaces in ops.
    logger.warn("Resolver: profile has invalid updatedAt; falling back to 0", {
      profileId: profile.id,
      updatedAt: profile.updatedAt,
    });
    return 0;
  }
  return ms;
};

/**
 * Lexicographic compare. Returns negative when `a` wins.
 */
const compareProfiles = (a, b) => {
  const sa = specificityOf(a);
  const sb = specificityOf(b);
  if (sa.customer !== sb.customer) return sa.customer - sb.customer;
  if (sa.product !== sb.product) return sa.product - sb.product;
  if (sa.priority !== sb.priority) return sa.priority - sb.priority;
  const ta = updatedAtMs(a);
  const tb = updatedAtMs(b);
  if (ta !== tb) return tb - ta;
  return a.id.localeCompare(b.id);
};

const reasonFor = (profile, customer, product) => {
  const parts = [];
  parts.push(`Matched profile "${profile.name}" (${profile.id}).`);

  const c = profile.customerScope;
  if (c.kind === "customer") parts.push(`Customer scope targets ${customer.name} directly.`);
  else if (c.kind === "customer_group") {
    const group = store.listGroups().find((g) => g.id === c.groupId);
    parts.push(`${customer.name} is in group "${group?.name ?? c.groupId}".`);
  } else parts.push("Applies to all customers.");

  const p = profile.productScope;
  if (p.kind === "sku") parts.push(`Product scope targets SKU ${product.sku} directly.`);
  else if (p.kind === "brand") parts.push(`${product.title} is in brand "${product.brand}".`);
  else if (p.kind === "sub_category") parts.push(`${product.title} is in sub-category "${product.subCategory}".`);
  else if (p.kind === "segment") parts.push(`${product.title} is in segment "${product.segment}".`);
  else parts.push("Applies to all products.");

  parts.push(`Adjustment: ${describeAdjustment(profile.adjustment)}.`);
  parts.push("Won on precedence: most specific (customer, product) scope; ties broken by priority then most-recently-updated.");
  return parts.join(" ");
};

/**
 * Resolve the effective price for a (customer, product) pair.
 */
export const resolvePrice = (customerId, sku) => {
  if (typeof customerId !== "string" || !customerId.trim()) {
    throw new HttpError(400, "INVALID_INPUT", "customerId must be a non-empty string");
  }
  if (typeof sku !== "string" || !sku.trim()) {
    throw new HttpError(400, "INVALID_INPUT", "sku must be a non-empty string");
  }

  const customer = store.getCustomer(customerId);
  if (!customer) throw new HttpError(404, "NOT_FOUND", `Unknown customer: ${customerId}`);

  const product = store.getProduct(sku);
  if (!product) throw new HttpError(404, "NOT_FOUND", `Unknown product: ${sku}`);

  // We filter inactive products at the resolver too, not just the
  // catalogue. An inactive product reaching here means the supplier
  // explicitly looked it up by SKU; we return base-price-no-profile
  // rather than 404 so historical references keep resolving.
  if (!product.active) {
    return baseOnlyResult(customer, product, "Product is inactive; charging catalogue base price.");
  }

  const candidates = store
    .candidateProfilesForCustomer(customerId)
    .filter((p) => productInScope(product, p.productScope));

  candidates.sort(compareProfiles);

  const considered = candidates.map((p) => ({
    profileId: p.id,
    profileName: p.name,
    specificity: specificityOf(p),
    computedPrice: applyAdjustment(product.basePrice, p.adjustment),
  }));

  if (candidates.length === 0) {
    return baseOnlyResult(customer, product, `No pricing profile applies to ${customer.name} for ${product.title}. Charging the catalogue base price.`);
  }

  const winner = candidates[0];
  return {
    customerId,
    sku,
    basePrice: product.basePrice,
    price: applyAdjustment(product.basePrice, winner.adjustment),
    sourceProfileId: winner.id,
    sourceProfileName: winner.name,
    reason: reasonFor(winner, customer, product),
    considered,
  };
};

const baseOnlyResult = (customer, product, reason) => ({
  customerId: customer.id,
  sku: product.sku,
  basePrice: product.basePrice,
  price: product.basePrice,
  sourceProfileId: null,
  sourceProfileName: null,
  reason,
  considered: [],
});
