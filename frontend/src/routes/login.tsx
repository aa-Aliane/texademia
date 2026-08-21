import { currentUserQueryOptions, LoginForm } from "#/features/auth";
import { getCookieHeader } from "#/shared/api/serverCookie";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  beforeLoad: async ({ context: { queryClient } }) => {
    try {
      await queryClient.ensureQueryData(currentUserQueryOptions(getCookieHeader()));
      throw redirect({ to: "/redaction" });
    }
     catch (error) {
      if (error instanceof Error && "isRedirect" in error) {
        throw error;
      }
    }
  },
  component: LoginForm,
});
