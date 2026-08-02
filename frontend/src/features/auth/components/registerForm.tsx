import { TextInput, PasswordInput, Button, Stack, Alert, Title, Text, Anchor } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRegister, useRequestVerifyToken } from "../hooks/useAuth";
import { registerSchema, type RegisterInput } from "../schemas/auth";

export function RegisterForm() {
  const registerMutation = useRegister();
  const resendMutation = useRequestVerifyToken();
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = (values: RegisterInput) => {
    registerMutation.mutate(values, {
      // /register doesn't set the auth cookie, and login is gated on
      // verification — show "check your inbox" instead of auto-login.
      onSuccess: () => setRegisteredEmail(values.email),
    });
  };

  if (registeredEmail) {
    return (
      <Stack maw={360} mx="auto" mt={80}>
        <Title order={2}>Check your inbox</Title>
        <Alert color="green">
          We sent a verification link to <strong>{registeredEmail}</strong>. Click it to activate
          your account, then sign in.
        </Alert>
        {resendMutation.isSuccess && <Alert color="blue">Verification email re-sent.</Alert>}
        {resendMutation.error && (
          <Alert color="red">{(resendMutation.error as Error).message}</Alert>
        )}
        <Button
          variant="light"
          loading={resendMutation.isPending}
          onClick={() => resendMutation.mutate(registeredEmail)}
        >
          Resend verification email
        </Button>
        <Text size="sm">
          Verified already? <Anchor component={Link} to="/login">Sign in</Anchor>
        </Text>
      </Stack>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack maw={360} mx="auto" mt={80}>
        <Title order={2}>Create account</Title>
        {registerMutation.error && (
          <Alert color="red">{(registerMutation.error as Error).message}</Alert>
        )}
        <TextInput label="Email" type="email" error={errors.email?.message} {...registerField("email")} />
        <PasswordInput label="Password" error={errors.password?.message} {...registerField("password")} />
        <Button type="submit" loading={registerMutation.isPending}>Create account</Button>
        <Text size="sm">Already have an account? <Anchor component={Link} to="/login">Sign in</Anchor></Text>
      </Stack>
    </form>
  );
}
