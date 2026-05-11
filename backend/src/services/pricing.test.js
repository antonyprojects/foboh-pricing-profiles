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
