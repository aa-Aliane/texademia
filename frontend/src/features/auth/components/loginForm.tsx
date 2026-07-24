import { TextInput, PasswordInput, Button, Stack, Alert, Title, Text, Anchor } from "@mantine/core";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin } from "../hooks/useAuth";
import { loginSchema, type LoginInput } from "../schemas/auth";

export function LoginForm() {
  const navigate = useNavigate();
  const { mutate, isPending, error } = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (values: LoginInput) => {
    mutate(values, { onSuccess: () => navigate({ to: "/redaction" }) });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack maw={360} mx="auto" mt={80}>
        <Title order={2}>Sign in</Title>
        {error && <Alert color="red">{(error as Error).message}</Alert>}
        <TextInput label="Email" type="email" error={errors.email?.message} {...register("email")} />
        <PasswordInput label="Password" error={errors.password?.message} {...register("password")} />
        <Button type="submit" loading={isPending}>Sign in</Button>
        <Text size="sm">No account? <Anchor component={Link} to="/register">Register</Anchor></Text>
      </Stack>
    </form>
  );
}
