import { createSlice } from "@reduxjs/toolkit";
const slice = createSlice({
    name: "customers",
    initialState: { items: [], groups: [], status: "idle", error: null },
    reducers: {},
});
export const customersReducer = slice.reducer;
