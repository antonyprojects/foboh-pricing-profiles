import { api } from "./client";
import type {
  CreateProfileRequest,
  CustomersResponse,
  PreviewResponse,
  PricingProfile,
  Product,
  ProductListQuery,
  ProductListResponse,
  ResolveResponse,
} from "@/types/api";

export const productsApi = {
  list: (query: ProductListQuery = {}) =>
    api.get<ProductListResponse>("/api/products", query as Record<string, string | number | undefined>),
  get: (sku: string) => api.get<Product>(`/api/products/${encodeURIComponent(sku)}`),
};

export const customersApi = {
  list: () => api.get<CustomersResponse>("/api/customers"),
};

export const profilesApi = {
  list: () => api.get<PricingProfile[]>("/api/profiles"),
  get: (id: string) => api.get<PricingProfile>(`/api/profiles/${encodeURIComponent(id)}`),
  create: (body: CreateProfileRequest) => api.post<PricingProfile>("/api/profiles", body),
  update: (id: string, body: CreateProfileRequest) =>
    api.put<PricingProfile>(`/api/profiles/${encodeURIComponent(id)}`, body),
  delete: (id: string) => api.delete(`/api/profiles/${encodeURIComponent(id)}`),
  preview: (body: CreateProfileRequest) => api.post<PreviewResponse>("/api/profiles/preview", body),
};

export const pricingApi = {
  resolve: (customerId: string, sku: string) =>
    api.get<ResolveResponse>("/api/pricing/resolve", { customerId, sku }),
};
