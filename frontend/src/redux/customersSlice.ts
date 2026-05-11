import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { customersApi } from "@/api/endpoints";
import type { Customer, CustomersResponse, Group } from "@/types/api";
import { toThunkError, type ThunkErrorPayload } from "./thunkError";

interface CustomersState {
  items: Customer[];
  groups: Group[];
  status: "idle" | "loading" | "ready" | "error";
  error: ThunkErrorPayload | null;
}

const initialState: CustomersState = {
  items: [],
  groups: [],
  status: "idle",
  error: null,
};

export const fetchCustomers = createAsyncThunk<
  CustomersResponse,
  void,
  { rejectValue: ThunkErrorPayload }
>("customers/fetch", async (_, { rejectWithValue }) => {
  try {
    return await customersApi.list();
  } catch (err) {
    return rejectWithValue(toThunkError(err));
  }
});

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
    b.addCase(fetchCustomers.rejected, (state, { payload, error }) => {
      state.status = "error";
      state.error = payload ?? { message: error.message ?? "Failed to load customers", code: "UNKNOWN", status: 0 };
    });
  },
});

export const customersReducer = slice.reducer;
