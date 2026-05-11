import { ApiError } from "@/api/client";

/**
 * Shape used as the `rejectWithValue` payload for every thunk in this
 * app. Carries the full ApiError data through to the slice so the UI
 * can:
 *   - render a clear message
 *   - render field-level details (Zod's flattened errors)
 *   - show the server's correlation id for support
 *
 * Why this exists: createAsyncThunk's default `rejected` action gives
 * us a `SerializedError` (`{ message, name, stack, code }`) which
 * strips everything custom on the thrown Error. Returning a structured
 * payload via `rejectWithValue` keeps the rich data intact.
 */
export interface ThunkErrorPayload {
  message: string;
  code: string;
  status: number;
  details?: unknown;
  errorId?: string;
}

export const toThunkError = (err: unknown): ThunkErrorPayload => {
  if (err instanceof ApiError) {
    return {
      message: err.toDisplay(),
      code: err.code,
      status: err.status,
      details: err.details,
      errorId: err.errorId,
    };
  }
  // We should never reach this — the api client wraps everything into
  // ApiError — but defensive code so a stray throw doesn't get lost.
  const message = err instanceof Error ? err.message : String(err);
  return { message, code: "UNKNOWN", status: 0 };
};

/**
 * Helper: render an error payload as a human string, including
 * field-level details from Zod's flattened error when present.
 */
export const renderThunkError = (e: ThunkErrorPayload | string | null | undefined): string | null => {
  if (!e) return null;
  if (typeof e === "string") return e;
  const lines: string[] = [e.message];
  const fields = (e.details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors;
  if (fields) {
    for (const [field, msgs] of Object.entries(fields)) {
      for (const m of msgs) lines.push(`  ${field}: ${m}`);
    }
  }
  return lines.join("\n");
};
