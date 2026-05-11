import type { ApiErrorBody } from "@/types/api";

/**
 * Thin fetch wrapper. Goals:
 *  - One place where the base URL is decided (and where it could
 *    later grow auth headers, retry policy, telemetry, etc).
 *  - Normalize every failure mode into a single typed exception
 *    (`ApiError`) so callers do `catch (e instanceof ApiError)`,
 *    not `e.response.data.error.code`.
 *  - Bound every request with a timeout — a hung backend should not
 *    hang the UI forever.
 *  - Treat non-JSON responses (proxy HTML 502, blank gateway pages)
 *    as ApiError("INVALID_JSON_RESPONSE"), not a confusing
 *    SyntaxError reaching the slice.
 *  - Treat network failures (DNS, CORS, abort) as
 *    ApiError("NETWORK_ERROR") so callers get the same shape.
 */

const DEFAULT_TIMEOUT_MS = 15_000;

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "INVALID_SCOPE"
  | "INVALID_INPUT"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "INVALID_JSON_RESPONSE"
  | "UNKNOWN"
  | string;

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;
  details: unknown;
  /** Server-issued correlation id for 500s, when available. */
  errorId?: string;

  constructor(args: { status: number; code: ApiErrorCode; message: string; details?: unknown; errorId?: string }) {
    super(args.message);
    this.name = "ApiError";
    this.status = args.status;
    this.code = args.code;
    this.details = args.details;
    this.errorId = args.errorId;
  }

  /**
   * Compact human-readable string used by UI to render. Includes the
   * server's correlation id (when present) so users can quote it.
   */
  toDisplay(): string {
    if (this.errorId) return `${this.message} [#${this.errorId}]`;
    return this.message;
  }
}

const BASE = import.meta.env.VITE_API_URL || "";

const buildUrl = (
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>,
) => {
  if (typeof path !== "string" || !path.startsWith("/")) {
    // Programmer error, not a request error — surface it early instead
    // of letting URL parsing silently produce something weird.
    throw new TypeError(`api: path must start with "/", got ${JSON.stringify(path)}`);
  }
  const url = new URL(path, BASE || window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  // When VITE_API_URL is empty (the dev-server-proxied case) we want
  // a same-origin relative URL so the Vite proxy picks it up.
  return BASE ? url.toString() : `${url.pathname}${url.search}`;
};

const parseJsonOrThrow = (text: string, status: number): unknown => {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    // Most common cause: a gateway / proxy returned an HTML error page.
    // We deliberately don't include the body in the message because it
    // can be huge — we put a short snippet in details.
    throw new ApiError({
      status,
      code: "INVALID_JSON_RESPONSE",
      message: `Server returned a non-JSON response (HTTP ${status}).`,
      details: { snippet: text.slice(0, 200) },
    });
  }
};

const handle = async <T>(res: Response): Promise<T> => {
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = parseJsonOrThrow(text, res.status);

  if (!res.ok) {
    const body = data as ApiErrorBody | undefined;
    throw new ApiError({
      status: res.status,
      code: body?.error?.code ?? "UNKNOWN",
      message: body?.error?.message ?? `HTTP ${res.status}`,
      details: body?.error?.details,
      // The backend's errorHandler attaches errorId for unhandled 500s.
      errorId: body?.error?.errorId,
    });
  }
  return data as T;
};

interface RequestInit {
  method: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Parameters<typeof buildUrl>[1];
  timeoutMs?: number;
}

const request = async <T>(path: string, init: RequestInit): Promise<T> => {
  const controller = new AbortController();
  const timeoutMs = init.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  const hasBody = init.body !== undefined;

  try {
    const res = await fetch(buildUrl(path, init.query), {
      method: init.method,
      headers: hasBody ? { "content-type": "application/json" } : undefined,
      body: hasBody ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
    return await handle<T>(res);
  } catch (err) {
    // Re-throw our own ApiError untouched; everything else (TypeError
    // from `fetch`, AbortError from the timeout) becomes a typed
    // ApiError so the UI never sees a raw browser exception.
    if (err instanceof ApiError) throw err;

    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError({
        status: 0,
        code: "TIMEOUT",
        message: `Request timed out after ${timeoutMs}ms: ${init.method} ${path}`,
      });
    }

    const message = err instanceof Error ? err.message : String(err);
    throw new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: `Network error: ${message}`,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export const api = {
  get: <T>(path: string, query?: RequestInit["query"]) =>
    request<T>(path, { method: "GET", query }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body }),
  delete: <T = void>(path: string) =>
    request<T>(path, { method: "DELETE" }),
};
