import { seedProducts, seedGroups, seedCustomers, seedProfiles } from "./seedData.js";

/**
 * In-memory store for products, customers, groups and pricing profiles.
 *
 * Why a class with indices instead of plain arrays?
 * - The resolver runs per (customer, product) pair. With N profiles a
 *   naive scan is O(N) per call; for a real catalogue that's wasteful.
 *   We maintain three indices keyed by customer scope so candidate
 *   profiles are pulled in O(matching) on lookup.
 * - Mutations stay simple because the indices are derivable: every
 *   write goes through `#index` / `#deindex` helpers that keep them
 *   consistent.
 *
 * Concurrency note: Node is single-threaded for our purposes here, so
 * there's no lock. If this ever became multi-process we'd swap the
 * Maps for a real store and let it handle isolation.
 */
class Store {
  /** @type {Map<string, import("../types.js").Product>} */
  #products = new Map();

  /** @type {Map<string, import("../types.js").Group>} */
  #groups = new Map();

  /** @type {Map<string, import("../types.js").Customer>} */
  #customers = new Map();

  /** @type {Map<string, import("../types.js").PricingProfile>} */
  #profiles = new Map();

  // ---- secondary indices on profiles, keyed by customer scope ----
  /** @type {Map<string, Set<string>>} customerId -> profileIds */
  #profilesByCustomer = new Map();

  /** @type {Map<string, Set<string>>} groupId -> profileIds */
  #profilesByGroup = new Map();

  /** @type {Set<string>} profileIds whose scope kind is all_customers */
  #profilesGlobal = new Set();

  // ============================================================
  // Products
  // ============================================================

  upsertProduct(p) {
    this.#products.set(p.sku, { ...p });
    return this.getProduct(p.sku);
  }

  getProduct(sku) {
    const p = this.#products.get(sku);
    return p ? { ...p } : undefined;
  }

  listProducts() {
    return Array.from(this.#products.values()).map((p) => ({ ...p }));
  }

  /** Facets are cheap on this dataset; computed on demand. */
  productFacets() {
    const brands = new Set();
    const subCategories = new Set();
    const segments = new Set();
    for (const p of this.#products.values()) {
      if (!p.active) continue;
      brands.add(p.brand);
      subCategories.add(p.subCategory);
      segments.add(p.segment);
    }
    const sorted = (s) => Array.from(s).sort((a, b) => a.localeCompare(b));
    return { brands: sorted(brands), subCategories: sorted(subCategories), segments: sorted(segments) };
  }

  // ============================================================
  // Groups & Customers
  // ============================================================

  upsertGroup(g) {
    this.#groups.set(g.id, { ...g });
    return { ...g };
  }

  listGroups() {
    return Array.from(this.#groups.values()).map((g) => ({ ...g }));
  }

  upsertCustomer(c) {
    this.#customers.set(c.id, { ...c, groups: [...c.groups] });
    return this.getCustomer(c.id);
  }

  getCustomer(id) {
    const c = this.#customers.get(id);
    return c ? { ...c, groups: [...c.groups] } : undefined;
  }

  listCustomers() {
    return Array.from(this.#customers.values()).map((c) => ({ ...c, groups: [...c.groups] }));
  }

  // ============================================================
  // Profiles
  // ============================================================

  listProfiles() {
    return Array.from(this.#profiles.values()).map((p) => structuredClone(p));
  }

  getProfile(id) {
    const p = this.#profiles.get(id);
    return p ? structuredClone(p) : undefined;
  }

  createProfile(profile) {
    this.#profiles.set(profile.id, structuredClone(profile));
    this.#index(profile);
    return this.getProfile(profile.id);
  }

  updateProfile(id, next) {
    const existing = this.#profiles.get(id);
    if (!existing) return undefined;
    this.#deindex(existing);
    const merged = { ...existing, ...next, id, updatedAt: new Date().toISOString() };
    this.#profiles.set(id, structuredClone(merged));
    this.#index(merged);
    return this.getProfile(id);
  }

  deleteProfile(id) {
    const existing = this.#profiles.get(id);
    if (!existing) return false;
    this.#deindex(existing);
    this.#profiles.delete(id);
    return true;
  }

  /**
   * Returns the candidate profile set for a customer, drawing only from
   * the relevant indices. Cheaper than scanning every profile.
   */
  candidateProfilesForCustomer(customerId) {
    const customer = this.#customers.get(customerId);
    if (!customer) return [];

    const ids = new Set();

    for (const gid of customer.groups) {
      const fromGroup = this.#profilesByGroup.get(gid);
      if (fromGroup) for (const pid of fromGroup) ids.add(pid);
    }

    const fromCustomer = this.#profilesByCustomer.get(customerId);
    if (fromCustomer) for (const pid of fromCustomer) ids.add(pid);

    for (const pid of this.#profilesGlobal) ids.add(pid);

    const out = [];
    for (const id of ids) {
      const p = this.#profiles.get(id);
      if (p && p.active) out.push(structuredClone(p));
    }
    return out;
  }

  // ---------------------------------------------------------------- index helpers

  #index(profile) {
    const kind = profile.customerScope.kind;
    if (kind === "customer") {
      this.#addTo(this.#profilesByCustomer, profile.customerScope.customerId, profile.id);
    } else if (kind === "customer_group") {
      this.#addTo(this.#profilesByGroup, profile.customerScope.groupId, profile.id);
    } else if (kind === "all_customers") {
      this.#profilesGlobal.add(profile.id);
    }
  }

  #deindex(profile) {
    const kind = profile.customerScope.kind;
    if (kind === "customer") {
      this.#removeFrom(this.#profilesByCustomer, profile.customerScope.customerId, profile.id);
    } else if (kind === "customer_group") {
      this.#removeFrom(this.#profilesByGroup, profile.customerScope.groupId, profile.id);
    } else if (kind === "all_customers") {
      this.#profilesGlobal.delete(profile.id);
    }
  }

  #addTo(map, key, value) {
    let set = map.get(key);
    if (!set) {
      set = new Set();
      map.set(key, set);
    }
    set.add(value);
  }

  #removeFrom(map, key, value) {
    const set = map.get(key);
    if (!set) return;
    set.delete(value);
    if (set.size === 0) map.delete(key);
  }

  // ============================================================
  // Bootstrap
  // ============================================================

  reset() {
    this.#products.clear();
    this.#groups.clear();
    this.#customers.clear();
    this.#profiles.clear();
    this.#profilesByCustomer.clear();
    this.#profilesByGroup.clear();
    this.#profilesGlobal.clear();
  }

  loadSeed() {
    this.reset();
    for (const p of seedProducts) this.upsertProduct(p);
    for (const g of seedGroups) this.upsertGroup(g);
    for (const c of seedCustomers) this.upsertCustomer(c);
    const now = new Date().toISOString();
    for (const p of seedProfiles) {
      this.createProfile({ ...p, createdAt: now, updatedAt: now });
    }
  }
}

export const store = new Store();
store.loadSeed();
