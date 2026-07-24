import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { currentUserQueryOptions, login, logout, register, updateCurrentUser } from "../api/auth";

export function useCurrentUser() {
  return useQuery(currentUserQueryOptions());
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCurrentUser,
    onSuccess: (user) => queryClient.setQueryData(["current-user"], user),
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => login(email, password),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      await router.invalidate();
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => register(email, password),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      queryClient.clear(); // wipe cached documents/profile etc. that belonged to this user
      await router.invalidate();
      router.navigate({ to: "/login" });
    },
  });
}
