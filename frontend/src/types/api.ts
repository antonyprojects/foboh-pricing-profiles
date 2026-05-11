/**
 * Wire types mirrored from the backend's OpenAPI spec.
 *
 * Kept hand-written here (rather than codegen'd) so the cost of
 * onboarding is "open one file" and so the types stay aligned with the
 * intent in the UI rather than the literal shape of every response.
 * If the API ever grows beyond a hand-maintained file we'd swap to
 * openapi-typescript and treat the spec as source of truth.
 */

export interface Product {
  sku: string;
  title: string;
  brand: string;
  subCategory: string;
  segment: string;
  basePrice: number;
  active: boolean;
}

export interface ProductFacets {
  brands: string[];
  subCategories: string[];
  segments: string[];
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  facets: ProductFacets;
}

export interface ProductListQuery {
  q?: string;
  brand?: string;
  subCategory?: string;
  segment?: string;
  limit?: number;
  offset?: number;
}

export interface Group {
  id: string;
  name: string;
}

export interface Customer {
  id: string;
  name: string;
  groups: string[];
}

export interface CustomersResponse {
  items: Customer[];
  groups: Group[];
}

export type CustomerScope =
  | { kind: "customer"; customerId: string }
  | { kind: "customer_group"; groupId: string }
  | { kind: "all_customers" };

export type ProductScope =
  | { kind: "sku"; sku: string; skus?: string[] }
  | { kind: "brand"; brand: string; skus?: string[] }
  | { kind: "sub_category"; subCategory: string; skus?: string[] }
  | { kind: "segment"; segment: string; skus?: string[] }
  | { kind: "all_products"; skus?: string[] };

export type AdjustmentKind = "fixed" | "dynamic" | "absolute";
export type AdjustmentDirection = "increase" | "decrease";

export interface Adjustment {
  kind: AdjustmentKind;
  direction?: AdjustmentDirection;
  value: number;
}

export interface PricingProfile {
  id: string;
  name: string;
  description?: string | null;
  customerScope: CustomerScope;
  productScope: ProductScope;
  adjustment: Adjustment;
  priority: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfileRequest {
  name: string;
  description?: string | null;
  customerScope: CustomerScope;
  productScope: ProductScope;
  adjustment: Adjustment;
  priority?: number;
  active?: boolean;
}

export interface PreviewLine {
  sku: string;
  title: string;
  basePrice: number;
  newPrice: number;
  delta: number;
  deltaPct: number;
}

export interface PreviewResponse {
  items: PreviewLine[];
  summary: {
    count: number;
    avgDelta: number;
    avgDeltaPct: number;
  };
}

export interface ResolveResponse {
  customerId: string;
  sku: string;
  basePrice: number;
  price: number;
  sourceProfileId: string | null;
  sourceProfileName: string | null;
  reason: string;
  considered: Array<{
    profileId: string;
    profileName: string;
    specificity: { customer: number; product: number; priority: number };
    computedPrice: number;
  }>;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
