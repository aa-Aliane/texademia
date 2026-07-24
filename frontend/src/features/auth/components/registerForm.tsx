import { TextInput, PasswordInput, Button, Stack, Alert, Title, Text, Anchor } from "@mantine/core";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRegister, useLogin } from "../hooks/useAuth";
import { registerSchema, type RegisterInput } from "../schemas/auth";

export function RegisterForm() {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const loginMutation = useLogin();
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = (values: RegisterInput) => {
    registerMutation.mutate(values, {
      // /register doesn't set the auth cookie — log in right after
      onSuccess: () =>
        loginMutation.mutate(values, { onSuccess: () => navigate({ to: "/redaction" }) }),
    });
  };

  const error = registerMutation.error ?? loginMutation.error;
  const isPending = registerMutation.isPending || loginMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack maw={360} mx="auto" mt={80}>
        <Title order={2}>Create account</Title>
        {error && <Alert color="red">{(error as Error).message}</Alert>}
        <TextInput label="Email" type="email" error={errors.email?.message} {...registerField("email")} />
        <PasswordInput label="Password" error={errors.password?.message} {...registerField("password")} />
        <Button type="submit" loading={isPending}>Create account</Button>
        <Text size="sm">Already have an account? <Anchor component={Link} to="/login">Sign in</Anchor></Text>
      </Stack>
    </form>
  );
}
