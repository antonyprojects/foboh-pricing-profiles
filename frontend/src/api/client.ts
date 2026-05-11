import type { ApiErrorBody } from "@/types/api";

/**
 * Thin fetch wrapper. Three goals:
 *  - One place where the base URL is decided (and where it could
 *    later grow auth headers, retry policy, telemetry, etc).
 *  - JSON in, JSON out, with errors normalized to a typed exception.
 *  - Query-string serialization that drops undefined keys so callers
 *    can pass a partial query object without manual cleanup.
 */

export class ApiError extends Error {
  status: number;
  code: string;
  details: unknown;

  constructor(status: number, body: ApiErrorBody | undefined, fallbackMessage: string) {
    super(body?.error?.message ?? fallbackMessage);
    this.status = status;
    this.code = body?.error?.code ?? "UNKNOWN";
    this.details = body?.error?.details;
  }
}

const BASE = import.meta.env.VITE_API_URL || "";

const buildUrl = (path: string, query?: Record<string, string | number | boolean | undefined | null>) => {
  const url = new URL(path, BASE || window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  // When VITE_API_URL is empty (the dev-server-proxied case) we want a
  // same-origin relative URL so the Vite proxy picks it up.
  return BASE ? url.toString() : `${url.pathname}${url.search}`;
};

const handle = async <T>(res: Response): Promise<T> => {
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : undefined;

  if (!res.ok) {
    throw new ApiError(res.status, data as ApiErrorBody | undefined, `HTTP ${res.status}`);
  }
  return data as T;
};

export const api = {
  get: <T>(path: string, query?: Parameters<typeof buildUrl>[1]) =>
    fetch(buildUrl(path, query), { method: "GET" }).then(handle<T>),

  post: <T>(path: string, body?: unknown) =>
    fetch(buildUrl(path), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then(handle<T>),

  put: <T>(path: string, body?: unknown) =>
    fetch(buildUrl(path), {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then(handle<T>),

  delete: <T = void>(path: string) =>
    fetch(buildUrl(path), { method: "DELETE" }).then(handle<T>),
};
