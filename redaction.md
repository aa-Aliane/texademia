# Tree View:
```
frontend/src/features/redaction
├── api
│   └── redaction.ts
├── components
│   ├── blameExtension.ts
│   ├── collaboratorsDialog.tsx
│   ├── compileButton.tsx
│   ├── createDocumentDialog.tsx
│   ├── documentHeader.tsx
│   ├── documentMenu.tsx
│   ├── documentsListPage.module.css
│   ├── documentsListPage.tsx
│   ├── duplicateDocumentDialog.tsx
│   ├── editor.tsx
│   ├── fileTabs.tsx
│   ├── invitationsBell.tsx
│   ├── pdfPreview.tsx
│   └── redactionPage.tsx
├── hooks
│   ├── useCollaborators.ts
│   ├── useCompileDocument.ts
│   ├── useDocuments.ts
│   └── useUpdateDocumentTitle.ts
├── index.ts
├── store
│   ├── editorStore.ts
│   └── headerStore.ts
└── types
    └── redaction.ts (omitted - types exist for ProjectFile, RedactionDocument, Collaborator, CollaboratorRole, Invitation, LineAuthor)
```

# Content:

## Summary of Types
- `types/redaction.ts` exists and exports: `LineAuthor`, `ProjectFile`, `RedactionDocument` (id, title, template, files, pdfUrl, createdAt, updatedAt, role, collaborators), `CollaboratorRole` ('reader'|'writer'), `Collaborator`, `Invitation`.

## api/redaction.ts

```ts
import { queryOptions } from "@tanstack/react-query";
import { api, toPublicUrl } from "#/shared/api/client";

function mapDocument(data: any) {
  return {
    id: data.id,
    title: data.title,
    template: data.template,
    pdfUrl: data.pdf_url ? toPublicUrl(data.pdf_url) : null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    role: data.role,
    collaborators: (data.collaborators ?? []).map((c: any) => ({
      id: c.id,
      userId: c.user_id,
      email: c.email,
      role: c.role,
      status: c.status,
    })),
    files: data.files.map((f: any) => ({
      id: f.id,
      name: f.name,
      language: f.language,
      content: f.content,
      lineAuthors: (f.line_authors ?? []).map((la: any) => ({
        author: la.author,
        editedAt: la.edited_at,
      })),
    })),
  };
}

export async function createDocument(title: string, template: string, cookieHeader?: string | null) {
  const data = await api.post("/api/texademia/documents", { title, template }, { cookieHeader });
  return mapDocument(data);
}

export async function getDocument(id: string, cookieHeader?: string | null) {
  const data = await api.get(`/api/texademia/documents/${id}`, { cookieHeader });
  return mapDocument(data);
}

export const documentQueryOptions = (documentId: string, cookieHeader?: string | null) =>
  queryOptions({
    queryKey: ["document", documentId],
    queryFn: () => getDocument(documentId, cookieHeader),
  });

async function saveFile(documentId: string, fileId: string, content: string) {
  await api.patch(`/api/texademia/documents/${documentId}/files/${fileId}`, { content });
}

export async function duplicateDocument(documentId: string, opts: { template?: string; title?: string }) {
  const data = await api.post(`/api/texademia/documents/${documentId}/duplicate`, opts);
  return mapDocument(data);
}

export async function deleteDocument(documentId: string) {
  await api.delete(`/api/texademia/documents/${documentId}`);
}

export async function startCompileJob(documentId: string, files: any[]) {
  await Promise.all(files.map((f) => saveFile(documentId, f.id, f.content)));
  const data = await api.post(`/api/texademia/documents/${documentId}/compile`);
  return { jobId: data.job_id, status: data.status };
}

export async function pollCompileStatus(jobId: string) {
  return api.get(`/api/texademia/compile/${jobId}`);
}

export const compileDocument = startCompileJob;

export async function updateDocumentTitle(documentId: string, title: string) {
  const data = await api.patch(`/api/texademia/documents/${documentId}`, { title });
  return mapDocument(data);
}

export async function listDocuments(cookieHeader?: string | null) {
  const data = await api.get("/api/texademia/documents", { cookieHeader });
  return data.map(mapDocument);
}

export const documentsQueryOptions = (cookieHeader?: string | null) =>
  queryOptions({
    queryKey: ["documents"],
    queryFn: () => listDocuments(cookieHeader),
  });

export async function inviteCollaborator(documentId: string, email: string, role: string) {
  const data = await api.post(`/api/texademia/documents/${documentId}/collaborators`, { email, role });
  return { id: data.id, userId: data.user_id, email: data.email, role: data.role, status: data.status };
}

export async function updateCollaboratorRole(documentId: string, collaboratorId: string, role: string) {
  const data = await api.patch(`/api/texademia/documents/${documentId}/collaborators/${collaboratorId}`, { role });
  return { id: data.id, userId: data.user_id, email: data.email, role: data.role, status: data.status };
}

export async function removeCollaborator(documentId: string, collaboratorId: string) {
  await api.delete(`/api/texademia/documents/${documentId}/collaborators/${collaboratorId}`);
}

export async function getPendingInvitations() {
  const data = await api.get("/api/texademia/invitations");
  return data.map((d: any) => ({
    id: d.id,
    documentId: d.document_id,
    documentTitle: d.document_title,
    role: d.role,
    invitedByEmail: d.invited_by_email,
  }));
}

export async function acceptInvitation(invitationId: string) {
  await api.post(`/api/texademia/invitations/${invitationId}/accept`);
}

export async function declineInvitation(invitationId: string) {
  await api.post(`/api/texademia/invitations/${invitationId}/decline`);
}
```

