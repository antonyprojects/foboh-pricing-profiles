import { test } from "node:test";
import assert from "node:assert/strict";
import { store } from "./store.js";

test("seed loaded products, customers, groups and profiles", () => {
  assert.ok(store.listProducts().length >= 5, "expected at least the brief's 5 products");
  assert.ok(store.listCustomers().length >= 1);
  assert.ok(store.listGroups().length >= 2);
  assert.equal(store.listProfiles().length, 3, "three seed profiles from the scenario");
});

test("candidateProfilesForCustomer picks up customer- and group-scoped profiles", () => {
  const cands = store.candidateProfilesForCustomer("cust_bondi_cellars");
  const ids = new Set(cands.map((p) => p.id));
  assert.ok(ids.has("prof_seed_A_wine_independent"), "A via Independent Retailers group");
  assert.ok(ids.has("prof_seed_B_sparkling_vip"), "B via VIP group");
  assert.ok(ids.has("prof_seed_C_bondi_koyama"), "C via direct customer scope");
});

test("candidate set for a customer with no overlapping scopes is empty-ish", () => {
  const cands = store.candidateProfilesForCustomer("cust_corner_store");
  assert.equal(cands.length, 0, "no group memberships, no direct profiles, no globals");
});

test("indices stay in sync across create/update/delete", () => {
  const created = store.createProfile({
    id: "prof_test_global",
    name: "global test",
    customerScope: { kind: "all_customers" },
    productScope: { kind: "all_products" },
    adjustment: { kind: "fixed", direction: "decrease", value: 1 },
    priority: 100,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  assert.ok(store.candidateProfilesForCustomer("cust_corner_store").some((p) => p.id === created.id));

  store.updateProfile(created.id, {
    customerScope: { kind: "customer", customerId: "cust_corner_store" },
  });
  assert.ok(store.candidateProfilesForCustomer("cust_corner_store").some((p) => p.id === created.id));
  assert.ok(!store.candidateProfilesForCustomer("cust_dan_murphys").some((p) => p.id === created.id));

  store.deleteProfile(created.id);
  assert.ok(!store.candidateProfilesForCustomer("cust_corner_store").some((p) => p.id === created.id));
});
