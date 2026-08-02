import { TextInput, PasswordInput, Button, Stack, Alert, Title, Text, Anchor } from "@mantine/core";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin, useVerifyMfa, useRequestVerifyToken } from "../hooks/useAuth";
import { loginSchema, mfaCodeSchema, type LoginInput, type MfaCodeInput } from "../schemas/auth";

export function LoginForm() {
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const verifyMfa = useVerifyMfa();
  const resendMutation = useRequestVerifyToken();

  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const loginForm = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const mfaForm = useForm<MfaCodeInput>({ resolver: zodResolver(mfaCodeSchema) });

  const onLoginSubmit = (values: LoginInput) => {
    setUnverifiedEmail(null);
    loginMutation.mutate(values, {
      onSuccess: (result) => {
        if (result.mfaRequired) setMfaToken(result.mfaToken);
        else navigate({ to: "/redaction" });
      },
      onError: (err) => {
        if ((err as Error).message === "LOGIN_USER_NOT_VERIFIED") {
          setUnverifiedEmail(values.email);
        }
      },
    });
  };

  const onMfaSubmit = (values: MfaCodeInput) => {
    if (!mfaToken) return;
    verifyMfa.mutate(
      { mfaToken, code: values.code },
      { onSuccess: () => navigate({ to: "/redaction" }) },
    );
  };

  // Step 2: TOTP challenge
  if (mfaToken) {
    return (
      <form onSubmit={mfaForm.handleSubmit(onMfaSubmit)}>
        <Stack maw={360} mx="auto" mt={80}>
          <Title order={2}>Two-factor authentication</Title>
          {verifyMfa.error && <Alert color="red">{(verifyMfa.error as Error).message}</Alert>}
          <Text size="sm">Enter the 6-digit code from your authenticator app.</Text>
          <TextInput
            label="Authentication code"
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
            error={mfaForm.formState.errors.code?.message}
            {...mfaForm.register("code")}
          />
          <Button type="submit" loading={verifyMfa.isPending}>Verify</Button>
          <Button
            variant="subtle"
            onClick={() => {
              setMfaToken(null);
              verifyMfa.reset();
              loginMutation.reset();
            }}
          >
            Back to sign in
          </Button>
        </Stack>
      </form>
    );
  }

  // Step 1: email + password
  return (
    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
      <Stack maw={360} mx="auto" mt={80}>
        <Title order={2}>Sign in</Title>

        {unverifiedEmail ? (
          <>
            <Alert color="yellow">
              Your email address isn't verified yet. Check your inbox for the verification link.
            </Alert>
            {resendMutation.isSuccess && <Alert color="blue">Verification email re-sent.</Alert>}
            <Button
              variant="light"
              loading={resendMutation.isPending}
              onClick={() => resendMutation.mutate(unverifiedEmail)}
            >
              Resend verification email
            </Button>
          </>
        ) : (
          loginMutation.error && <Alert color="red">{(loginMutation.error as Error).message}</Alert>
        )}

        <TextInput
          label="Email"
          type="email"
          error={loginForm.formState.errors.email?.message}
          {...loginForm.register("email")}
        />
        <PasswordInput
          label="Password"
          error={loginForm.formState.errors.password?.message}
          {...loginForm.register("password")}
        />
        <Button type="submit" loading={loginMutation.isPending}>Sign in</Button>
        <Text size="sm">No account? <Anchor component={Link} to="/register">Register</Anchor></Text>
      </Stack>
    </form>
  );
}