## components/blameExtension.ts

```ts
import { StateField, StateEffect } from "@codemirror/state";
import { EditorView, Decoration, WidgetType } from "@codemirror/view";

export const setLineAuthors = StateEffect.define<any[]>();

export const lineAuthorsField = StateField.define<any[]>({
  create: () => [],
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setLineAuthors)) return effect.value;
    }
    return value;
  },
});

function formatRelative(iso: string) {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString();
}

class BlameWidget extends WidgetType {
  constructor(private author: string, private editedAt: string) { super(); }
  eq(other: BlameWidget) { return other.author === this.author && other.editedAt === this.editedAt; }
  toDOM() {
    const span = document.createElement("span");
    span.textContent = `  ${this.author}, ${formatRelative(this.editedAt)}`;
    Object.assign(span.style, { opacity: "0.45", fontStyle: "italic", fontSize: "0.85em", pointerEvents: "none", userSelect: "none" });
    return span;
  }
  ignoreEvent() { return true; }
}

function buildDecorations(state: any) {
  const authors = state.field(lineAuthorsField, false) ?? [];
  if (!authors.length) return Decoration.none;
  const cursorLine = state.doc.lineAt(state.selection.main.head);
  const meta = authors[cursorLine.number - 1];
  if (!meta) return Decoration.none;
  return Decoration.set([Decoration.widget({ widget: new BlameWidget(meta.author, meta.editedAt), side: 1 }).range(cursorLine.to)]);
}

export const blameLinePlugin = EditorView.decorations.compute([lineAuthorsField, "selection"], buildDecorations);
export const blameExtension = [lineAuthorsField, blameLinePlugin];
```

## components/collaboratorsDialog.tsx

