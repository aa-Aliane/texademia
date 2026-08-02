import { Alert, Button, Stack, Text, Title, Anchor } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useVerifyEmail } from "../hooks/useAuth";
import { verifyEmailSchema } from "../schemas/auth";

export function VerifyEmail({ token }: { token?: string }) {
  const { mutate, isPending, isSuccess, error } = useVerifyEmail();
  // React 18/19 StrictMode double-invokes effects in dev — the ref makes the
  // mutation fire exactly once even then.
  const started = useRef(false);

  useEffect(() => {
    const parsed = verifyEmailSchema.safeParse({ token });
    if (parsed.success && !started.current) {
      started.current = true;
      mutate(parsed.data.token);
    }
  }, [token, mutate]);

  return (
    <Stack maw={360} mx="auto" mt={80}>
      <Title order={2}>Email verification</Title>
      {!token && (
        <Alert color="red">This link is missing its verification token. Request a new email.</Alert>
      )}
      {isPending && <Text>Verifying your email address…</Text>}
      {isSuccess && (
        <Alert color="green">Your email is verified — you can now sign in.</Alert>
      )}
      {error && (
        <Alert color="red">
          {(error as Error).message === "VERIFY_USER_BAD_TOKEN"
            ? "This verification link is invalid or has expired."
            : (error as Error).message}
        </Alert>
      )}
      <Button component={Link} to="/login" variant="light">
        Go to sign in
      </Button>
      <Text size="sm">
        Need an account? <Anchor component={Link} to="/register">Register</Anchor>
      </Text>
    </Stack>
  );
}
