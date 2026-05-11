import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { customersApi } from "@/api/endpoints";
import type { Customer, Group } from "@/types/api";

interface CustomersState {
  items: Customer[];
  groups: Group[];
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
}

const initialState: CustomersState = {
  items: [],
  groups: [],
  status: "idle",
  error: null,
};

export const fetchCustomers = createAsyncThunk("customers/fetch", () => customersApi.list());

const slice = createSlice({
  name: "customers",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchCustomers.pending, (state) => {
      state.status = "loading";
      state.error = null;
    });
    b.addCase(fetchCustomers.fulfilled, (state, { payload }) => {
      state.items = payload.items;
      state.groups = payload.groups;
      state.status = "ready";
    });
    b.addCase(fetchCustomers.rejected, (state, { error }) => {
      state.status = "error";
      state.error = error.message ?? "Failed to load customers";
    });
  },
});

export const customersReducer = slice.reducer;
