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

let refreshPromise: Promise<string[]> | null = null;

async function refreshAccessToken(cookieHeader?: string | null): Promise<string[]> {
  if (refreshPromise) return refreshPromise;

  const baseUrl = resolveBaseUrl();
  refreshPromise = fetch(`${baseUrl}/api/auth/jwt/refresh`, {
    method: "POST",
    credentials: "include",
    headers: cookieHeader ? { Cookie: cookieHeader } : {},
  })
  .then((res) => {
      if (!res.ok) throw new ApiError("Refresh failed", res.status, null);
      return res.headers.getSetCookie();   // forward these to the browser
  })
  .finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

// Merge fresh Set-Cookie pairs into the SSR cookie header so the retry uses
// the NEW access token instead of the expired one that just 401'd.
function mergeCookies(
  original: string | null | undefined,
  setCookies: string[]
): string | undefined {
  if (setCookies.length === 0) return original ?? undefined;
  const jar = new Map<string, string>();
  for (const part of (original ?? "").split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0) jar.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
  }
  for (const sc of setCookies) {
    const pair = sc.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
  return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { cookieHeader, headers, ...rest } = options;
  const baseUrl = resolveBaseUrl();

  const doFetch = () =>
    fetch(`${baseUrl}${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        ...headers,
      },
    });

  let res = await doFetch();

  // On the client, if the access token expired, try to refresh it once and
  // retry the original request. We can't refresh during SSR because there is
  // no browser cookie jar there.
  if (
    res.status === 401 && path !== "/api/auth/jwt/refresh"
  ) {
    try {
      const setCookies = await refreshAccessToken(cookieHeader);
      const retryCookie = mergeCookies(cookieHeader, setCookies);
      res = await (async () =>
        fetch(`${baseUrl}${path}`, {
          ...rest,
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(retryCookie ? { Cookie: retryCookie } : {}),
            ...headers,
          },
        }))();
    } catch {
      // Refresh failed; keep the original 401 response so the caller can
      // redirect to login or surface the error.
    }
  }

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
