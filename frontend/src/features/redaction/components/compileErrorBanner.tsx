// redaction/components/compileErrorBanner.tsx
import { Alert, Button, Group, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import type { LatexError } from "./parseLatexLog";

interface CompileErrorBannerProps {
  errors: LatexError[];
  fallbackMessage?: string | null;
  hideLogButton?: boolean;
  onGotoLine: (line: number) => void;
  onOpenLog: () => void;
}

export function CompileErrorBanner({
  errors,
  fallbackMessage,
  hideLogButton,
  onGotoLine,
  onOpenLog,
}: CompileErrorBannerProps) {
  const shown = errors.slice(0, 3);

  return (
    <Alert
      color="red"
      variant="light"
      icon={<IconAlertTriangle size={16} />}
      title={`Compilation failed${errors.length ? ` — ${errors.length} error${errors.length > 1 ? "s" : ""}` : ""}`}
      styles={{ root: { borderRadius: 0 }, message: { width: "100%" } }}
    >
      <Stack gap={4}>
        {shown.map((err, i) => (
          <Group key={i} gap="xs" wrap="nowrap">
            {err.line !== null && (
              <Button
                size="compact-xs"
                variant="subtle"
                color="red"
                onClick={() => onGotoLine(err.line!)}
              >
                line {err.line}
              </Button>
            )}
            <Text size="xs" lineClamp={1} style={{ fontFamily: "var(--font-family-mono)" }}>
              {err.message}
            </Text>
          </Group>
        ))}
        {shown.length === 0 && (
          <Text size="xs">{fallbackMessage ?? "See the log for details."}</Text>
        )}
        <Group gap="xs" mt={4}>
          {errors.length > shown.length && (
            <Text size="xs" c="dimmed">
              +{errors.length - shown.length} more in the log
            </Text>
          )}
          {!hideLogButton && (
            <Button size="compact-xs" variant="outline" color="red" onClick={onOpenLog}>
              View full log
            </Button>
          )}
        </Group>
      </Stack>
    </Alert>
  );
}
