import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { profilesApi } from "@/api/endpoints";
import type { CreateProfileRequest, PricingProfile } from "@/types/api";
import { toThunkError, type ThunkErrorPayload } from "./thunkError";

type Status = "idle" | "loading" | "ready" | "error";
type WriteStatus = "idle" | "pending" | "ok" | "error";

interface ProfilesState {
  items: PricingProfile[];
  status: Status;
  error: ThunkErrorPayload | null;
  saveStatus: WriteStatus;
  saveError: ThunkErrorPayload | null;
  deleteStatus: WriteStatus;
  deleteError: ThunkErrorPayload | null;
  /** Set when delete fails so the UI can highlight the row. */
  deleteErrorId: string | null;
}

const initialState: ProfilesState = {
  items: [],
  status: "idle",
  error: null,
  saveStatus: "idle",
  saveError: null,
  deleteStatus: "idle",
  deleteError: null,
  deleteErrorId: null,
};

export const fetchProfiles = createAsyncThunk<
  PricingProfile[],
  void,
  { rejectValue: ThunkErrorPayload }
>("profiles/fetch", async (_, { rejectWithValue }) => {
  try {
    return await profilesApi.list();
  } catch (err) {
    return rejectWithValue(toThunkError(err));
  }
});

export const createProfile = createAsyncThunk<
  PricingProfile,
  CreateProfileRequest,
  { rejectValue: ThunkErrorPayload }
>("profiles/create", async (body, { rejectWithValue }) => {
  try {
    return await profilesApi.create(body);
  } catch (err) {
    return rejectWithValue(toThunkError(err));
  }
});

export const deleteProfile = createAsyncThunk<
  string,
  string,
  { rejectValue: ThunkErrorPayload }
>("profiles/delete", async (id, { rejectWithValue }) => {
  try {
    await profilesApi.delete(id);
    return id;
  } catch (err) {
    return rejectWithValue({ ...toThunkError(err), details: { id } });
  }
});

const slice = createSlice({
  name: "profiles",
  initialState,
  reducers: {
    resetSaveStatus: (state) => {
      state.saveStatus = "idle";
      state.saveError = null;
    },
    resetDeleteStatus: (state) => {
      state.deleteStatus = "idle";
      state.deleteError = null;
      state.deleteErrorId = null;
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
    b.addCase(fetchProfiles.rejected, (state, { payload, error }) => {
      state.status = "error";
      state.error = payload ?? { message: error.message ?? "Failed to load profiles", code: "UNKNOWN", status: 0 };
    });

    b.addCase(createProfile.pending, (state) => {
      state.saveStatus = "pending";
      state.saveError = null;
    });
    b.addCase(createProfile.fulfilled, (state, { payload }) => {
      state.items = [payload, ...state.items];
      state.saveStatus = "ok";
    });
    b.addCase(createProfile.rejected, (state, { payload, error }) => {
      state.saveStatus = "error";
      state.saveError = payload ?? { message: error.message ?? "Failed to save profile", code: "UNKNOWN", status: 0 };
    });

    b.addCase(deleteProfile.pending, (state, { meta }) => {
      state.deleteStatus = "pending";
      state.deleteError = null;
      state.deleteErrorId = meta.arg;
    });
    b.addCase(deleteProfile.fulfilled, (state, { payload: id }) => {
      state.items = state.items.filter((p) => p.id !== id);
      state.deleteStatus = "ok";
      state.deleteErrorId = null;
    });
    b.addCase(deleteProfile.rejected, (state, { payload, error, meta }) => {
      state.deleteStatus = "error";
      state.deleteError = payload ?? { message: error.message ?? "Failed to delete profile", code: "UNKNOWN", status: 0 };
      state.deleteErrorId = meta.arg;
    });
  },
});

export const { resetSaveStatus, resetDeleteStatus } = slice.actions;
export const profilesReducer = slice.reducer;
