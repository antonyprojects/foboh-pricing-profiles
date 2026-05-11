import { createSlice } from "@reduxjs/toolkit";

const slice = createSlice({
  name: "builder",
  initialState: { selectedSkus: [] as string[] },
  reducers: {},
});

export const builderReducer = slice.reducer;
