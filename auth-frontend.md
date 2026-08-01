# Tree View:
```
frontend/src
├── features
│   └── auth
│       ├── api
│       │   └── auth.ts
│       ├── components
│       │   ├── loginForm.tsx
│       │   └── registerForm.tsx
│       ├── guards
│       │   └── requireAuth.ts
│       ├── hooks
│       │   └── useAuth.ts
│       ├── index.ts
│       ├── schemas
│       │   └── auth.ts
│       └── types
│           └── auth.ts
├── router.tsx
├── routes
│   ├── login.tsx
│   └── register.tsx
└── shared
    └── api
        └── client.ts

```

# Content:

## features/auth/api/auth.ts

```ts
import { queryOptions } from "@tanstack/react-query";
import { api } from "#/shared/api/client";
import type { User } from "../types/auth";

interface UserDto {
  id: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  is_verified: boolean;
  first_name?: string | null;
  last_name?: string | null;
}

function mapUser(data: UserDto): User {
  return {
    id: data.id,
    email: data.email,
    isActive: data.is_active,
    isSuperuser: data.is_superuser,
    isVerified: data.is_verified,
    firstName: data.first_name ?? null,
    lastName: data.last_name ?? null,
  };
}

export async function updateCurrentUser(updates: { firstName?: string; lastName?: string }): Promise<User> {
  const data = await api.patch<UserDto>("/api/auth/users/me", {
    first_name: updates.firstName,
    last_name: updates.lastName,
  });
  return mapUser(data);
}

export async function getCurrentUser(cookieHeader?: string | null): Promise<User> {
  const data = await api.get<UserDto>("/api/auth/users/me", { cookieHeader });
  return mapUser(data);
}

export const currentUserQueryOptions = (cookieHeader?: string | null) =>
  queryOptions({
    queryKey: ["current-user"],
    queryFn: () => getCurrentUser(cookieHeader),
    retry: false,
  });

// fastapi-users' /jwt/login is OAuth2PasswordRequestForm: it needs
// application/x-www-form-urlencoded with `username`/`password`, not JSON —
// so it can't go through the shared `api` client, which always sends JSON.
export async function login(email: string, password: string): Promise<void> {
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);

  const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
  const res = await fetch(`${baseUrl}/api/auth/jwt/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    let detail = "Login failed";
    try {
      const data = await res.json();
      detail = data?.detail ?? detail;
    } catch {
      // ignore non-JSON error body
    }
    throw new Error(detail === "LOGIN_BAD_CREDENTIALS" ? "Invalid email or password" : detail);
  }
}

export async function logout(): Promise<void> {
  await api.post("/api/auth/jwt/logout");
}

export async function register(email: string, password: string): Promise<void> {
  await api.post("/api/auth/register", { email, password });
}

```


## features/auth/components/loginForm.tsx

```tsx
import { TextInput, PasswordInput, Button, Stack, Alert, Title, Text, Anchor } from "@mantine/core";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin } from "../hooks/useAuth";
import { loginSchema, type LoginInput } from "../schemas/auth";

export function LoginForm() {
  const navigate = useNavigate();
  const { mutate, isPending, error } = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (values: LoginInput) => {
    mutate(values, { onSuccess: () => navigate({ to: "/redaction" }) });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack maw={360} mx="auto" mt={80}>
        <Title order={2}>Sign in</Title>
        {error && <Alert color="red">{(error as Error).message}</Alert>}
        <TextInput label="Email" type="email" error={errors.email?.message} {...register("email")} />
        <PasswordInput label="Password" error={errors.password?.message} {...register("password")} />
        <Button type="submit" loading={isPending}>Sign in</Button>
        <Text size="sm">No account? <Anchor component={Link} to="/register">Register</Anchor></Text>
      </Stack>
    </form>
  );
}

```


## features/auth/components/registerForm.tsx

```tsx
import { TextInput, PasswordInput, Button, Stack, Alert, Title, Text, Anchor } from "@mantine/core";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRegister, useLogin } from "../hooks/useAuth";
import { registerSchema, type RegisterInput } from "../schemas/auth";

