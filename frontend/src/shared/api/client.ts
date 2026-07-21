export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

// SSR (inside the frontend container) must reach the backend via Docker's
// internal service name. Client-side (browser) must use localhost, since
// that's what's actually published to your host machine.
function resolveBaseUrl(): string {
  if (typeof window === "undefined") {
    return process.env.INTERNAL_API_URL ?? "http://backend:8000";
  }
  return import.meta.env.VITE_API_URL ?? "http://localhost:8000";
}

interface RequestOptions extends RequestInit {
  // Pass through the incoming request's Cookie header during SSR,
  // since server-side fetch doesn't have access to the browser's cookie jar.
  cookieHeader?: string | null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { cookieHeader, headers, ...rest } = options;
  const baseUrl = resolveBaseUrl();

  const res = await fetch(`${baseUrl}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // non-JSON error body, ignore
    }
    const message =
      (body as any)?.detail?.message ?? (body as any)?.detail ?? `Request failed: ${res.status}`;
    throw new ApiError(message, res.status, body);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};

// The PDF URL the backend returns is host-relative and only makes sense
// from the browser's perspective — use this whenever you render one.
export function toPublicUrl(path: string): string {
  const publicBase = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
  return `${publicBase}${path}`;
}
