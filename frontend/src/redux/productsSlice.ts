import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { productsApi } from "@/api/endpoints";
import type { ProductFacets, ProductListQuery, ProductListResponse, Product } from "@/types/api";
import { toThunkError, type ThunkErrorPayload } from "./thunkError";

interface ProductsState {
  items: Product[];
  total: number;
  facets: ProductFacets;
  status: "idle" | "loading" | "ready" | "error";
  error: ThunkErrorPayload | null;
  query: ProductListQuery;
}

const initialState: ProductsState = {
  items: [],
  total: 0,
  facets: { brands: [], subCategories: [], segments: [] },
  status: "idle",
  error: null,
  query: {},
};

interface FetchResult { res: ProductListResponse; query: ProductListQuery }

export const fetchProducts = createAsyncThunk<
  FetchResult,
  ProductListQuery,
  { rejectValue: ThunkErrorPayload }
>("products/fetch", async (query, { rejectWithValue }) => {
  try {
    const res = await productsApi.list(query);
    return { res, query };
  } catch (err) {
    return rejectWithValue(toThunkError(err));
  }
});

const slice = createSlice({
  name: "products",
  initialState,
  reducers: {
    setQuery: (state, { payload }: { payload: ProductListQuery }) => {
      state.query = payload;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchProducts.pending, (state) => {
      state.status = "loading";
      state.error = null;
    });
    b.addCase(fetchProducts.fulfilled, (state, { payload }) => {
      state.items = payload.res.items;
      state.total = payload.res.total;
      state.facets = payload.res.facets;
      state.query = payload.query;
      state.status = "ready";
    });
    b.addCase(fetchProducts.rejected, (state, { payload, error }) => {
      state.status = "error";
      state.error = payload ?? { message: error.message ?? "Failed to load products", code: "UNKNOWN", status: 0 };
    });
  },
});

export const { setQuery } = slice.actions;
export const productsReducer = slice.reducer;
