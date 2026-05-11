import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { store } from "../store/store.js";
import { resolvePrice } from "./resolver.js";

before(() => store.loadSeed());
beforeEach(() => store.loadSeed());

test("worked scenario: Bondi Cellars on Koyama Methode Brut Nature NV → $95 from Profile C", () => {
  const result = resolvePrice("cust_bondi_cellars", "KOYBRUNV6");
  assert.equal(result.price, 95);
  assert.equal(result.sourceProfileId, "prof_seed_C_bondi_koyama");
  assert.equal(result.considered.length, 3, "all three scenario profiles match");
  assert.equal(result.considered[0].profileId, "prof_seed_C_bondi_koyama", "C wins");
});

test("Bondi on a non-sparkling wine: only A matches (10% off)", () => {
  // Profile A: 10% off Wine for Independent Retailers, includes Bondi.
  // B requires Sparkling. C is sku-specific. So A is the only match.
  const result = resolvePrice("cust_bondi_cellars", "HGVPIN216");
  assert.equal(result.sourceProfileId, "prof_seed_A_wine_independent");
  assert.equal(result.price, 251.15); // 279.06 - 10%
});

test("VIP-only customer on a Sparkling product: B wins on its only match", () => {
  // Lush Wines is VIP only; B applies, A does not, C is bondi-only.
  const result = resolvePrice("cust_lush_wines", "KOYBRUNV6");
  assert.equal(result.sourceProfileId, "prof_seed_B_sparkling_vip");
  assert.equal(result.price, 105); // 120 - 15
});

test("no profile applies → base price returned with null source", () => {
  // Corner Store has no groups, no direct profiles. Product is not in
  // an all-products global. → base price.
  const result = resolvePrice("cust_corner_store", "HGVPIN216");
  assert.equal(result.price, 279.06);
  assert.equal(result.sourceProfileId, null);
});

test("customer+sku beats group+sku even when group rule is cheaper", () => {
  // Build a group rule that would give a much bigger discount on the
  // same SKU than the customer-specific rule does. Specificity wins
  // anyway because the supplier was deliberate about the customer pair.
  store.createProfile({
    id: "prof_test_group_sku_big_discount",
    name: "VIPs get $1 on KOYBRUNV6",
    customerScope: { kind: "customer_group", groupId: "grp_vip" },
    productScope: { kind: "sku", sku: "KOYBRUNV6" },
    adjustment: { kind: "absolute", value: 1 },
    priority: 100,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const result = resolvePrice("cust_bondi_cellars", "KOYBRUNV6");
  assert.equal(result.sourceProfileId, "prof_seed_C_bondi_koyama", "customer+sku still wins");
  assert.equal(result.price, 95);
});

test("priority override flips the winner when specificity ties", () => {
  // Two profiles at the same (customer-group, sub_category) specificity.
  // Lower priority wins.
  store.createProfile({
    id: "prof_test_priority_winner",
    name: "Override on Independent Retailers + Wine",
    customerScope: { kind: "customer_group", groupId: "grp_independent_retailers" },
    productScope: { kind: "sub_category", subCategory: "Wine" },
    adjustment: { kind: "fixed", direction: "decrease", value: 5 },
    priority: 10,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  // Bondi is in Independent Retailers; pick a non-sparkling wine to keep
  // it apples-to-apples with Profile A.
  const result = resolvePrice("cust_bondi_cellars", "HGVPIN216");
  assert.equal(result.sourceProfileId, "prof_test_priority_winner");
  assert.equal(result.price, 274.06); // 279.06 - 5
});

test("inactive profiles are excluded from consideration", () => {
  // Disable Profile C and confirm the next-most-specific wins instead.
  const c = store.getProfile("prof_seed_C_bondi_koyama");
  store.updateProfile(c.id, { ...c, active: false });
  const result = resolvePrice("cust_bondi_cellars", "KOYBRUNV6");
  assert.notEqual(result.sourceProfileId, "prof_seed_C_bondi_koyama");
});

test("absolute price is floored at 0 (never negative)", () => {
  store.createProfile({
    id: "prof_test_neg",
    name: "negative price test",
    customerScope: { kind: "customer", customerId: "cust_lush_wines" },
    productScope: { kind: "sku", sku: "KOYBRUNV6" },
    adjustment: { kind: "fixed", direction: "decrease", value: 999 },
    priority: 100,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const result = resolvePrice("cust_lush_wines", "KOYBRUNV6");
  assert.equal(result.price, 0);
});

test("reason text mentions the winning profile, scope path, and adjustment", () => {
  const result = resolvePrice("cust_bondi_cellars", "KOYBRUNV6");
  assert.match(result.reason, /Bondi Cellars/);
  assert.match(result.reason, /KOYBRUNV6/);
  assert.match(result.reason, /flat \$95/);
});
