/**
 * Seed catalogue lifted from the FOBOH brief, expanded slightly so the
 * search/filter UI has more than five rows to show. SKUs are kept as
 * written in the brief; everything else is internally consistent.
 *
 * Note on taxonomy: per the brief, `subCategory` is the broader bucket
 * (e.g. "Wine") and `segment` narrows it (e.g. "Sparkling"). That is
 * the opposite of common industry usage; we follow the brief.
 */

export const seedProducts = [
  // --- From the brief ---
  {
    sku: "HGVPIN216",
    title: "High Garden Pinot Noir 2021",
    brand: "High Garden",
    subCategory: "Wine",
    segment: "Red",
    basePrice: 279.06,
    active: true,
  },
  {
    sku: "KOYBRUNV6",
    title: "Koyama Methode Brut Nature NV",
    brand: "Koyama Wines",
    subCategory: "Wine",
    segment: "Sparkling",
    basePrice: 120.0,
    active: true,
  },
  {
    sku: "KOYNR1837",
    title: "Koyama Riesling 2018",
    brand: "Koyama Wines",
    subCategory: "Wine",
    segment: "Port/Dessert",
    basePrice: 215.04,
    active: true,
  },
  {
    sku: "KOYRIE19",
    title: "Koyama Tussock Riesling 2019",
    brand: "Koyama Wines",
    subCategory: "Wine",
    segment: "White",
    basePrice: 215.04,
    active: true,
  },
  {
    sku: "LACBNATNV6",
    title: "Lacourte-Godbillon Brut Cru NV",
    brand: "Lacourte-Godbillon",
    subCategory: "Wine",
    segment: "Sparkling",
    basePrice: 409.32,
    active: true,
  },

  // --- Padding so the UI has more to chew on ---
  {
    sku: "PENNCHA20",
    title: "Penfolds Chardonnay 2020",
    brand: "Penfolds",
    subCategory: "Wine",
    segment: "White",
    basePrice: 38.5,
    active: true,
  },
  {
    sku: "PENNSHR19",
    title: "Penfolds Bin 28 Shiraz 2019",
    brand: "Penfolds",
    subCategory: "Wine",
    segment: "Red",
    basePrice: 52.0,
    active: true,
  },
  {
    sku: "MOET-IMP-750",
    title: "Moët & Chandon Imperial NV 750ml",
    brand: "Moët & Chandon",
    subCategory: "Wine",
    segment: "Sparkling",
    basePrice: 85.0,
    active: true,
  },
  {
    sku: "FBRPA-LCAN",
    title: "Fellr Pale Ale 4-pack",
    brand: "Fellr",
    subCategory: "Beer",
    segment: "Pale Ale",
    basePrice: 24.0,
    active: true,
  },
  {
    sku: "LITLCRTR-LAGR",
    title: "Little Creatures Lager 6-pack",
    brand: "Little Creatures",
    subCategory: "Beer",
    segment: "Lager",
    basePrice: 28.0,
    active: true,
  },
  {
    sku: "ARCH-GIN-700",
    title: "Archie Rose Signature Dry Gin 700ml",
    brand: "Archie Rose",
    subCategory: "Spirit",
    segment: "Gin",
    basePrice: 89.0,
    active: true,
  },
  {
    sku: "SIPSMITH-LON",
    title: "Sipsmith London Dry Gin 700ml",
    brand: "Sipsmith",
    subCategory: "Spirit",
    segment: "Gin",
    basePrice: 75.0,
    active: true,
  },
];

export const seedGroups = [
  { id: "grp_independent_retailers", name: "Independent Retailers" },
  { id: "grp_vip", name: "VIP" },
  { id: "grp_chains", name: "National Chains" },
];

export const seedCustomers = [
  {
    id: "cust_bondi_cellars",
    name: "Bondi Cellars",
    groups: ["grp_independent_retailers", "grp_vip"],
  },
  {
    id: "cust_cellarbros",
    name: "Cellarbros",
    groups: ["grp_independent_retailers"],
  },
  {
    id: "cust_lush_wines",
    name: "Lush Wines",
    groups: ["grp_vip"],
  },
  {
    id: "cust_corner_store",
    name: "Corner Store Liquor",
    groups: [],
  },
  {
    id: "cust_dan_murphys",
    name: "Dan Murphy's",
    groups: ["grp_chains"],
  },
];

/**
 * The three profiles from the brief's "overlapping profiles" scenario,
 * pre-seeded so the resolver demo just works.
 */
export const seedProfiles = [
  {
    id: "prof_seed_A_wine_independent",
    name: "10% off all Wine — Independent Retailers",
    description: "Profile A from the FOBOH brief scenario.",
    customerScope: { kind: "customer_group", groupId: "grp_independent_retailers" },
    productScope: { kind: "sub_category", subCategory: "Wine" },
    adjustment: { kind: "dynamic", direction: "decrease", value: 10 },
    priority: 100,
    active: true,
  },
  {
    id: "prof_seed_B_sparkling_vip",
    name: "$15 off all Sparkling — VIP",
    description: "Profile B from the FOBOH brief scenario.",
    customerScope: { kind: "customer_group", groupId: "grp_vip" },
    productScope: { kind: "segment", segment: "Sparkling" },
    adjustment: { kind: "fixed", direction: "decrease", value: 15 },
    priority: 100,
    active: true,
  },
  {
    id: "prof_seed_C_bondi_koyama",
    name: "Bondi Cellars — Koyama Methode Brut Nature NV at $95",
    description: "Profile C from the FOBOH brief scenario.",
    customerScope: { kind: "customer", customerId: "cust_bondi_cellars" },
    productScope: { kind: "sku", sku: "KOYBRUNV6" },
    adjustment: { kind: "absolute", value: 95 },
    priority: 100,
    active: true,
  },
];
