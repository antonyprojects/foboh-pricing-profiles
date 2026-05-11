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
 */
export const applyAdjustment = (basePrice, adjustment) => {
  if (typeof basePrice !== "number" || !Number.isFinite(basePrice)) {
    throw new TypeError("basePrice must be a finite number");
  }

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
      throw new Error(`Unknown adjustment kind: ${kind}`);
  }

  return roundMoney(clampNonNegative(next));
};

/**
 * Build the human-readable description of an adjustment. Used in the
 * resolver's `reason` text and in UI tooltips.
 */
export const describeAdjustment = (adjustment) => {
  const { kind, direction, value } = adjustment;
  if (kind === "absolute") return `flat $${value.toFixed(2)}`;
  const verb = direction === "decrease" ? "off" : "above";
  if (kind === "fixed") return `$${value.toFixed(2)} ${verb} base`;
  return `${value}% ${verb} base`;
};

/**
 * Decide whether a profile's productScope captures a given product.
 * `skus` array, when set, acts as a hard intersect on top of `kind`.
 */
export const productInScope = (product, scope) => {
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
      return false;
  }
};

export const productsInScope = (allProducts, scope) =>
  allProducts.filter((p) => p.active && productInScope(p, scope));
