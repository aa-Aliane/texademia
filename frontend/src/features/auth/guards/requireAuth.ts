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
