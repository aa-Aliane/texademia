// redaction/components/invitationsBell.tsx
import { Popover, ActionIcon, Indicator, Stack, Group, Text, Button, Skeleton, Badge } from "@mantine/core";
import { IconBell } from "@tabler/icons-react";
import { usePendingInvitations, useAcceptInvitation, useDeclineInvitation } from "../hooks/useCollaborators";

export function InvitationsBell() {
  const { data: invitations, isLoading } = usePendingInvitations();
  const accept = useAcceptInvitation();
  const decline = useDeclineInvitation();

  const count = invitations?.length ?? 0;

  return (
    <Popover position="bottom-end" withArrow shadow="md" width={320}>
      <Popover.Target>
        <Indicator disabled={count === 0} label={count} size={16} color="red" offset={4}>
          <ActionIcon variant="subtle" size="lg" aria-label="Invitations">
            <IconBell size={20} />
          </ActionIcon>
        </Indicator>
      </Popover.Target>

      <Popover.Dropdown>
        <Stack gap="sm">
          <Text fw={600} size="sm">Invitations</Text>

          {isLoading && <Skeleton height={60} radius="sm" />}

          {!isLoading && count === 0 && (
            <Text size="sm" c="dimmed">No pending invitations.</Text>
          )}

          {invitations?.map((inv) => (
            <Group key={inv.id} justify="space-between" wrap="nowrap" align="flex-start">
              <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={500} truncate>{inv.documentTitle}</Text>
                <Group gap={4}>
                  <Text size="xs" c="dimmed">from {inv.invitedByEmail}</Text>
                  <Badge size="xs" variant="light">
                    {inv.role === "writer" ? "Can edit" : "Can view"}
                  </Badge>
                </Group>
              </Stack>
              <Group gap={4} wrap="nowrap">
                <Button size="xs" variant="light" loading={decline.isPending} onClick={() => decline.mutate(inv.id)}>
                  Decline
                </Button>
                <Button size="xs" loading={accept.isPending} onClick={() => accept.mutate(inv.id)}>
                  Accept
                </Button>
              </Group>
            </Group>
          ))}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
