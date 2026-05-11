import { createSlice } from "@reduxjs/toolkit";
const slice = createSlice({
    name: "products",
    initialState: { items: [], total: 0, facets: { brands: [], subCategories: [], segments: [] }, status: "idle", error: null },
    reducers: {},
});
export const productsReducer = slice.reducer;
