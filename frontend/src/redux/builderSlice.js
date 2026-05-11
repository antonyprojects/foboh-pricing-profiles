import { createSlice } from "@reduxjs/toolkit";
const slice = createSlice({
    name: "builder",
    initialState: { selectedSkus: [] },
    reducers: {},
});
export const builderReducer = slice.reducer;
