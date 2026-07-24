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
