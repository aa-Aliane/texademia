import { currentUserQueryOptions, RegisterForm } from "#/features/auth";
import { getCookieHeader } from "#/shared/api/serverCookie";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/register")({
  beforeLoad: async ({ context: { queryClient } }) => {
    try {
      await queryClient.ensureQueryData(currentUserQueryOptions(getCookieHeader()));
    } catch {
      return;
    }

    throw redirect({ to: "/redaction" });
  },
  component: RegisterForm,
});