```tsx
import { Modal, Stack, TextInput, Select, Button, Group, Avatar, ActionIcon, Text } from "@mantine/core";
import { IconTrash, IconCheck, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useDocument } from "../hooks/useDocuments";
import { useInviteCollaborator, useUpdateCollaboratorRole, useRemoveCollaborator } from "../hooks/useCollaborators";

const ROLE_OPTIONS = [
  { value: "reader", label: "Can view" },
  { value: "writer", label: "Can edit" },
];

export function CollaboratorsDialog({ opened, onClose, documentId }: { opened: boolean; onClose: () => void; documentId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("reader");
  const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({});

  const { data: document } = useDocument(documentId);
  const collaborators = document?.collaborators ?? [];

  const invite = useInviteCollaborator(documentId);
  const updateRole = useUpdateCollaboratorRole(documentId);
  const remove = useRemoveCollaborator(documentId);

  const onInvite = () => invite.mutate({ email, role: role as any }, { onSuccess: () => setEmail("") });

  const onSelectChange = (collaboratorId: string, currentRole: string, value: string | null) => {
    if (!value) return;
    if (value === currentRole) {
      setPendingRoles((prev) => { const next = { ...prev }; delete next[collaboratorId]; return next; });
      return;
    }
    setPendingRoles((prev) => ({ ...prev, [collaboratorId]: value }));
  };

  const onConfirmRole = (collaboratorId: string) => {
    const newRole = pendingRoles[collaboratorId];
    if (!newRole) return;
    updateRole.mutate({ collaboratorId, role: newRole as any }, {
      onSuccess: () => setPendingRoles((prev) => { const next = { ...prev }; delete next[collaboratorId]; return next; })
    });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Collaborators">
      <Stack>
        <Group align="flex-end">
          <TextInput label="Email" placeholder="colleague@example.com" value={email} onChange={(e) => setEmail(e.currentTarget.value)} style={{ flex: 1 }} />
          <Select label="Access" data={ROLE_OPTIONS} value={role} onChange={(v) => setRole(v ?? "reader")} w={140} />
          <Button onClick={onInvite} loading={invite.isPending} disabled={!email}>Invite</Button>
        </Group>
        {invite.error && <Text c="red" size="sm">{(invite.error as Error).message}</Text>}

        <Stack gap="xs">
          {collaborators.map((c: any) => {
            const pending = pendingRoles[c.id];
            const isDirty = !!pending && pending !== c.role;
            return (
              <Group key={c.id} justify="space-between">
                <Group gap="sm">
                  <Avatar radius="xl">{c.email.slice(0, 2).toUpperCase()}</Avatar>
                  <div>
                    <Text size="sm">{c.email}</Text>
                    <Text size="xs" c="dimmed">{c.id.startsWith("optimistic-") ? "Sending invite…" : c.status === "pending" ? "Invitation pending" : "Active"}</Text>
                  </div>
                </Group>
                <Group gap="xs">
                  <Select data={ROLE_OPTIONS} value={pending ?? c.role} onChange={(v) => onSelectChange(c.id, c.role, v)} w={130} size="xs" />
                  {isDirty && (
                    <>
                      <ActionIcon color="green" variant="subtle" onClick={() => onConfirmRole(c.id)}><IconCheck size={16} /></ActionIcon>
                      <ActionIcon color="gray" variant="subtle" onClick={() => setPendingRoles((prev) => { const n = { ...prev }; delete n[c.id]; return n; })}><IconX size={16} /></ActionIcon>
                    </>
                  )}
                  <ActionIcon color="red" variant="subtle" onClick={() => remove.mutate(c.id)}><IconTrash size={16} /></ActionIcon>
                </Group>
              </Group>
            );
          })}
        </Stack>
      </Stack>
    </Modal>
  );
}
```

## components/compileButton.tsx

```tsx
import { Button, Badge } from "@mantine/core";
import { IconPlayerPlay, IconLoader2 } from "@tabler/icons-react";

export function CompileButton({ onCompile, isCompiling, hasCompiledBefore, dirtyCount }: any) {
  const canCompile = !isCompiling && (!hasCompiledBefore || dirtyCount > 0);
  return (
    <Button
      onClick={onCompile}
      disabled={!canCompile}
      leftSection={isCompiling ? <IconLoader2 size={16} className="spin" /> : <IconPlayerPlay size={16} />}
      rightSection={dirtyCount > 0 ? <Badge color="red" size="xs" variant="filled">{dirtyCount}</Badge> : undefined}
      color={isCompiling ? "gray" : "blue"}
    >
      {isCompiling ? "Compiling…" : hasCompiledBefore ? "Recompile" : "Compile"}
    </Button>
  );
}
```

## components/createDocumentDialog.tsx & duplicateDocumentDialog.tsx

*(Omitted details: Shared dialog structure using mantine Modal, TextInput for title, SegmentedControl for template selection [default, arxiv, ieee, acl], submit button calling onCreate/onDuplicate callback)*

## components/documentHeader.tsx

