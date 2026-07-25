import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  inviteCollaborator,
  updateCollaboratorRole,
  removeCollaborator,
  getPendingInvitations,
  acceptInvitation,
  declineInvitation,
} from "../api/redaction";
import type { CollaboratorRole } from "../types/redaction";

export function useInviteCollaborator(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: CollaboratorRole }) =>
      inviteCollaborator(documentId, email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useUpdateCollaboratorRole(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ collaboratorId, role }: { collaboratorId: string; role: CollaboratorRole }) =>
      updateCollaboratorRole(documentId, collaboratorId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["document", documentId] }),
  });
}

export function useRemoveCollaborator(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (collaboratorId: string) => removeCollaborator(documentId, collaboratorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function usePendingInvitations() {
  return useQuery({
    queryKey: ["invitations"],
    queryFn: getPendingInvitations,
    refetchInterval: 30_000, // poll — there's no push mechanism without email/websockets
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
