import { AppShell as MantineAppShell, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";
interface AppShellProps {
  children: React.ReactNode;
}
export function AppShell({ children }: AppShellProps) {
  return (
    <MantineAppShell
      header={{ height: 56 }}
      padding={0}
      styles={{
        main: {
          backgroundColor: "var(--color-bg)",
          height: "calc(100dvh - 56px)",
          overflow: "hidden",
        },
        header: {
          backgroundColor: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        },
      }}
    >
      <MantineAppShell.Header>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            height: "100%",
            paddingInline: "var(--mantine-spacing-lg)",
          }}
        >
          <div style={{ justifySelf: "start", minWidth: 0 }}>
            <Text
              component={Link}
              to="/"
              fw={700}
              size="md"
              c="var(--color-text)"
              style={{ textDecoration: "none" }}
            >
              Texademia
            </Text>
          </div>
          <div id="app-shell-header-center" style={{ justifySelf: "center", minWidth: 0 }} />
          <div id="app-shell-header-actions" style={{ justifySelf: "end", minWidth: 0 }} />
        </div>
      </MantineAppShell.Header>
      <MantineAppShell.Main>{children}</MantineAppShell.Main>
    </MantineAppShell>
  );
}
