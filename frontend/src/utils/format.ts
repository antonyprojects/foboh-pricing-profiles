import type { Adjustment, CustomerScope, Customer, Group, ProductScope } from "@/types/api";

export const fmtMoney = (n: number) =>
  n.toLocaleString("en-AU", { style: "currency", currency: "AUD" });

export const describeAdjustment = (a: Adjustment): string => {
  if (a.kind === "absolute") return `flat ${fmtMoney(a.value)}`;
  const verb = a.direction === "decrease" ? "off" : "above";
  if (a.kind === "fixed") return `${fmtMoney(a.value)} ${verb} base`;
  return `${a.value}% ${verb} base`;
};

export const describeCustomerScope = (
  scope: CustomerScope,
  customers: Customer[],
  groups: Group[],
): string => {
  if (scope.kind === "all_customers") return "All customers";
  if (scope.kind === "customer_group") {
    const g = groups.find((x) => x.id === scope.groupId);
    return g ? `Group: ${g.name}` : `Group: ${scope.groupId}`;
  }
  const c = customers.find((x) => x.id === scope.customerId);
  return c ? `Customer: ${c.name}` : `Customer: ${scope.customerId}`;
};

export const describeProductScope = (scope: ProductScope): string => {
  const base = (() => {
    switch (scope.kind) {
      case "all_products": return "All products";
      case "sku": return `SKU: ${scope.sku}`;
      case "brand": return `Brand: ${scope.brand}`;
      case "sub_category": return `Sub-cat: ${scope.subCategory}`;
      case "segment": return `Segment: ${scope.segment}`;
    }
  })();
  if (scope.skus && scope.skus.length) {
    return `${base} · pinned to ${scope.skus.length} SKU${scope.skus.length === 1 ? "" : "s"}`;
  }
  return base;
};