```tsx
import { Link } from "@tanstack/react-router";
import { Group, Text, Loader, ActionIcon, Progress, Stack, Tooltip } from "@mantine/core";
import { IconArrowLeft, IconCheck, IconX } from "@tabler/icons-react";
import { AppShellHeaderPortal } from "#/shared/ui/app-shell/headerPortal";
import { CompileButton } from "./compileButton";
import { DocumentMenu } from "./documentMenu";

export function EditableTitle({ title, onSave, isSaving }: any) {
  const commit = (el: HTMLHeadingElement) => {
    const trimmed = el.textContent?.trim() || "Untitled";
    if (trimmed !== title) onSave(trimmed); else el.textContent = title;
  };
  return (
    <Group gap={6} wrap="nowrap">
      <Text fw={600} size="sm" truncate contentEditable suppressContentEditableWarning onBlur={(e) => commit(e.currentTarget)} style={{ cursor: "text", outline: "none" }}>
        {title}
      </Text>
      {isSaving && <Loader size="xs" />}
    </Group>
  );
}

function CompileStatusIndicator({ phase, progress, message, error, log }: any) {
  if (phase === "idle") return <Text size="xs" c="dimmed">Not compiled yet</Text>;
  if (phase === "saving" || phase === "queued") return <Group gap={4}><Loader size="xs" /><Text size="xs" c="dimmed">{phase === "saving" ? "Saving…" : "Queued…"}</Text></Group>;
  if (phase === "running") return (
    <Stack gap={4} w={180}>
      <Group gap={4} justify="space-between"><Text size="xs" c="dimmed" truncate>{message || "Compiling…"}</Text><Text size="xs" c="dimmed">{progress}%</Text></Group>
      <Progress value={progress} size="xs" animated color="blue" />
    </Stack>
  );
  if (phase === "done") return <Group gap={4}><IconCheck size={14} color="teal" /><Text size="xs" c="teal">Compiled</Text></Group>;
  if (phase === "error") return (
    <Tooltip label={<Stack gap={4} maw={400}><Text size="xs" c="red">{error}</Text>{log && <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>{log.slice(0, 800)}</Text>}</Stack>} multiline withArrow>
      <Group gap={4} style={{ cursor: "help" }}><IconX size={14} color="red" /><Text size="xs" c="red">Compile failed</Text></Group>
    </Tooltip>
  );
  return null;
}

export function DocumentHeader(props: any) {
  const isCompiling = props.compilePhase === "saving" || props.compilePhase === "queued" || props.compilePhase === "running";
  const hasCompiledBefore = props.compilePhase === "done" || !!props.pdfUrl;
  return (
    <>
      <AppShellHeaderPortal slot="center">
        <Group gap={8} wrap="nowrap">
          <ActionIcon component={Link} to="/redaction" variant="subtle" size="sm"><IconArrowLeft size={16} /></ActionIcon>
          <EditableTitle title={props.title} onSave={props.onTitleSave} isSaving={props.isSavingTitle} />
        </Group>
      </AppShellHeaderPortal>
      <AppShellHeaderPortal slot="actions">
        <Group gap="md" wrap="nowrap">
          <CompileStatusIndicator phase={props.compilePhase} progress={props.compileProgress} message={props.compileMessage} error={props.compileError} log={props.compileLog} />
          <DocumentMenu template={props.template} pdfUrl={props.pdfUrl} onDuplicateClick={props.onDuplicateClick} onShareClick={props.onShareClick} role={props.role} />
          <CompileButton onCompile={props.onCompile} isCompiling={isCompiling} hasCompiledBefore={hasCompiledBefore} dirtyCount={props.dirtyCount} />
        </Group>
      </AppShellHeaderPortal>
    </>
  );
}
```

## components/documentMenu.tsx

```tsx
import { Menu, ActionIcon, Badge, Text } from "@mantine/core";
import { IconDots, IconCopy, IconDownload, IconFileZip, IconTrash, IconUsers } from "@tabler/icons-react";

export function DocumentMenu({ template, pdfUrl, onDuplicateClick, onShareClick, role }: any) {
  return (
    <Menu position="bottom-end" shadow="md" width={240}>
      <Menu.Target>
        <ActionIcon variant="subtle" size="sm"><IconDots size={18} /></ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label><Text size="xs" c="dimmed" span>Template</Text> <Badge size="xs" variant="light">{template}</Badge></Menu.Label>
        {role === "owner" && <Menu.Item leftSection={<IconUsers size={16} />} onClick={onShareClick}>Manage collaborators</Menu.Item>}
        <Menu.Item leftSection={<IconDownload size={16} />} component="a" href={pdfUrl ?? undefined} target="_blank" disabled={!pdfUrl}>Download PDF</Menu.Item>
        <Menu.Item leftSection={<IconFileZip size={16} />} disabled>Download source (.zip)</Menu.Item>
        <Menu.Item leftSection={<IconCopy size={16} />} onClick={onDuplicateClick}>Duplicate</Menu.Item>
        <Menu.Divider />
        <Menu.Item color="red" leftSection={<IconTrash size={16} />} disabled>Delete document</Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
```

## components/documentsListPage.module.css & components/documentsListPage.tsx

*(Omitted styling module and detailed tanstack table setup; renders a list/table of documents with search, sorting by title/updatedAt, access indicators, actions for share/duplicate/download/delete, pagination, and modals for document creation/duplication/deletion/collaborators)*

