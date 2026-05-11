import { createSlice } from "@reduxjs/toolkit";

const slice = createSlice({
  name: "profiles",
  initialState: { items: [], status: "idle" as "idle" | "loading" | "error", error: null as string | null },
  reducers: {},
});

export const profilesReducer = slice.reducer;
