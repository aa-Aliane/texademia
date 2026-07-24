import { createFileRoute, redirect } from "@tanstack/react-router";
import { ApiError } from "#/shared/api/client";
import { currentUserQueryOptions } from "#/features/auth";
import { getCookieHeader } from "#/shared/api/serverCookie";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context: { queryClient } }) => {
    try {
      await queryClient.ensureQueryData(currentUserQueryOptions(getCookieHeader()));
      throw redirect({ to: "/redaction" });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        throw redirect({ to: "/login" });
      }
      throw err; // real errors (network, 500...) and the redirect() above both fall through here
    }
  },
});
