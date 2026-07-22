// redaction/components/documentHeader.tsx
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Group, Text, TextInput, Loader, ActionIcon } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { AppShellHeaderPortal } from "#/shared/ui/app-shell/headerPortal";
import { CompileButton } from "./compileButton";
import { DocumentMenu } from "./documentMenu";

type CompileStatus = "idle" | "compiling" | "success" | "error";

interface DocumentHeaderProps {
  title: string;
  onTitleSave: (title: string) => void;
  isSavingTitle: boolean;
  onCompile: () => void;
  compileStatus: CompileStatus;
  compileError?: string;
  template: string;
  pdfUrl: string | null;
}

function EditableTitle({
  title,
  onSave,
  isSaving,
}: {
  title: string;
  onSave: (title: string) => void;
  isSaving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);

  useEffect(() => setValue(title), [title]);

  const commit = () => {
    setEditing(false);
    const trimmed = value.trim() || "Untitled";
    if (trimmed !== title) onSave(trimmed);
    else setValue(title);
  };

  if (editing) {
    return (
      <TextInput
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setValue(title);
            setEditing(false);
          }
        }}
        autoFocus
        variant="unstyled"
        styles={{ input: { fontSize: 16, fontWeight: 600, textAlign: "center" } }}
      />
    );
  }

  return (
    <Group gap={6} wrap="nowrap" onClick={() => setEditing(true)} style={{ cursor: "text" }}>
      <Text fw={600} size="sm" truncate>
        {title}
      </Text>
      {isSaving && <Loader size="xs" />}
    </Group>
  );
}

function CompileStatusLabel({ status, error }: { status: CompileStatus; error?: string }) {
  if (status === "compiling") {
    return (
      <Group gap={4} wrap="nowrap">
        <Loader size="xs" />
        <Text size="xs" c="dimmed">Compiling…</Text>
      </Group>
    );
  }
  if (status === "success") return <Text size="xs" c="teal">Compiled</Text>;
  if (status === "error") return <Text size="xs" c="red">{error ?? "Compile failed"}</Text>;
  return <Text size="xs" c="dimmed">Not compiled yet</Text>;
}

export function DocumentHeader({
  title,
  onTitleSave,
  isSavingTitle,
  onCompile,
  compileStatus,
  compileError,
  template,
  pdfUrl,
}: DocumentHeaderProps) {
  return (
    <>
      <AppShellHeaderPortal slot="center">
        <Group gap={8} wrap="nowrap">
          <ActionIcon component={Link} to="/redaction" variant="subtle" size="sm" aria-label="Back to documents">
            <IconArrowLeft size={16} />
          </ActionIcon>
          <EditableTitle title={title} onSave={onTitleSave} isSaving={isSavingTitle} />
        </Group>
      </AppShellHeaderPortal>

      <AppShellHeaderPortal slot="actions">
        <Group gap="md" wrap="nowrap">
          <CompileStatusLabel status={compileStatus} error={compileError} />
          <DocumentMenu template={template} pdfUrl={pdfUrl} />
          <CompileButton onCompile={onCompile} isCompiling={compileStatus === "compiling"} />
        </Group>
      </AppShellHeaderPortal>
    </>
  );
}
