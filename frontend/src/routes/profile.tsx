import { createFileRoute } from "@tanstack/react-router";
import { MfaSettings, ProfileForm, requireAuth } from "#/features/auth";

export const Route = createFileRoute("/profile")({
  beforeLoad: ({ context: { queryClient } }) => requireAuth(queryClient),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <>
      <ProfileForm />
      <MfaSettings />
    </>
  );
}
