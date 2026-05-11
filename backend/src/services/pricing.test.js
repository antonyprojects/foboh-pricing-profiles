import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAdjustment, productInScope, describeAdjustment } from "./pricing.js";

test("fixed decrease subtracts from base", () => {
  assert.equal(applyAdjustment(120, { kind: "fixed", direction: "decrease", value: 15 }), 105);
});

test("fixed increase adds to base", () => {
  assert.equal(applyAdjustment(120, { kind: "fixed", direction: "increase", value: 15 }), 135);
});

test("dynamic decrease applies percentage off", () => {
  assert.equal(applyAdjustment(279.06, { kind: "dynamic", direction: "decrease", value: 10 }), 251.15);
});

test("absolute pins price regardless of base", () => {
  assert.equal(applyAdjustment(120, { kind: "absolute", value: 95 }), 95);
  assert.equal(applyAdjustment(999, { kind: "absolute", value: 95 }), 95);
});

test("price is never negative", () => {
  assert.equal(applyAdjustment(10, { kind: "fixed", direction: "decrease", value: 50 }), 0);
  assert.equal(applyAdjustment(10, { kind: "absolute", value: -5 }), 0);
});

test("describeAdjustment formats each kind", () => {
  assert.equal(describeAdjustment({ kind: "absolute", value: 95 }), "flat $95.00");
  assert.equal(describeAdjustment({ kind: "fixed", direction: "decrease", value: 15 }), "$15.00 off base");
  assert.equal(describeAdjustment({ kind: "dynamic", direction: "decrease", value: 10 }), "10% off base");
});

test("productInScope respects optional skus filter", () => {
  const p = { sku: "A", brand: "X", subCategory: "Wine", segment: "Red", active: true };
  assert.equal(productInScope(p, { kind: "all_products" }), true);
  assert.equal(productInScope(p, { kind: "all_products", skus: ["B"] }), false);
  assert.equal(productInScope(p, { kind: "brand", brand: "X" }), true);
  assert.equal(productInScope(p, { kind: "sub_category", subCategory: "Wine" }), true);
  assert.equal(productInScope(p, { kind: "segment", segment: "White" }), false);
});

// ---- error handling guarantees -----------------------------------------

test("applyAdjustment rejects NaN basePrice (would otherwise serialize to null)", () => {
  assert.throws(
    () => applyAdjustment(Number.NaN, { kind: "fixed", direction: "decrease", value: 5 }),
    /basePrice must be a finite number/,
  );
});

test("applyAdjustment rejects NaN adjustment value (would otherwise leak NaN through to JSON)", () => {
  assert.throws(
    () => applyAdjustment(100, { kind: "fixed", direction: "decrease", value: Number.NaN }),
    /adjustment\.value must be a finite number/,
  );
});

test("applyAdjustment rejects Infinity values", () => {
  assert.throws(
    () => applyAdjustment(100, { kind: "dynamic", direction: "decrease", value: Infinity }),
    /adjustment\.value must be a finite number/,
  );
});

test("applyAdjustment rejects unknown adjustment kind", () => {
  assert.throws(
    () => applyAdjustment(100, { kind: "totally-made-up", value: 5 }),
    /Unknown adjustment kind/,
  );
});

test("applyAdjustment rejects fixed/dynamic without a direction", () => {
  assert.throws(
    () => applyAdjustment(100, { kind: "fixed", value: 5 }),
    /direction required for kind=fixed/,
  );
  assert.throws(
    () => applyAdjustment(100, { kind: "dynamic", value: 5 }),
    /direction required for kind=dynamic/,
  );
});

test("describeAdjustment rejects non-numeric values rather than crashing on toFixed", () => {
  assert.throws(
    () => describeAdjustment({ kind: "fixed", direction: "decrease", value: "five" }),
    /adjustment\.value must be a finite number/,
  );
});

test("productInScope throws on unknown scope kind (instead of silently returning false)", () => {
  const p = { sku: "A", brand: "X", subCategory: "Wine", segment: "Red", active: true };
  assert.throws(
    () => productInScope(p, { kind: "category" }),
    /Unknown productScope kind/,
  );
});