## components/editor.tsx

```tsx
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { useEffect, useRef } from "react";
import { blameExtension, setLineAuthors } from "./blameExtension";

export function Editor({ value, onChange, lineAuthors, readOnly }: any) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  useEffect(() => {
    editorRef.current?.view?.dispatch({ effects: setLineAuthors.of(lineAuthors ?? []) });
  }, [lineAuthors]);

  return (
    <CodeMirror
      ref={editorRef}
      value={value}
      height="100%"
      extensions={[StreamLanguage.define(stex), blameExtension]}
      onChange={onChange}
      readOnly={readOnly}
      style={{ height: "100%" }}
    />
  );
}
```

## components/fileTabs.tsx

```tsx
import { Tabs } from "@mantine/core";
import { IconFileText, IconAlertTriangle } from "@tabler/icons-react";

export const PREVIEW_TAB_ID = "__preview__";
export const LOG_TAB_ID = "__log__";

export function FileTabs({ files, activeTabId, onSelect, hasLog }: any) {
  return (
    <Tabs value={activeTabId} onChange={(id) => id && onSelect(id)}>
      <Tabs.List>
        {files.map((f: any) => <Tabs.Tab key={f.id} value={f.id}>{f.name}</Tabs.Tab>)}
        {hasLog && <Tabs.Tab value={LOG_TAB_ID} color="red" leftSection={<IconAlertTriangle size={14} />}>Compile Log</Tabs.Tab>}
        <Tabs.Tab value={PREVIEW_TAB_ID} ml="auto" leftSection={<IconFileText size={14} />} color="violet">Preview</Tabs.Tab>
      </Tabs.List>
    </Tabs>
  );
}
```

## components/invitationsBell.tsx

```tsx
import { Popover, ActionIcon, Indicator, Stack, Group, Text, Button, Badge } from "@mantine/core";
import { IconBell } from "@tabler/icons-react";
import { usePendingInvitations, useAcceptInvitation, useDeclineInvitation } from "../hooks/useCollaborators";

export function InvitationsBell() {
  const { data: invitations } = usePendingInvitations();
  const accept = useAcceptInvitation();
  const decline = useDeclineInvitation();
  const count = invitations?.length ?? 0;

  return (
    <Popover position="bottom-end" withArrow shadow="md" width={320}>
      <Popover.Target>
        <Indicator disabled={count === 0} label={count} size={16} color="red" offset={4}>
          <ActionIcon variant="subtle" size="lg"><IconBell size={20} /></ActionIcon>
        </Indicator>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <Text fw={600} size="sm">Invitations</Text>
          {invitations?.map((inv: any) => (
            <Group key={inv.id} justify="space-between" wrap="nowrap">
              <Stack gap={2}>
                <Text size="sm" fw={500}>{inv.documentTitle}</Text>
                <Text size="xs" c="dimmed">from {inv.invitedByEmail}</Text>
              </Stack>
              <Group gap={4}>
                <Button size="xs" variant="light" onClick={() => decline.mutate(inv.id)}>Decline</Button>
                <Button size="xs" onClick={() => accept.mutate(inv.id)}>Accept</Button>
              </Group>
            </Group>
          ))}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
```

## components/pdfPreview.tsx & redactionPage.tsx

*(Omitted: `PdfPreview` renders `<iframe>` for PDF. `RedactionPage` manages main workspace state: active tabs, files state, header, CodeMirror editor, PDF preview iframe, compilation log tab, and share/duplicate dialogs)*

## hooks/

- **useCollaborators.ts**: Mutations/queries with optimistic updates for `inviteCollaborator`, `updateCollaboratorRole`, `removeCollaborator`, `getPendingInvitations`, `acceptInvitation`, `declineInvitation`.
- **useCompileDocument.ts**: Handles compile execution and polling loop (800ms) for compile status (`saving` -> `queued` -> `running` -> `done`|`error`), appends cache-buster to PDF URL.
- **useDocuments.ts**: React Query hooks for `useDocument`, `useCreateDocument`, `useDeleteDocument`.
- **useUpdateDocumentTitle.ts**: Mutation hook updating document title.

## store/ & index.ts

- **store/editorStore.ts & headerStore.ts**: Zustand stores for editor state (documentId, files, activeFileId, loadDocument, updateActiveFileContent).
- **index.ts**: Exports `RedactionPage`, `DocumentsListPage`, `InvitationsBell`, API methods & options.
