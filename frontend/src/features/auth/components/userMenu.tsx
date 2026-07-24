import { Menu, Avatar, UnstyledButton, Group, Text, Skeleton } from "@mantine/core";
import { IconUser, IconLogout, IconChevronDown } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useCurrentUser, useLogout } from "../hooks/useAuth";

function initials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

export function UserMenu() {
  const { data: user, isLoading } = useCurrentUser();
  const { mutate: logout, isPending } = useLogout();


  if (isLoading) return <Skeleton height={36} width={140} radius="sm" />;
  if (!user) return null;

  const displayName =
    user.firstName || user.lastName ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : user.email;

  return (
    <Menu position="bottom-end" withArrow shadow="md">
      <Menu.Target>
        <UnstyledButton>
          <Group gap={8}>
            <Avatar radius="xl" size={32} color="blue">{initials(user.email)}</Avatar>
            <Text size="sm" fw={500} visibleFrom="sm">{displayName}</Text>
            <IconChevronDown size={14} />
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{user.email}</Menu.Label>
        <Menu.Item component={Link} to="/profile" leftSection={<IconUser size={16} />}>
          Edit profile
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={() => logout()} disabled={isPending}>
          Log out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
