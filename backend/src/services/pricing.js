import { roundMoney, clampNonNegative } from "../utils/money.js";

/**
 * Apply an adjustment to a base price.
 *
 *   fixed    : New = Base ± value
 *   dynamic  : New = Base ± (value% × Base)
 *   absolute : New = value           (direction is ignored)
 *
 * The new price is floored at 0 — a negative price is never returned,
 * even when the supplier writes a profile that would otherwise produce
 * one. This matches the brief.
 *
 * Error handling stance: this is the single source of truth for "given
 * a base and an adjustment, what's the new price?" — preview, save and
 * resolve all funnel through here. Anything ambiguous (NaN value,
 * missing direction on fixed/dynamic, unknown kind) is a programmer or
 * data integrity error, not a request error, and we throw a clear
 * Error rather than silently returning NaN that JSON-serializes to
 * null in the response.
 */

const ADJUSTMENT_KINDS = new Set(["fixed", "dynamic", "absolute"]);
const ADJUSTMENT_DIRECTIONS = new Set(["increase", "decrease"]);

const PRODUCT_SCOPE_KINDS = new Set(["all_products", "sku", "brand", "sub_category", "segment"]);

const assertValidAdjustment = (adjustment) => {
  if (!adjustment || typeof adjustment !== "object") {
    throw new TypeError(`adjustment must be an object, got ${typeof adjustment}`);
  }
  const { kind, direction, value } = adjustment;

  if (!ADJUSTMENT_KINDS.has(kind)) {
    throw new RangeError(
      `Unknown adjustment kind: ${JSON.stringify(kind)} (expected one of ${[...ADJUSTMENT_KINDS].join(", ")})`,
    );
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`adjustment.value must be a finite number, got ${describeValue(value)}`);
  }
  if (kind !== "absolute") {
    if (!ADJUSTMENT_DIRECTIONS.has(direction)) {
      throw new RangeError(
        `adjustment.direction required for kind=${kind} (got ${JSON.stringify(direction)})`,
      );
    }
  }
};

const describeValue = (v) => {
  if (typeof v === "number") {
    if (Number.isNaN(v)) return "NaN";
    if (!Number.isFinite(v)) return "Infinity";
  }
  return `${typeof v}(${String(v)})`;
};

export const applyAdjustment = (basePrice, adjustment) => {
  if (typeof basePrice !== "number" || !Number.isFinite(basePrice)) {
    throw new TypeError(`basePrice must be a finite number, got ${describeValue(basePrice)}`);
  }
  assertValidAdjustment(adjustment);

  const { kind, direction, value } = adjustment;
  const sign = direction === "decrease" ? -1 : 1;

  let next;
  switch (kind) {
    case "fixed":
      next = basePrice + sign * value;
      break;
    case "dynamic":
      next = basePrice + sign * (value / 100) * basePrice;
      break;
    case "absolute":
      next = value;
      break;
    default:
      // Unreachable — assertValidAdjustment already rejected anything
      // outside ADJUSTMENT_KINDS, but the throw is here so a future
      // refactor can't silently fall through.
      throw new RangeError(`Unhandled adjustment kind reached calculator: ${kind}`);
  }

  return roundMoney(clampNonNegative(next));
};

/**
 * Build the human-readable description of an adjustment. Used in the
 * resolver's `reason` text and in UI tooltips. Validates first so the
 * `toFixed` calls below can't blow up on non-numbers.
 */
export const describeAdjustment = (adjustment) => {
  assertValidAdjustment(adjustment);
  const { kind, direction, value } = adjustment;
  if (kind === "absolute") return `flat $${value.toFixed(2)}`;
  const verb = direction === "decrease" ? "off" : "above";
  if (kind === "fixed") return `$${value.toFixed(2)} ${verb} base`;
  return `${value}% ${verb} base`;
};

/**
 * Decide whether a profile's productScope captures a given product.
 * `skus` array, when set, acts as a hard intersect on top of `kind`.
 *
 * Throws on unknown kind: silently returning `false` would mean a
 * profile with a corrupted scope quietly stops matching anything,
 * which the supplier would have no way to debug. Throwing surfaces
 * the bug at the resolver's reason text and in logs.
 */
export const productInScope = (product, scope) => {
  if (!product || typeof product !== "object") {
    throw new TypeError("product must be an object");
  }
  if (!scope || typeof scope !== "object") {
    throw new TypeError("scope must be an object");
  }
  if (!PRODUCT_SCOPE_KINDS.has(scope.kind)) {
    throw new RangeError(
      `Unknown productScope kind: ${JSON.stringify(scope.kind)} (expected one of ${[...PRODUCT_SCOPE_KINDS].join(", ")})`,
    );
  }

  if (scope.skus && !scope.skus.includes(product.sku)) return false;

  switch (scope.kind) {
    case "all_products":
      return true;
    case "sku":
      return product.sku === scope.sku;
    case "brand":
      return product.brand === scope.brand;
    case "sub_category":
      return product.subCategory === scope.subCategory;
    case "segment":
      return product.segment === scope.segment;
    default:
      // Unreachable; see ADJUSTMENT_KINDS comment above for rationale.
      throw new RangeError(`Unhandled productScope kind reached matcher: ${scope.kind}`);
  }
};

export const productsInScope = (allProducts, scope) => {
  if (!Array.isArray(allProducts)) {
    throw new TypeError("productsInScope: allProducts must be an array");
  }
  return allProducts.filter((p) => p.active && productInScope(p, scope));
};
