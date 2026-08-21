import { currentUserQueryOptions, LoginForm } from "#/features/auth";
import { getCookieHeader } from "#/shared/api/serverCookie";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  beforeLoad: async ({ context }) => {
    try {
      const user = await context.queryClient.ensureQueryData(
        currentUserQueryOptions(getCookieHeader())
      );

      if (user) {
        throw redirect({ to: "/redaction" });
      }
    } catch (error) {
      if (error instanceof Error && "isRedirect" in error) {
        throw error;
      }
    }
  },
  component: LoginForm,
});
