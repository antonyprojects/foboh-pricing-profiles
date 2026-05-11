import { store } from "../store/store.js";
import { applyAdjustment, describeAdjustment, productInScope } from "./pricing.js";
import { HttpError } from "../middleware/errorHandler.js";

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
 * Why this shape:
 *   1. A profile that names a single customer + single SKU is a
 *      deliberate, individually negotiated price. It should never be
 *      out-voted by a broad group-level rule. Specificity captures that
 *      "the supplier was being deliberate about this exact case".
 *   2. Customer specificity is weighted ahead of product specificity:
 *      "this exact customer on a brand" beats "any customer in a group
 *      on this exact SKU". A specific customer relationship is the
 *      stronger commercial signal in B2B wholesale.
 *   3. `priority` is a manual lever for the rare case where ops needs
 *      to force a different ordering without restructuring scopes.
 *      Defaults to 100 so there's room either side.
 *   4. Newest wins on full ties because the most recent edit is the
 *      most current commercial decision. Profile id is the final
 *      tiebreaker so the answer is deterministic even if two profiles
 *      share an updatedAt millisecond.
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

const specificityOf = (profile) => ({
  customer: CUSTOMER_SCORE[profile.customerScope.kind],
  product: PRODUCT_SCORE[profile.productScope.kind],
  priority: profile.priority ?? 100,
});

/**
 * Lexicographic compare. Returns negative when `a` wins.
 */
const compareProfiles = (a, b) => {
  const sa = specificityOf(a);
  const sb = specificityOf(b);
  if (sa.customer !== sb.customer) return sa.customer - sb.customer;
  if (sa.product !== sb.product) return sa.product - sb.product;
  if (sa.priority !== sb.priority) return sa.priority - sb.priority;
  const ta = Date.parse(a.updatedAt) || 0;
  const tb = Date.parse(b.updatedAt) || 0;
  if (ta !== tb) return tb - ta; // newer wins
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
 *
 * @param {string} customerId
 * @param {string} sku
 * @returns Resolution payload with the winning price, source profile,
 *          plain-English reason, and the full ordered candidate list
 *          (useful for debugging and for the UI's "why" affordance).
 */
export const resolvePrice = (customerId, sku) => {
  const customer = store.getCustomer(customerId);
  if (!customer) throw new HttpError(404, "NOT_FOUND", `Unknown customer: ${customerId}`);

  const product = store.getProduct(sku);
  if (!product) throw new HttpError(404, "NOT_FOUND", `Unknown product: ${sku}`);

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
    return {
      customerId,
      sku,
      basePrice: product.basePrice,
      price: product.basePrice,
      sourceProfileId: null,
      sourceProfileName: null,
      reason: `No pricing profile applies to ${customer.name} for ${product.title}. Charging the catalogue base price.`,
      considered,
    };
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
