import { AppShell as MantineAppShell, Group, Text } from "@mantine/core";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <MantineAppShell
      header={{ height: 56 }}
      padding="lg"
      styles={{
        main: {
          backgroundColor: "var(--color-bg)",
        },
        header: {
          backgroundColor: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        },
      }}
    >
      <MantineAppShell.Header>
        <Group h="100%" px="lg" justify="space-between">
          <Text fw={700} size="md" c="var(--color-text)">
            Texademia
          </Text>
        </Group>
      </MantineAppShell.Header>

      <MantineAppShell.Main>{children}</MantineAppShell.Main>
    </MantineAppShell>
  );
}
