import { createSlice } from "@reduxjs/toolkit";
import type { Adjustment, CustomerScope, ProductScope } from "@/types/api";

/**
 * Holds the in-flight profile being built. Keeping it in Redux (rather
 * than local component state) lets us:
 *   - persist the work-in-progress across route navigations
 *   - share selection state with the preview panel
 *   - implement "select all" by storing a Set-like array of SKUs
 */
interface BuilderState {
  name: string;
  description: string;
  customerScope: CustomerScope;
  productScope: ProductScope;
  adjustment: Adjustment;
  priority: number;
  active: boolean;
  // Optional explicit SKU pinning. When non-empty, the resolver treats
  // it as an intersect filter on top of `productScope.kind`.
  selectedSkus: string[];
}

const initialState: BuilderState = {
  name: "",
  description: "",
  customerScope: { kind: "all_customers" },
  productScope: { kind: "all_products" },
  adjustment: { kind: "dynamic", direction: "decrease", value: 10 },
  priority: 100,
  active: true,
  selectedSkus: [],
};

const slice = createSlice({
  name: "builder",
  initialState,
  reducers: {
    reset: () => initialState,
    setName: (s, { payload }: { payload: string }) => { s.name = payload; },
    setDescription: (s, { payload }: { payload: string }) => { s.description = payload; },
    setCustomerScope: (s, { payload }: { payload: CustomerScope }) => { s.customerScope = payload; },
    setProductScope: (s, { payload }: { payload: ProductScope }) => { s.productScope = payload; },
    setAdjustment: (s, { payload }: { payload: Adjustment }) => { s.adjustment = payload; },
    setPriority: (s, { payload }: { payload: number }) => { s.priority = payload; },
    setActive: (s, { payload }: { payload: boolean }) => { s.active = payload; },
    setSelectedSkus: (s, { payload }: { payload: string[] }) => { s.selectedSkus = payload; },
    toggleSku: (s, { payload }: { payload: string }) => {
      const set = new Set(s.selectedSkus);
      if (set.has(payload)) set.delete(payload);
      else set.add(payload);
      s.selectedSkus = Array.from(set);
    },
  },
});

export const {
  reset,
  setName,
  setDescription,
  setCustomerScope,
  setProductScope,
  setAdjustment,
  setPriority,
  setActive,
  setSelectedSkus,
  toggleSku,
} = slice.actions;

export const builderReducer = slice.reducer;