export function RegisterForm() {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const loginMutation = useLogin();
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = (values: RegisterInput) => {
    registerMutation.mutate(values, {
      // /register doesn't set the auth cookie — log in right after
      onSuccess: () =>
        loginMutation.mutate(values, { onSuccess: () => navigate({ to: "/redaction" }) }),
    });
  };

  const error = registerMutation.error ?? loginMutation.error;
  const isPending = registerMutation.isPending || loginMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack maw={360} mx="auto" mt={80}>
        <Title order={2}>Create account</Title>
        {error && <Alert color="red">{(error as Error).message}</Alert>}
        <TextInput label="Email" type="email" error={errors.email?.message} {...registerField("email")} />
        <PasswordInput label="Password" error={errors.password?.message} {...registerField("password")} />
        <Button type="submit" loading={isPending}>Create account</Button>
        <Text size="sm">Already have an account? <Anchor component={Link} to="/login">Sign in</Anchor></Text>
      </Stack>
    </form>
  );
}

```


## features/auth/guards/requireAuth.ts

```ts
import { redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { ApiError } from "#/shared/api/client";
import { getCookieHeader } from "#/shared/api/serverCookie";
import { currentUserQueryOptions } from "../api/auth";

export async function requireAuth(queryClient: QueryClient) {
  try {
    return await queryClient.ensureQueryData(currentUserQueryOptions(getCookieHeader()));
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      throw redirect({ to: "/login" });
    }
    throw err;
  }
}

```


## features/auth/hooks/useAuth.ts

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { currentUserQueryOptions, login, logout, register, updateCurrentUser } from "../api/auth";

export function useCurrentUser() {
  return useQuery(currentUserQueryOptions());
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCurrentUser,
    onSuccess: (user) => queryClient.setQueryData(["current-user"], user),
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => login(email, password),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      await router.invalidate();
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => register(email, password),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      queryClient.clear(); // wipe cached documents/profile etc. that belonged to this user
      await router.invalidate();
      router.navigate({ to: "/login" });
    },
  });
}

```


## features/auth/index.ts

```ts
export { LoginForm } from "./components/loginForm";
export { RegisterForm } from "./components/registerForm";
export { useCurrentUser, useLogin, useRegister, useLogout } from "./hooks/useAuth";
export { currentUserQueryOptions, getCurrentUser } from "./api/auth";
export { requireAuth } from "./guards/requireAuth";
export type { User } from "./types/auth";
export { UserMenu } from "./components/userMenu";
export { ProfileForm } from "./components/profileForm";
export { useUpdateProfile } from "./hooks/useAuth";

```


## features/auth/schemas/auth.ts

```ts
import { z } from "zod";

// login schema
export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// register schema
export const registerSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

// profile schema
export const profileSchema = z.object({
  firstName: z.string().max(100).optional().or(z.literal("")),
  lastName: z.string().max(100).optional().or(z.literal("")),
});
export type ProfileInput = z.infer<typeof profileSchema>;

```


## features/auth/types/auth.ts

```ts
export interface User {
  id: string;
  email: string;
  isActive: boolean;
  isSuperuser: boolean;
  isVerified: boolean;
  firstName?: string | null;
  lastName?: string | null;
}

```


## router.tsx

```tsx
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

import type { ReactNode } from 'react'
import { QueryClient } from '@tanstack/react-query'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import TanstackQueryProvider, {
  getContext,
} from './integrations/tanstack-query/root-provider'

export function getRouter() {
  const context = getContext()

  const router = createTanStackRouter({
    routeTree,
    context,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}

```


## routes/login.tsx

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "#/features/auth";

export const Route = createFileRoute("/login")({ component: LoginForm });

```


## routes/register.tsx

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { RegisterForm } from "#/features/auth";

export const Route = createFileRoute("/register")({ component: RegisterForm });

```


## shared/api/client.ts

```ts
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
      await refreshAccessToken(cookieHeader);
      res = await doFetch();
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

```

