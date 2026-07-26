// redaction/components/collaboratorsDialog.tsx
import { Modal, Stack, TextInput, Select, Button, Group, Avatar, ActionIcon, Text } from "@mantine/core";
import { IconTrash, IconCheck, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useDocument } from "../hooks/useDocuments";
import { useInviteCollaborator, useUpdateCollaboratorRole, useRemoveCollaborator } from "../hooks/useCollaborators";
import type { CollaboratorRole } from "../types/redaction";

interface CollaboratorsDialogProps {
  opened: boolean;
  onClose: () => void;
  documentId: string;
}

const ROLE_OPTIONS = [
  { value: "reader", label: "Can view" },
  { value: "writer", label: "Can edit" },
];

export function CollaboratorsDialog({ opened, onClose, documentId }: CollaboratorsDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CollaboratorRole>("reader");
  const [pendingRoles, setPendingRoles] = useState<Record<string, CollaboratorRole>>({});

  const { data: document } = useDocument(documentId);
  const collaborators = document?.collaborators ?? [];

  const invite = useInviteCollaborator(documentId);
  const updateRole = useUpdateCollaboratorRole(documentId);
  const remove = useRemoveCollaborator(documentId);

  const onInvite = () => {
    invite.mutate({ email, role }, { onSuccess: () => setEmail("") });
  };

  const onSelectChange = (collaboratorId: string, currentRole: CollaboratorRole, value: string | null) => {
    if (!value) return;
    if (value === currentRole) {
      setPendingRoles((prev) => {
        const next = { ...prev };
        delete next[collaboratorId];
        return next;
      });
      return;
    }
    setPendingRoles((prev) => ({ ...prev, [collaboratorId]: value as CollaboratorRole }));
  };

  const onConfirmRole = (collaboratorId: string) => {
    const newRole = pendingRoles[collaboratorId];
    if (!newRole) return;
    updateRole.mutate(
      { collaboratorId, role: newRole },
      {
        onSuccess: () => {
          setPendingRoles((prev) => {
            const next = { ...prev };
            delete next[collaboratorId];
            return next;
          });
        },
      }
    );
  };

  const onCancelRole = (collaboratorId: string) => {
    setPendingRoles((prev) => {
      const next = { ...prev };
      delete next[collaboratorId];
      return next;
    });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Collaborators">
      <Stack>
        <Group align="flex-end">
          <TextInput
            label="Email"
            placeholder="colleague@example.com"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Select
            label="Access"
            data={ROLE_OPTIONS}
            value={role}
            onChange={(v) => setRole((v as CollaboratorRole) ?? "reader")}
            w={140}
          />
          <Button onClick={onInvite} loading={invite.isPending} disabled={!email}>
            Invite
          </Button>
        </Group>
        {invite.error && (
          <Text c="red" size="sm">
            {(invite.error as Error).message}
          </Text>
        )}

        <Stack gap="xs">
          {collaborators.map((c) => {
            const isOptimistic = c.id.startsWith("optimistic-");
            const pending = pendingRoles[c.id];
            const isDirty = !!pending && pending !== c.role;
            const isSavingThis = updateRole.isPending && updateRole.variables?.collaboratorId === c.id;
            const isRemovingThis = remove.isPending && remove.variables === c.id;

            return (
              <Group key={c.id} justify="space-between">
                <Group gap="sm">
                  <Avatar radius="xl">{c.email.slice(0, 2).toUpperCase()}</Avatar>
                  <div>
                    <Text size="sm">{c.email}</Text>
                    <Text size="xs" c="dimmed">
                      {isOptimistic
                        ? "Sending invite…"
                        : c.status === "pending"
                        ? "Invitation pending"
                        : "Active"}
                    </Text>
                  </div>
                </Group>
                <Group gap="xs">
                  <Select
                    data={ROLE_OPTIONS}
                    value={pending ?? c.role}
                    onChange={(v) => onSelectChange(c.id, c.role, v)}
                    w={130}
                    size="xs"
                    disabled={isSavingThis || isOptimistic || isRemovingThis}
                  />
                  {isDirty && (
                    <>
                      <ActionIcon color="green" variant="subtle" onClick={() => onConfirmRole(c.id)} loading={isSavingThis} aria-label="Confirm role change">
                        <IconCheck size={16} />
                      </ActionIcon>
                      <ActionIcon color="gray" variant="subtle" onClick={() => onCancelRole(c.id)} disabled={isSavingThis} aria-label="Cancel role change">
                        <IconX size={16} />
                      </ActionIcon>
                    </>
                  )}
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => remove.mutate(c.id)}
                    loading={isRemovingThis}
                    disabled={isDirty || isOptimistic}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Group>
            );
          })}
          {collaborators.length === 0 && (
            <Text size="sm" c="dimmed" ta="center" py="md">
              No collaborators yet — invite someone above.
            </Text>
          )}
        </Stack>
      </Stack>
    </Modal>
  );
}
