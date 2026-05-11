/**
 * All money in this service is stored as a plain `number` in major units
 * (e.g. AUD 12.34). To avoid the usual FP drift on multiplication and
 * addition we always round through cents at the boundary.
 *
 * If this ever ships to real production it should move to integer cents
 * (or a decimal library) end-to-end. Calling that out explicitly so
 * nobody mistakes the demo for the destination.
 */
export const roundMoney = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export const clampNonNegative = (n) => (n < 0 ? 0 : n);
