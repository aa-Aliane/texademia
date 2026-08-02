import { queryOptions } from "@tanstack/react-query";
import { ApiError, api } from "#/shared/api/client";
import type { User } from "../types/auth";

interface UserDto {
  id: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  is_verified: boolean;
  is_otp_enabled?: boolean;
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
    isOtpEnabled: data.is_otp_enabled ?? false,
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


export type LoginResult = { mfaRequired: false } | { mfaRequired: true; mfaToken: string };

export async function login(email: string, password: string): Promise<LoginResult> {
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

  // With MFA enabled the backend sets no cookies and returns a pre-MFA token.
  const data = (await res.json()) as { mfa_required?: boolean; mfa_token?: string };
  if (data.mfa_required && data.mfa_token) {
    return { mfaRequired: true, mfaToken: data.mfa_token };
  }
  return { mfaRequired: false };
}

export async function logout(): Promise<void> {
  await api.post("/api/auth/jwt/logout");
}

export async function register(email: string, password: string): Promise<void> {
  await api.post("/api/auth/register", { email, password });
}


export async function requestVerifyToken(email: string): Promise<void> {
  await api.post("/api/auth/request-verify-token", { email });
}

export async function verifyEmail(token: string): Promise<void> {
  await api.post("/api/auth/verify", { token });
}


export async function verifyMfaCode(mfaToken: string, code: string): Promise<void> {
  try {
    await api.post("/api/auth/mfa/verify", { mfa_token: mfaToken, code });
  } catch (err) {
    if (err instanceof ApiError && err.message === "MFA_INVALID_CODE") {
      throw new Error("Invalid authentication code");
    }
    if (err instanceof ApiError && err.message === "MFA_TOKEN_INVALID") {
      throw new Error("Sign-in session expired — please sign in again");
    }
    throw err;
  }
}

interface MfaSetupDto {
  otpauth_uri: string;
  qr_code_base64: string;
  secret: string;
}

export interface MfaSetup {
  otpauthUri: string;
  qrCodeBase64: string;
  secret: string;
}

export async function mfaSetup(): Promise<MfaSetup> {
  const data = await api.post<MfaSetupDto>("/api/auth/mfa/setup");
  return {
    otpauthUri: data.otpauth_uri,
    qrCodeBase64: data.qr_code_base64,
    secret: data.secret,
  };
}

export async function mfaEnable(code: string): Promise<void> {
  await api.post("/api/auth/mfa/enable", { code });
}

export async function mfaDisable(code: string): Promise<void> {
  await api.post("/api/auth/mfa/disable", { code });
}
