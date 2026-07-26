import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  inviteCollaborator,
  updateCollaboratorRole,
  removeCollaborator,
  getPendingInvitations,
  acceptInvitation,
  declineInvitation,
} from "../api/redaction";
import type { CollaboratorRole, Collaborator, RedactionDocument } from "../types/redaction";

const docKey = (documentId: string) => ["document", documentId] as const;

export function useInviteCollaborator(documentId: string) {
  const queryClient = useQueryClient();
  const key = docKey(documentId);

  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: CollaboratorRole }) =>
      inviteCollaborator(documentId, email, role),

    onMutate: async ({ email, role }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<RedactionDocument>(key);

      const optimisticCollaborator: Collaborator = {
        id: `optimistic-${Date.now()}`,
        userId: "",
        email,
        role,
        status: "pending",
      };

      queryClient.setQueryData<RedactionDocument>(key, (old) =>
        old ? { ...old, collaborators: [...old.collaborators, optimisticCollaborator] } : old
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useUpdateCollaboratorRole(documentId: string) {
  const queryClient = useQueryClient();
  const key = docKey(documentId);

  return useMutation({
    mutationFn: ({ collaboratorId, role }: { collaboratorId: string; role: CollaboratorRole }) =>
      updateCollaboratorRole(documentId, collaboratorId, role),

    onMutate: async ({ collaboratorId, role }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<RedactionDocument>(key);

      queryClient.setQueryData<RedactionDocument>(key, (old) =>
        old
          ? {
              ...old,
              collaborators: old.collaborators.map((c) =>
                c.id === collaboratorId ? { ...c, role } : c
              ),
            }
          : old
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useRemoveCollaborator(documentId: string) {
  const queryClient = useQueryClient();
  const key = docKey(documentId);

  return useMutation({
    mutationFn: (collaboratorId: string) => removeCollaborator(documentId, collaboratorId),

    onMutate: async (collaboratorId) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<RedactionDocument>(key);

      queryClient.setQueryData<RedactionDocument>(key, (old) =>
        old
          ? { ...old, collaborators: old.collaborators.filter((c) => c.id !== collaboratorId) }
          : old
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function usePendingInvitations() {
  return useQuery({
    queryKey: ["invitations"],
    queryFn: getPendingInvitations,
    refetchInterval: 30_000,
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useDeclineInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: declineInvitation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invitations"] }),
  });
}
