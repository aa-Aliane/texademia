import { createFileRoute } from "@tanstack/react-router";
import { ProfileForm, requireAuth } from "#/features/auth";

export const Route = createFileRoute("/profile")({
  beforeLoad: ({ context: { queryClient } }) => requireAuth(queryClient),
  component: ProfileForm,
});
