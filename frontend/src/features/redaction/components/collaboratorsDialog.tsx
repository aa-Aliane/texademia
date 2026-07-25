// redaction/components/collaboratorsDialog.tsx
import { Modal, Stack, TextInput, Select, Button, Group, Avatar, ActionIcon, Text } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useInviteCollaborator, useUpdateCollaboratorRole, useRemoveCollaborator } from "../hooks/useCollaborators";
import type { Collaborator, CollaboratorRole } from "../types/redaction";

interface CollaboratorsDialogProps {
  opened: boolean;
  onClose: () => void;
  documentId: string;
  collaborators: Collaborator[];
}

export function CollaboratorsDialog({ opened, onClose, documentId, collaborators }: CollaboratorsDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CollaboratorRole>("reader");
  const invite = useInviteCollaborator(documentId);
  const updateRole = useUpdateCollaboratorRole(documentId);
  const remove = useRemoveCollaborator(documentId);

  const onInvite = () => {
    invite.mutate({ email, role }, { onSuccess: () => setEmail("") });
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
            data={[
              { value: "reader", label: "Can view" },
              { value: "writer", label: "Can edit" },
            ]}
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
          {collaborators.map((c) => (
            <Group key={c.id} justify="space-between">
              <Group gap="sm">
                <Avatar radius="xl">{c.email.slice(0, 2).toUpperCase()}</Avatar>
                <div>
                  <Text size="sm">{c.email}</Text>
                  <Text size="xs" c="dimmed">
                    {c.status === "pending" ? "Invitation pending" : "Active"}
                  </Text>
                </div>
              </Group>
              <Group gap="xs">
                <Select
                  data={[
                    { value: "reader", label: "Can view" },
                    { value: "writer", label: "Can edit" },
                  ]}
                  value={c.role}
                  onChange={(v) => v && updateRole.mutate({ collaboratorId: c.id, role: v as CollaboratorRole })}
                  w={130}
                  size="xs"
                />
                <ActionIcon color="red" variant="subtle" onClick={() => remove.mutate(c.id)}>
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Group>
          ))}
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
