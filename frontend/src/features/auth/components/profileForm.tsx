import { TextInput, Button, Stack, Alert, Title } from "@mantine/core";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCurrentUser, useUpdateProfile } from "../hooks/useAuth";
import { profileSchema, type ProfileInput } from "../schemas/auth";

export function ProfileForm() {
  const { data: user } = useCurrentUser();
  const { mutate, isPending, error, isSuccess } = useUpdateProfile();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    // resyncs whenever `user` changes — no useEffect needed
    values: user ? { firstName: user.firstName ?? "", lastName: user.lastName ?? "" } : undefined,
  });

  if (!user) return null;

  const onSubmit = (values: ProfileInput) => {
    mutate({ firstName: values.firstName || undefined, lastName: values.lastName || undefined });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack maw={420} mx="auto" mt={80}>
        <Title order={2}>Your profile</Title>
        {error && <Alert color="red">{(error as Error).message}</Alert>}
        {isSuccess && <Alert color="green">Profile updated</Alert>}
        <TextInput label="Email" value={user.email} disabled />
        <TextInput label="First name" error={errors.firstName?.message} {...register("firstName")} />
        <TextInput label="Last name" error={errors.lastName?.message} {...register("lastName")} />
        <Button type="submit" loading={isPending}>Save changes</Button>
      </Stack>
    </form>
  );
}
