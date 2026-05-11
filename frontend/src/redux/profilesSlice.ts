import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { profilesApi } from "@/api/endpoints";
import type { CreateProfileRequest, PricingProfile } from "@/types/api";

interface ProfilesState {
  items: PricingProfile[];
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  saveStatus: "idle" | "saving" | "saved" | "error";
  saveError: string | null;
}

const initialState: ProfilesState = {
  items: [],
  status: "idle",
  error: null,
  saveStatus: "idle",
  saveError: null,
};

export const fetchProfiles = createAsyncThunk("profiles/fetch", () => profilesApi.list());

export const createProfile = createAsyncThunk(
  "profiles/create",
  (body: CreateProfileRequest) => profilesApi.create(body),
);

export const deleteProfile = createAsyncThunk(
  "profiles/delete",
  async (id: string) => {
    await profilesApi.delete(id);
    return id;
  },
);

const slice = createSlice({
  name: "profiles",
  initialState,
  reducers: {
    resetSaveStatus: (state) => {
      state.saveStatus = "idle";
      state.saveError = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchProfiles.pending, (state) => {
      state.status = "loading";
      state.error = null;
    });
    b.addCase(fetchProfiles.fulfilled, (state, { payload }) => {
      state.items = payload;
      state.status = "ready";
    });
    b.addCase(fetchProfiles.rejected, (state, { error }) => {
      state.status = "error";
      state.error = error.message ?? "Failed to load profiles";
    });

    b.addCase(createProfile.pending, (state) => {
      state.saveStatus = "saving";
      state.saveError = null;
    });
    b.addCase(createProfile.fulfilled, (state, { payload }) => {
      state.items = [payload, ...state.items];
      state.saveStatus = "saved";
    });
    b.addCase(createProfile.rejected, (state, { error }) => {
      state.saveStatus = "error";
      state.saveError = error.message ?? "Failed to save profile";
    });

    b.addCase(deleteProfile.fulfilled, (state, { payload: id }) => {
      state.items = state.items.filter((p) => p.id !== id);
    });
  },
});

export const { resetSaveStatus } = slice.actions;
export const profilesReducer = slice.reducer;
