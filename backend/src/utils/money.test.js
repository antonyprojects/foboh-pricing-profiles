import { test } from "node:test";
import assert from "node:assert/strict";
import { roundMoney, clampNonNegative } from "./money.js";

test("roundMoney rounds half-up at two decimals", () => {
  assert.equal(roundMoney(1.005), 1.01);
  assert.equal(roundMoney(2.345), 2.35);
  assert.equal(roundMoney(0), 0);
});

test("roundMoney rejects NaN (would otherwise serialize to JSON null)", () => {
  assert.throws(() => roundMoney(Number.NaN), /finite number/);
});

test("roundMoney rejects Infinity", () => {
  assert.throws(() => roundMoney(Number.POSITIVE_INFINITY), /finite number/);
  assert.throws(() => roundMoney(Number.NEGATIVE_INFINITY), /finite number/);
});

test("roundMoney rejects non-numbers", () => {
  assert.throws(() => roundMoney("12.34"), /finite number/);
  assert.throws(() => roundMoney(undefined), /finite number/);
  assert.throws(() => roundMoney(null), /finite number/);
});

test("clampNonNegative passes through positives and zero, floors negatives", () => {
  assert.equal(clampNonNegative(5), 5);
  assert.equal(clampNonNegative(0), 0);
  assert.equal(clampNonNegative(-1), 0);
});

test("clampNonNegative rejects NaN (would otherwise pass through, since NaN<0 is false)", () => {
  assert.throws(() => clampNonNegative(Number.NaN), /finite number/);
});
