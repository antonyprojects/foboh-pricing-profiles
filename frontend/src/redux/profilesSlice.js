import { createSlice } from "@reduxjs/toolkit";
const slice = createSlice({
    name: "profiles",
    initialState: { items: [], status: "idle", error: null },
    reducers: {},
});
export const profilesReducer = slice.reducer;
