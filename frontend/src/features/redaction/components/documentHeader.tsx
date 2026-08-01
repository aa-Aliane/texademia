// redaction/components/documentHeader.tsx
import { Link } from "@tanstack/react-router";
import {
  Group,
  Text,
  Loader,
  ActionIcon,
  Progress,
  Stack,
  Tooltip,
} from "@mantine/core";
import { IconArrowLeft, IconCheck, IconX, IconHistory } from "@tabler/icons-react";
import { AppShellHeaderPortal } from "#/shared/ui/app-shell/headerPortal";
import { CompileButton } from "./compileButton";
import { DocumentMenu } from "./documentMenu";
import type { CompilePhase } from "../hooks/useCompileDocument";
import styles from "./documentHeader.module.css";
import { Button } from "@mantine/core";



interface DocumentHeaderProps {
  title: string;
  onTitleSave: (title: string) => void;
  isSavingTitle: boolean;
  onCompile: () => void;
  compilePhase: CompilePhase;
  compileProgress: number;
  compileMessage: string;
  compileError: string | null;
  compileLog: string | null;
  template: string;
  pdfUrl: string | null;
  dirtyCount: number;
  onDuplicateClick: () => void;
  onShareClick: () => void;
  role: string;
  onHistoryClick: () => void;
  historyOpened: boolean;
}

export function EditableTitle({
  title,
  onSave,
  isSaving,
}: {
  title: string;
  onSave: (title: string) => void;
  isSaving: boolean;
}) {
  const commit = (el: HTMLHeadingElement) => {
    const trimmed = el.textContent?.trim() || "Untitled";
    if (trimmed !== title) {
      onSave(trimmed);
    } else {
      el.textContent = title; // Reset on no change
    }
  };

  return (
    <Group gap={6} wrap="nowrap">
      <Text
        fw={600}
        size="sm"
        truncate
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => commit(e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
          if (e.key === "Escape") {
            e.currentTarget.textContent = title;
            e.currentTarget.blur();
          }
        }}
        style={{ cursor: "text", outline: "none" }}
      >
        {title}
      </Text>
      {isSaving && <Loader size="xs" />}
    </Group>
  );
}



function CompileStatusIndicator({
  phase,
  progress,
  message,
  error,
  log,
}: {
  phase: CompilePhase;
  progress: number;
  message: string;
  error: string | null;
  log: string | null;
}) {
  if (phase === "idle") {
    return <Text size="xs" c="dimmed">Not compiled yet</Text>;
  }

  if (phase === "saving") {
    return (
      <Group gap={4} wrap="nowrap">
        <Loader size="xs" />
        <Text size="xs" c="dimmed">Saving…</Text>
      </Group>
    );
  }

  if (phase === "queued") {
    return (
      <Group gap={4} wrap="nowrap">
        <Loader size="xs" />
        <Text size="xs" c="dimmed">Queued…</Text>
      </Group>
    );
  }

  if (phase === "running") {
    return (
      <Stack gap={4} w={180}>
        <Group gap={4} wrap="nowrap" justify="space-between">
          <Group gap={4} wrap="nowrap">
            <Loader size="xs" />
            <Text size="xs" c="dimmed" truncate>{message || "Compiling…"}</Text>
          </Group>
          <Text size="xs" c="dimmed" w={30} ta="right">{progress}%</Text>
        </Group>
        <Progress value={progress} size="xs" animated color="blue" />
      </Stack>
    );
  }

  if (phase === "done") {
    return (
      <Group gap={4} wrap="nowrap">
        <IconCheck size={14} color="teal" />
        <Text size="xs" c="teal">Compiled</Text>
      </Group>
    );
  }

  if (phase === "error") {
    return (
      <Tooltip
        label={
          <Stack gap={4} maw={400}>
            <Text size="xs" c="red">{error}</Text>
            {log && (
              <Text size="xs" c="dimmed" style={{ fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                {log.slice(0, 800)}{log.length > 800 ? "…" : ""}
              </Text>
            )}
          </Stack>
        }
        multiline
        withArrow
      >
        <Group gap={4} wrap="nowrap" style={{ cursor: "help" }}>
          <IconX size={14} color="red" />
          <Text size="xs" c="red">Compile failed</Text>
        </Group>
      </Tooltip>
    );
  }

  return null;
}

export function DocumentHeader({
  title,
  onTitleSave,
  isSavingTitle,
  onCompile,
  compilePhase,
  compileProgress,
  compileMessage,
  compileError,
  compileLog,
  template,
  pdfUrl,
  dirtyCount,
  onDuplicateClick,
  onShareClick,
  role,
  onHistoryClick,
  historyOpened,
}: DocumentHeaderProps) {
  const isCompiling = compilePhase === "saving" || compilePhase === "queued" || compilePhase === "running";
  const hasCompiledBefore = compilePhase === "done" || !!pdfUrl;




  return (
    <>
      <AppShellHeaderPortal slot="center">
        <Group gap={8} wrap="nowrap">
          <ActionIcon component={Link} to="/redaction" variant="subtle" size="sm" aria-label="Back to documents">
            <IconArrowLeft size={16} />
          </ActionIcon>
          <EditableTitle title={title} onSave={onTitleSave} isSaving={isSavingTitle} />
          <Button
            onClick={onHistoryClick}
            aria-pressed={historyOpened}
            data-active={historyOpened}
            variant="subtle"
            size="compact-sm"
            leftSection={<IconHistory size={15} stroke={2} />}
            className={styles.historyButton}
          >
            Document history
          </Button>
        </Group>
      </AppShellHeaderPortal>

      <AppShellHeaderPortal slot="actions">
        <Group gap="md" wrap="nowrap">
          <CompileStatusIndicator
            phase={compilePhase}
            progress={compileProgress}
            message={compileMessage}
            error={compileError}
            log={compileLog}
          />
          <DocumentMenu
            template={template}
            pdfUrl={pdfUrl}
            onDuplicateClick={onDuplicateClick}
            onShareClick={onShareClick}
            role={role}
          />
          <CompileButton
            onCompile={onCompile}
            isCompiling={isCompiling}
            hasCompiledBefore={hasCompiledBefore}
            dirtyCount={dirtyCount}
          />
        </Group>
      </AppShellHeaderPortal>

    </>
  );
}
