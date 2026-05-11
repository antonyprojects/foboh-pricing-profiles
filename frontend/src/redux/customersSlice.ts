import { createSlice } from "@reduxjs/toolkit";

const slice = createSlice({
  name: "customers",
  initialState: { items: [], groups: [], status: "idle" as "idle" | "loading" | "error", error: null as string | null },
  reducers: {},
});

export const customersReducer = slice.reducer;
