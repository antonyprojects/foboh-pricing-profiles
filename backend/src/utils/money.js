/**
 * All money in this service is stored as a plain `number` in major units
 * (e.g. AUD 12.34). To avoid the usual FP drift on multiplication and
 * addition we always round through cents at the boundary.
 *
 * If this ever ships to real production it should move to integer cents
 * (or a decimal library) end-to-end. Calling that out explicitly so
 * nobody mistakes the demo for the destination.
 *
 * Error handling stance: every helper here rejects non-numbers and
 * non-finite numbers immediately. The whole point of these helpers is
 * to keep garbage out of the pricing pipeline; if NaN leaks through it
 * gets serialized to `null` in JSON and the supplier sees a phantom
 * price. Better to fail loudly here than be wrong cheaply downstream.
 */

const assertFiniteNumber = (n, label) => {
  if (typeof n !== "number" || !Number.isFinite(n)) {
    throw new TypeError(`${label} must be a finite number, got ${describe(n)}`);
  }
};

const describe = (v) => {
  if (typeof v === "number") {
    if (Number.isNaN(v)) return "NaN";
    if (!Number.isFinite(v)) return "Infinity";
    return String(v);
  }
  return `${typeof v}(${String(v)})`;
};

export const roundMoney = (n) => {
  assertFiniteNumber(n, "roundMoney input");
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

export const clampNonNegative = (n) => {
  assertFiniteNumber(n, "clampNonNegative input");
  return n < 0 ? 0 : n;
};
