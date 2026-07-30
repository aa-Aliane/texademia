# Tree View:
```
frontend
├── .env.example
├── postcss.config.js
├── src
│   ├── features
│   │   └── redaction
│   │       ├── api
│   │       │   └── redaction.ts
│   │       ├── components
│   │       │   ├── blameExtension.ts
│   │       │   ├── collaboratorsDialog.tsx
│   │       │   ├── compileButton.tsx
│   │       │   ├── createDocumentDialog.tsx
│   │       │   ├── cursorExtension.ts
│   │       │   ├── documentHeader.tsx
│   │       │   ├── documentMenu.tsx
│   │       │   ├── documentsListPage.module.css
│   │       │   ├── documentsListPage.tsx
│   │       │   ├── duplicateDocumentDialog.tsx
│   │       │   ├── editor.tsx
│   │       │   ├── fileTabs.tsx
│   │       │   ├── invitationsBell.tsx
│   │       │   ├── pdfPreview.tsx
│   │       │   └── redactionPage.tsx
│   │       ├── hooks
│   │       │   ├── useCollaborators.ts
│   │       │   ├── useCompileDocument.ts
│   │       │   ├── useDocuments.ts
│   │       │   ├── useDocumentSocket.ts
│   │       │   └── useUpdateDocumentTitle.ts
│   │       ├── index.ts
│   │       ├── store
│   │       │   ├── editorStore.ts
│   │       │   ├── headerStore.ts
│   │       │   └── redactionStore.ts
│   │       └── types
│   │           └── redaction.ts
│   ├── integrations
│   │   └── tanstack-query
│   │       ├── devtools.tsx
│   │       └── root-provider.tsx
│   ├── router.tsx
│   ├── routes
│   │   ├── __root.tsx
│   │   ├── index.tsx
│   │   ├── login.tsx
│   │   ├── profile.tsx
│   │   ├── redaction.$documentId.tsx
│   │   ├── redaction.index.tsx
│   │   └── register.tsx
│   ├── routeTree.gen.ts
│   ├── shared
│   │   ├── api
│   │   │   ├── client.ts
│   │   │   └── serverCookie.ts
│   │   ├── styles
│   │   │   ├── animations.module.css
│   │   │   └── tokens.module.css
│   │   ├── theme
│   │   │   └── theme.ts
│   │   └── ui
│   │       ├── app-shell
│   │       │   ├── appShell.tsx
│   │       │   └── headerPortal.tsx
│   │       └── card
│   │           ├── card.module.css
│   │           └── card.tsx
│   └── styles.css
└── vite.config.ts

```

# Content:

## .env.example

```example
INTERNAL_API_URL=http://backend:8000

```


## postcss.config.js

```js
// postcss.config.mjs
export default {
  plugins: {
    'postcss-preset-mantine': {},
    'postcss-simple-vars': {
      variables: {
        'mantine-breakpoint-xs': '36em',
        'mantine-breakpoint-sm': '48em',
        'mantine-breakpoint-md': '62em',
        'mantine-breakpoint-lg': '75em',
        'mantine-breakpoint-xl': '88em',
      },
    },
  },
};

```


## src/features/redaction/api/redaction.ts

```ts
// redaction/api/redaction.ts
import { queryOptions } from "@tanstack/react-query";
import { api, toPublicUrl } from "#/shared/api/client";
import type { ProjectFile, RedactionDocument, Collaborator, CollaboratorRole, Invitation } from "../types/redaction";

interface FileDto {
  id: string;
  name: string;
  language: "latex" | "bibtex" | "log";
  content: string;
  line_authors?: { author: string; edited_at: string }[] | null;
}

interface CollaboratorDto {
  id: string;
  user_id: string;
  email: string;
  role: CollaboratorRole;
  status: "pending" | "accepted";
}

interface DocumentDto {
  id: string;
  title: string;
  template: string;
  files: FileDto[];
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  role: string; // NEW — "owner" | "writer" | "reader"
  collaborators: CollaboratorDto[]; // NEW
}

function mapDocument(data: DocumentDto): RedactionDocument {
  return {
    id: data.id,
    title: data.title,
    template: data.template,
    pdfUrl: data.pdf_url ? toPublicUrl(data.pdf_url) : null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    role: data.role, // NEW
    collaborators: (data.collaborators ?? []).map((c) => ({ // NEW
      id: c.id,
      userId: c.user_id,
      email: c.email,
      role: c.role,
      status: c.status,
    })),
    files: data.files.map((f) => ({
      id: f.id,
      name: f.name,
      language: f.language,
      content: f.content,
      lineAuthors: (f.line_authors ?? []).map((la) => ({
        author: la.author,
        editedAt: la.edited_at,
      })),
    })),
  };
}

export async function createDocument(
  title: string,
  template: string,
  cookieHeader?: string | null
): Promise<RedactionDocument> {
  const data = await api.post<DocumentDto>("/api/texademia/documents", { title, template }, { cookieHeader });
  return mapDocument(data);
}

export async function getDocument(id: string, cookieHeader?: string | null): Promise<RedactionDocument> {
  const data = await api.get<DocumentDto>(`/api/texademia/documents/${id}`, { cookieHeader });
  return mapDocument(data);
}

export const documentQueryOptions = (documentId: string, cookieHeader?: string | null) =>
  queryOptions({
    queryKey: ["document", documentId],
    queryFn: () => getDocument(documentId, cookieHeader),
  });

async function saveFile(documentId: string, fileId: string, content: string): Promise<void> {
  await api.patch(`/api/texademia/documents/${documentId}/files/${fileId}`, { content });
}

export async function duplicateDocument(
  documentId: string,
  opts: { template?: string; title?: string }
): Promise<RedactionDocument> {
  const data = await api.post<DocumentDto>(
    `/api/texademia/documents/${documentId}/duplicate`,
    opts
  );
  return mapDocument(data);
}

export async function deleteDocument(documentId: string): Promise<void> {
  await api.delete(`/api/texademia/documents/${documentId}`);
}

// ============================================
// Background compilation with polling
// ============================================

export interface CompileJobResponse {
  jobId: string;
  status: string;
}

export interface CompilePollResponse {
  status: "queued" | "running" | "done" | "error";
  step?: string;
  percent?: number;
  message?: string;
  result?: {
    pdf_url: string;
    log: string;
  };
  error?: string;
}

export async function startCompileJob(
  documentId: string,
  files: ProjectFile[]
): Promise<CompileJobResponse> {
  // DEBUG: verify the editor content reaching the compile request
  const mainFile = files.find((f) => f.name.endsWith(".tex"));
  console.log("[compile] saving files before compile", {
    documentId,
    fileCount: files.length,
    mainFileName: mainFile?.name,
    mainContentSnippet: mainFile?.content.slice(0, 200),
  });

  await Promise.all(files.map((f) => saveFile(documentId, f.id, f.content)));

  const data = await api.post<{ job_id: string; status: string }>(
    `/api/texademia/documents/${documentId}/compile`
  );
  console.log("[compile] started job", data);
  return { jobId: data.job_id, status: data.status };
}

export async function pollCompileStatus(jobId: string): Promise<CompilePollResponse> {
  return api.get<CompilePollResponse>(`/api/texademia/compile/${jobId}`);
}

// BACKWARD COMPATIBILITY ALIAS — pour éviter les erreurs d'import
// @deprecated Use startCompileJob instead
export const compileDocument = startCompileJob;

export async function updateDocumentTitle(
  documentId: string,
  title: string
): Promise<RedactionDocument> {
  const data = await api.patch<DocumentDto>(`/api/texademia/documents/${documentId}`, { title });
  return mapDocument(data);
}

export async function listDocuments(cookieHeader?: string | null): Promise<RedactionDocument[]> {
  const data = await api.get<DocumentDto[]>("/api/texademia/documents", { cookieHeader });
  return data.map(mapDocument);
}

export const documentsQueryOptions = (cookieHeader?: string | null) =>
  queryOptions({
    queryKey: ["documents"],
    queryFn: () => listDocuments(cookieHeader),
  });

// ============================================
// Collaborators & invitations — NEW
// ============================================

export async function inviteCollaborator(
  documentId: string,
  email: string,
  role: CollaboratorRole
): Promise<Collaborator> {
  const data = await api.post<CollaboratorDto>(`/api/texademia/documents/${documentId}/collaborators`, {
    email,
    role,
  });
  return { id: data.id, userId: data.user_id, email: data.email, role: data.role, status: data.status };
}

export async function updateCollaboratorRole(
  documentId: string,
  collaboratorId: string,
  role: CollaboratorRole
): Promise<Collaborator> {
  const data = await api.patch<CollaboratorDto>(
    `/api/texademia/documents/${documentId}/collaborators/${collaboratorId}`,
    { role }
  );
  return { id: data.id, userId: data.user_id, email: data.email, role: data.role, status: data.status };
}

export async function removeCollaborator(documentId: string, collaboratorId: string): Promise<void> {
  await api.delete(`/api/texademia/documents/${documentId}/collaborators/${collaboratorId}`);
}

interface InvitationDto {
  id: string;
  document_id: string;
  document_title: string;
  role: CollaboratorRole;
  invited_by_email: string;
}

function mapInvitation(data: InvitationDto): Invitation {
  return {
    id: data.id,
    documentId: data.document_id,
    documentTitle: data.document_title,
    role: data.role,
    invitedByEmail: data.invited_by_email,
  };
}

export async function getPendingInvitations(): Promise<Invitation[]> {
  const data = await api.get<InvitationDto[]>("/api/texademia/invitations");
  return data.map(mapInvitation);
}

export async function acceptInvitation(invitationId: string): Promise<void> {
  await api.post(`/api/texademia/invitations/${invitationId}/accept`);
}

export async function declineInvitation(invitationId: string): Promise<void> {
  await api.post(`/api/texademia/invitations/${invitationId}/decline`);
}

```


## src/features/redaction/components/blameExtension.ts

```ts
import { StateField, StateEffect, type EditorState } from "@codemirror/state";
import { EditorView, Decoration, WidgetType, type DecorationSet } from "@codemirror/view";
import type { LineAuthor } from "../types/redaction";

export const setLineAuthors = StateEffect.define<LineAuthor[]>();

export const lineAuthorsField = StateField.define<LineAuthor[]>({
  create: () => [],
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setLineAuthors)) return effect.value;
    }
    return value;
  },
});

function formatRelative(iso: string): string {
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
  constructor(private author: string, private editedAt: string) {
    super();
  }
  eq(other: BlameWidget) {
    return other.author === this.author && other.editedAt === this.editedAt;
  }
  toDOM() {
    const span = document.createElement("span");
    span.textContent = `  ${this.author}, ${formatRelative(this.editedAt)}`;
    Object.assign(span.style, {
      opacity: "0.45",
      fontStyle: "italic",
      fontSize: "0.85em",
      pointerEvents: "none",
      userSelect: "none",
    });
    return span;
  }
  ignoreEvent() {
    return true;
  }
}

function buildDecorations(state: EditorState): DecorationSet {
  const authors = state.field(lineAuthorsField, false) ?? [];
  if (!authors.length) return Decoration.none;

  const cursorLine = state.doc.lineAt(state.selection.main.head);
  const meta = authors[cursorLine.number - 1];
  if (!meta) return Decoration.none;

  return Decoration.set([
    Decoration.widget({ widget: new BlameWidget(meta.author, meta.editedAt), side: 1 }).range(
      cursorLine.to
    ),
  ]);
}

export const blameLinePlugin = EditorView.decorations.compute(
  [lineAuthorsField, "selection"],
  buildDecorations
);

export const blameExtension = [lineAuthorsField, blameLinePlugin];

```


## src/features/redaction/components/collaboratorsDialog.tsx

```tsx
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

```


## src/features/redaction/components/compileButton.tsx

```tsx
// redaction/components/compileButton.tsx
import { Button, Badge } from "@mantine/core";
import { IconPlayerPlay, IconLoader2 } from "@tabler/icons-react";

interface CompileButtonProps {
  onCompile: () => void;
  isCompiling: boolean;
  hasCompiledBefore: boolean;
  dirtyCount: number;
}

export function CompileButton({
  onCompile,
  isCompiling,
  hasCompiledBefore,
  dirtyCount,
}: CompileButtonProps) {
  const canCompile = !isCompiling && (!hasCompiledBefore || dirtyCount > 0);

  return (
    <Button
      onClick={onCompile}
      disabled={!canCompile}
      leftSection={isCompiling ? <IconLoader2 size={16} className="spin" /> : <IconPlayerPlay size={16} />}
      rightSection={
        dirtyCount > 0 ? (
          <Badge color="red" size="xs" variant="filled">
            {dirtyCount}
          </Badge>
        ) : undefined
      }
      color={isCompiling ? "gray" : "blue"}
    >
      {isCompiling ? "Compiling…" : hasCompiledBefore ? "Recompile" : "Compile"}
    </Button>
  );
}

```


## src/features/redaction/components/createDocumentDialog.tsx

```tsx
import { useState } from "react";
import { Button, Modal, Stack, TextInput, SegmentedControl, Text } from "@mantine/core";

const TEMPLATES = [
  { value: "default", label: "Default", description: "Plain article, minimal starter" },
  { value: "arxiv", label: "arXiv", description: "Preprint style with abstract" },
  { value: "ieee", label: "IEEE", description: "Conference paper (IEEEtran)" },
  { value: "acl", label: "ACL", description: "ACL conference/workshop style" },
];

interface CreateDocumentDialogProps {
  opened: boolean;
  onClose: () => void;
  onCreate: (title: string, template: string) => void;
  isCreating: boolean;
}

export function CreateDocumentDialog({
  opened,
  onClose,
  onCreate,
  isCreating,
}: CreateDocumentDialogProps) {
  const [title, setTitle] = useState("Untitled");
  const [template, setTemplate] = useState("default");

  const handleSubmit = () => {
    onCreate(title.trim() || "Untitled", template);
  };

  return (
    <Modal opened={opened} onClose={onClose} title="New document" centered>
      <Stack gap="md">
        <TextInput
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          data-autofocus
        />

        <Stack gap={4}>
          <Text size="sm" fw={500}>Template</Text>
          <SegmentedControl
            fullWidth
            value={template}
            onChange={setTemplate}
            data={TEMPLATES.map((t) => ({ value: t.value, label: t.label }))}
          />
          <Text size="xs" c="dimmed">
            {TEMPLATES.find((t) => t.value === template)?.description}
          </Text>
        </Stack>

        <Button onClick={handleSubmit} loading={isCreating} fullWidth>
          Create
        </Button>
      </Stack>
    </Modal>
  );
}

```


## src/features/redaction/components/cursorExtension.ts

```ts
import { StateField, StateEffect } from "@codemirror/state";
import { EditorView, Decoration, WidgetType, type DecorationSet } from "@codemirror/view";

export interface RemoteCursor {
  userId: string;
  name: string;
  color: string;
  pos: number; // character offset in the document
}

export const setRemoteCursors = StateEffect.define<RemoteCursor[]>();

export const remoteCursorsField = StateField.define<RemoteCursor[]>({
  create: () => [],
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setRemoteCursors)) {
        // Incoming positions are already current — no mapping needed.
        return effect.value;
      }
    }
    // On local edits, re-map existing remote cursor positions through the
    // change set so they don't drift out of place while you type above them.
    if (tr.docChanged) {
      return value.map((c) => ({ ...c, pos: tr.changes.mapPos(c.pos) }));
    }
    return value;
  },
});

class RemoteCursorWidget extends WidgetType {
  constructor(
    private name: string,
    private color: string
  ) {
    super();
  }

  eq(other: RemoteCursorWidget) {
    return other.name === this.name && other.color === this.color;
  }

  toDOM() {
    const wrap = document.createElement("span");
    wrap.className = "cm-remote-cursor";
    Object.assign(wrap.style, {
      position: "relative",
      display: "inline-block",
      width: "0",
      height: "1.2em",
      verticalAlign: "text-bottom",
      borderLeft: `2px solid ${this.color}`,
      marginLeft: "-1px",
      pointerEvents: "none",
    });

    const label = document.createElement("span");
    label.textContent = this.name;
    Object.assign(label.style, {
      position: "absolute",
      top: "-1.15em",
      left: "-2px",
      fontSize: "0.7em",
      lineHeight: "1.4",
      padding: "0 4px",
      borderRadius: "3px",
      whiteSpace: "nowrap",
      color: "#fff",
      background: this.color,
      pointerEvents: "none",
      userSelect: "none",
      zIndex: "10",
    });
    wrap.appendChild(label);
    return wrap;
  }

  ignoreEvent() {
    return true;
  }
}

function buildCursorDecorations(cursors: RemoteCursor[]): DecorationSet {
  if (!cursors.length) return Decoration.none;
  // Decoration.set requires ranges in ascending position order.
  const sorted = [...cursors].sort((a, b) => a.pos - b.pos);
  return Decoration.set(
    sorted.map((c) =>
      Decoration.widget({
        widget: new RemoteCursorWidget(c.name, c.color),
        side: 1,
      }).range(c.pos)
    )
  );
}

export const remoteCursorsPlugin = EditorView.decorations.compute(
  [remoteCursorsField],
  (state) => buildCursorDecorations(state.field(remoteCursorsField))
);

export const cursorExtension = [remoteCursorsField, remoteCursorsPlugin];

```


## src/features/redaction/components/documentHeader.tsx

```tsx
// redaction/components/documentHeader.tsx
import { Link } from "@tanstack/react-router";
import {
  Group,
  Text,
  TextInput,
  Loader,
  ActionIcon,
  Progress,
  Stack,
  Tooltip,
} from "@mantine/core";
import { IconArrowLeft, IconCheck, IconX } from "@tabler/icons-react";
import { AppShellHeaderPortal } from "#/shared/ui/app-shell/headerPortal";
import { CompileButton } from "./compileButton";
import { DocumentMenu } from "./documentMenu";
import type { CompilePhase } from "../hooks/useCompileDocument";

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
  onShareClick: () => void; // NEW
  role: string;             // NEW
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
  onShareClick, // NEW
  role,         // NEW
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

```


## src/features/redaction/components/documentMenu.tsx

```tsx
// redaction/components/documentMenu.tsx
import { Menu, ActionIcon, Badge, Text } from "@mantine/core";
import {
  IconDots,
  IconCopy,
  IconDownload,
  IconFileZip,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";

interface DocumentMenuProps {
  template: string;
  pdfUrl: string | null;
  onDuplicateClick: () => void;
  onShareClick: () => void;
  role: string; // "owner" | "writer" | "reader"
}

const TEMPLATE_LABELS: Record<string, string> = {
  default: "Default",
  arxiv: "arXiv",
  ieee: "IEEE",
  acl: "ACL",
};

export function DocumentMenu({ template, pdfUrl, onDuplicateClick, onShareClick, role }: DocumentMenuProps) {
  return (
    <Menu position="bottom-end" shadow="md" width={240}>
      <Menu.Target>
        <ActionIcon variant="subtle" size="sm" aria-label="Document options">
          <IconDots size={18} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>
          <Text size="xs" c="dimmed" span>Template</Text>{" "}
          <Badge size="xs" variant="light">
            {TEMPLATE_LABELS[template] ?? template}
          </Badge>
        </Menu.Label>

        {role === "owner" && (
          <Menu.Item leftSection={<IconUsers size={16} />} onClick={onShareClick}>
            Manage collaborators
          </Menu.Item>
        )}

        <Menu.Item
          leftSection={<IconDownload size={16} />}
          component="a"
          href={pdfUrl ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          disabled={!pdfUrl}
        >
          {pdfUrl ? "Download PDF" : "Download PDF (compile first)"}
        </Menu.Item>

        <Menu.Item leftSection={<IconFileZip size={16} />} disabled>
          Download source (.zip)
        </Menu.Item>

        <Menu.Item leftSection={<IconCopy size={16} />} onClick={onDuplicateClick}>
          Duplicate
        </Menu.Item>

        <Menu.Divider />

        <Menu.Item color="red" leftSection={<IconTrash size={16} />} disabled>
          Delete document
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

```


## src/features/redaction/components/documentsListPage.module.css

```css
.actionsCell {
  position: relative;
  overflow: hidden;
  padding-inline: 8px;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding-inline: 8px;

  transition: opacity 120ms ease;
  z-index: 900;
}

.actionsCell:hover .overlay {
  opacity: 1;
}

.row {
  cursor: pointer;
}

.actionsCell {
  position: relative;
  overflow: hidden;
  padding-inline: 6px;
  min-width: 120px; /* NEW */
}

```


## src/features/redaction/components/documentsListPage.tsx

```tsx
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useMediaQuery } from "@mantine/hooks";
import {
  ActionIcon,
  Indicator,
  Avatar,
  Badge,
  Box,
  Button,
  Group,
  Menu,
  Modal,
  Pagination,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconCopy,
  IconCrown,
  IconDotsVertical,
  IconDownload,
  IconFileText,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUsers,
  IconClock,
} from "@tabler/icons-react";
import { createDocument, deleteDocument, documentsQueryOptions, duplicateDocument } from "../api/redaction";
import { CreateDocumentDialog } from "./createDocumentDialog";
import { DuplicateDocumentDialog } from "./duplicateDocumentDialog";
import { CollaboratorsDialog } from "./collaboratorsDialog"; // NEW
import type { RedactionDocument } from "../types/redaction";
import classes from "./documentsListPage.module.css";

const TEMPLATE_LABELS: Record<string, string> = {
  default: "Default",
  arxiv: "arXiv",
  ieee: "IEEE",
  acl: "ACL",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const columnHelper = createColumnHelper<RedactionDocument>();

export function DocumentsListPage() {
  const { data: documents, isLoading } = useQuery(documentsQueryOptions());
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [dialogOpened, setDialogOpened] = useState(false);
  const [duplicateTarget, setDuplicateTarget] = useState<RedactionDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RedactionDocument | null>(null);
  const [collaboratorsTarget, setCollaboratorsTarget] = useState<RedactionDocument | null>(null); // NEW
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "updatedAt", desc: true }]);

  // Collapse the per-row action icons into a single "⋮" menu once the
  // viewport gets tight (matches the mantine-breakpoint-md var: 62em).
  const isCompact = useMediaQuery("(max-width: 62em)");

  const { mutate: createNew, isPending: isCreating } = useMutation({
    mutationFn: ({ title, template }: { title: string; template: string }) =>
      createDocument(title, template),
    onSuccess: (doc) => {
      setDialogOpened(false);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      navigate({ to: "/redaction/$documentId", params: { documentId: doc.id } });
    },
  });

  const { mutate: duplicate, isPending: isDuplicating } = useMutation({
    mutationFn: (opts: { template: string; title: string }) =>
      duplicateDocument(duplicateTarget!.id, opts),
    onSuccess: (newDoc) => {
      setDuplicateTarget(null);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      navigate({ to: "/redaction/$documentId", params: { documentId: newDoc.id } });
    },
  });

  const { mutate: remove, isPending: isDeleting } = useMutation({
    mutationFn: (documentId: string) => deleteDocument(documentId),
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const columns = useMemo(
    () => [
      columnHelper.accessor("title", {
        header: "Document Title / Subject",
        cell: (info) => {
          const doc = info.row.original;
          return (
            <Group gap="sm" wrap="nowrap">
              <IconFileText size={18} color="var(--mantine-color-gray-6)" />
              <Stack gap={2}>
                <Group gap={6} wrap="nowrap">
                  <Text fw={600} c="accent" size="sm">
                    {doc.title}
                  </Text>
                  {doc.role === "owner" && (
                    <Badge
                      size="xs"
                      color="accent"
                      variant="filled"
                      leftSection={<IconCrown size={10} />}
                    >
                      Owner
                    </Badge>
                  )}
                </Group>
                <Text ff="monospace" fz={11} c="dimmed">
                  {TEMPLATE_LABELS[doc.template] ?? doc.template} · {doc.files.length}{" "}
                  {doc.files.length === 1 ? "file" : "files"}
                </Text>
              </Stack>
            </Group>
          );
        },
      }),
      columnHelper.display({
        id: "collaborators",
        header: "Access",
        cell: (info) => {
          const doc = info.row.original;
          const others = doc.collaborators ?? [];

          if (others.length === 0) {
            return (
              <Text size="xs" c="dimmed" ta="center">
                Only you
              </Text>
            );
          }

          return (
            <Group gap={6} wrap="nowrap">
              {others.slice(0, 4).map((c) => (
                <Tooltip
                  key={c.id}
                  label={`${c.email} · ${c.role === "writer" ? "Can edit" : "Can view"}${
                    c.status === "pending" ? " (invitation pending)" : ""
                  }`}
                >
                  <Indicator
                    disabled={c.status !== "pending"}
                    size={14}
                    color="var(--color-warning)"
                    offset={3}
                    position="bottom-end"
                    label={<IconClock size={9} />}
                    styles={{ indicator: { padding: 0 } }}
                  >
                    <Avatar
                      radius="xl"
                      size={28}
                      color={c.status === "pending" ? "gray" : "accent"}
                      variant={c.status === "pending" ? "light" : "filled"}
                    >
                      {c.email.slice(0, 2).toUpperCase()}
                    </Avatar>
                  </Indicator>
                </Tooltip>
              ))}
              {others.length > 4 && (
                <Avatar radius="xl" size={28}>
                  +{others.length - 4}
                </Avatar>
              )}
            </Group>
          );
        },
        enableSorting: false,
      }),
      columnHelper.accessor("updatedAt", {
        header: "Last Modified",
        cell: (info) => (
          <Text ff="monospace" fz={12} c="dimmed">
            {formatDate(info.getValue())}
          </Text>
        ),
      }),
      columnHelper.accessor((row) => (row.pdfUrl ? "compiled" : "draft"), {
        id: "status",
        header: "Status",
        cell: (info) =>
          info.getValue() === "compiled" ? (
            <Badge variant="outline" color="accent" radius="sm" ff="monospace">
              Compiled
            </Badge>
          ) : (
            <Badge variant="outline" color="gray" radius="sm" ff="monospace">
              Draft
            </Badge>
          ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (info) => {
          const doc = info.row.original;

          // Narrow screens: collapse everything into a single menu button
          // so the column never has to squeeze 3-4 icons into a tiny cell.
          if (isCompact) {
            return (
              <Box
                h="100%"
                mih={40}
                style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <Menu shadow="md" width={190} position="bottom-end" withinPortal>
                  <Menu.Target>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconDotsVertical size={15} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
                    {doc.role === "owner" && (
                      <Menu.Item
                        leftSection={<IconUsers size={14} />}
                        onClick={() => setCollaboratorsTarget(doc)}
                      >
                        Share
                      </Menu.Item>
                    )}
                    <Menu.Item
                      leftSection={<IconCopy size={14} />}
                      onClick={() => setDuplicateTarget(doc)}
                    >
                      Duplicate
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconDownload size={14} />}
                      disabled={!doc.pdfUrl}
                      component="a"
                      href={doc.pdfUrl ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {doc.pdfUrl ? "Download PDF" : "Compile first"}
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                      leftSection={<IconTrash size={14} />}
                      color="red"
                      onClick={() => setDeleteTarget(doc)}
                    >
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Box>
            );
          }

          return (
            <Box className={classes.actionsCell} h="100%" mih={40}>
              <div className={classes.overlay}>
                {doc.role === "owner" && (
                  <Tooltip label="Share">
                    <ActionIcon
                      variant="subtle"
                      color="accent"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCollaboratorsTarget(doc);
                      }}
                    >
                      <IconUsers size={15} />
                    </ActionIcon>
                  </Tooltip>
                )}
                <Tooltip label="Duplicate">
                  <ActionIcon
                    variant="subtle"
                    color="accent"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDuplicateTarget(doc);
                    }}
                  >
                    <IconCopy size={15} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label={doc.pdfUrl ? "Download PDF" : "Compile first"}>
                  <ActionIcon
                    variant="subtle"
                    color="accent"
                    disabled={!doc.pdfUrl}
                    component="a"
                    href={doc.pdfUrl ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    styles={{
                      root: {
                        backgroundColor: "transparent",
                        "&[data-disabled]": {
                          backgroundColor: "transparent",
                          color: "var(--color-text-muted)",
                          opacity: 0.5,
                        },
                      },
                    }}
                  >
                    <IconDownload size={15} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Delete">
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(doc);
                    }}
                  >
                    <IconTrash size={15} />
                  </ActionIcon>
                </Tooltip>
              </div>
            </Box>
          );
        },
        enableSorting: false,
      }),
    ],
    [isCompact]
  );

  const table = useReactTable({
    data: documents ?? [],
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });

  const rows = table.getRowModel().rows;
  const pageCount = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;
  const total = documents?.length ?? 0;
  const from = total === 0 ? 0 : pageIndex * table.getState().pagination.pageSize + 1;
  const to = Math.min(from + table.getState().pagination.pageSize - 1, total);

  return (
    <Stack p={{ base: "md", sm: "xl" }} gap="lg">
      <Group justify="space-between" align="flex-end">
        <Stack gap={2}>
          <Text ff="monospace" fz={11} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.2em" }}>
            System Storage
          </Text>
          <Title order={2} c="accent">
            Your Library
          </Title>
        </Stack>
        <Button leftSection={<IconPlus size={15} />} onClick={() => setDialogOpened(true)}>
          New document
        </Button>
      </Group>

      <TextInput
        placeholder="Search documents…"
        leftSection={<IconSearch size={15} />}
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.currentTarget.value)}
        maw={360}
      />

      <Box
        style={{
          border: "1px solid var(--mantine-color-gray-3)",
          borderRadius: "var(--mantine-radius-md)",
          overflow: "hidden",
        }}
      >
        {/* Only the table itself scrolls horizontally — the footer below
            stays put so the pagination controls are always visible. */}
        <Box style={{ overflowX: "auto" }}>
          <Table
            withColumnBorders
            highlightOnHover
            verticalSpacing="md"
            horizontalSpacing="lg"
            miw={720}
            style={{ tableLayout: "fixed" }}
          >
            <Table.Thead bg="gray.0">
              {table.getHeaderGroups().map((headerGroup) => (
                <Table.Tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <Table.Th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      style={{
                        cursor: header.column.getCanSort() ? "pointer" : "default",
                        ...(header.id === "actions"
                          ? { width: isCompact ? 56 : 150, textAlign: "center" }
                          : {}),
                      }}
                    >
                      <Group gap={4} wrap="nowrap" justify={header.id === "actions" ? "center" : "flex-start"}>
                        <Text
                          ff="monospace"
                          fz={11}
                          fw={700}
                          tt="uppercase"
                          c="dimmed"
                          style={{ letterSpacing: "0.08em" }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </Text>
                        {header.column.getIsSorted() === "asc" && <IconChevronUp size={12} />}
                        {header.column.getIsSorted() === "desc" && <IconChevronDown size={12} />}
                      </Group>
                    </Table.Th>
                  ))}
                </Table.Tr>
              ))}
            </Table.Thead>
            <Table.Tbody>
              {rows.map((row) => (
                <Table.Tr
                  key={row.id}
                  className={classes.row}
                  onClick={() =>
                    navigate({ to: "/redaction/$documentId", params: { documentId: row.original.id } })
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <Table.Td
                      key={cell.id}
                      style={
                        cell.column.id === "actions" ? { width: isCompact ? 56 : 150 } : undefined
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))}
              {rows.length === 0 && !isLoading && (
                <Table.Tr>
                  <Table.Td colSpan={columns.length}>
                    <Text c="dimmed" ta="center" py="lg">
                      {globalFilter ? "No documents match your search." : "No documents yet — create one to get started."}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Box>

        <Group
          justify="space-between"
          p="md"
          bg="gray.0"
          wrap="wrap"
          gap="sm"
          style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}
        >
          <Text ff="monospace" fz={11} c="dimmed">
            {total === 0 ? "NO RESULTS" : `SHOWING ${from} TO ${to} OF ${total} RESULTS`}
          </Text>
          {pageCount > 1 && (
            <Pagination
              size="sm"
              total={pageCount}
              value={pageIndex + 1}
              onChange={(p) => table.setPageIndex(p - 1)}
            />
          )}
        </Group>
      </Box>

      <CreateDocumentDialog
        opened={dialogOpened}
        onClose={() => setDialogOpened(false)}
        onCreate={(title, template) => createNew({ title, template })}
        isCreating={isCreating}
      />

      <DuplicateDocumentDialog
        opened={!!duplicateTarget}
        onClose={() => setDuplicateTarget(null)}
        onDuplicate={(opts) => duplicate(opts)}
        isDuplicating={isDuplicating}
        sourceTitle={duplicateTarget?.title ?? ""}
        sourceTemplate={duplicateTarget?.template ?? "default"}
      />

      {/* NEW */}
      <CollaboratorsDialog
        opened={!!collaboratorsTarget}
        onClose={() => setCollaboratorsTarget(null)}
        documentId={collaboratorsTarget?.id ?? ""}
        collaborators={collaboratorsTarget?.collaborators ?? []}
      />

      <Modal opened={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete document" centered>
        <Stack>
          <Text size="sm">
            Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This can't be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button color="red" loading={isDeleting} onClick={() => deleteTarget && remove(deleteTarget.id)}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

```


## src/features/redaction/components/duplicateDocumentDialog.tsx

```tsx
import { useState } from "react";
import { Button, Modal, Stack, TextInput, SegmentedControl, Text } from "@mantine/core";

const TEMPLATES = [
  { value: "default", label: "Default", description: "Plain article, minimal starter" },
  { value: "arxiv", label: "arXiv", description: "Preprint style with abstract" },
  { value: "ieee", label: "IEEE", description: "Conference paper (IEEEtran)" },
  { value: "acl", label: "ACL", description: "ACL conference/workshop style" },
];

interface DuplicateDocumentDialogProps {
  opened: boolean;
  onClose: () => void;
  onDuplicate: (opts: { template: string; title: string }) => void;
  isDuplicating: boolean;
  sourceTitle: string;
  sourceTemplate: string;
}

export function DuplicateDocumentDialog({
  opened, onClose, onDuplicate, isDuplicating, sourceTitle, sourceTemplate,
}: DuplicateDocumentDialogProps) {
  const [title, setTitle] = useState(`${sourceTitle} (copy)`);
  const [template, setTemplate] = useState(sourceTemplate);

  return (
    <Modal opened={opened} onClose={onClose} title="Duplicate document" centered>
      <Stack gap="md">
        <TextInput label="Title" value={title} onChange={(e) => setTitle(e.currentTarget.value)} data-autofocus />
        <Stack gap={4}>
          <Text size="sm" fw={500}>Template</Text>
          <SegmentedControl
            fullWidth
            value={template}
            onChange={setTemplate}
            data={TEMPLATES.map((t) => ({ value: t.value, label: t.label }))}
          />
          <Text size="xs" c="dimmed">
            {TEMPLATES.find((t) => t.value === template)?.description}
          </Text>
        </Stack>
        <Button onClick={() => onDuplicate({ template, title: title.trim() || sourceTitle })} loading={isDuplicating} fullWidth>
          Duplicate
        </Button>
      </Stack>
    </Modal>
  );
}

```


## src/features/redaction/components/editor.tsx

```tsx
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { StreamLanguage, type LanguageSupport, type StreamParser } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { EditorView, type Extension } from "@codemirror/view";
import { useEffect, useMemo, useRef } from "react";
import { blameExtension, setLineAuthors } from "./blameExtension";
import { cursorExtension, setRemoteCursors, type RemoteCursor } from "./cursorExtension";
import type { LineAuthor } from "../types/redaction";

interface EditorProps {
  value: string;
  language: "latex" | "bibtex" | "log";
  onChange: (value: string) => void;
  lineAuthors?: LineAuthor[];
  remoteCursors?: RemoteCursor[];
  onCursorMove?: (pos: number) => void;
  readOnly?: boolean;
}

// Module-level, not per-render — StreamLanguage.define(...) only needs to
// run once ever, not once per keystroke.
const stexLanguage = StreamLanguage.define(stex as StreamParser<unknown>);

export function Editor({
  value,
  language,
  onChange,
  lineAuthors,
  remoteCursors,
  onCursorMove,
  readOnly,
}: EditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  useEffect(() => {
    editorRef.current?.view?.dispatch({ effects: setLineAuthors.of(lineAuthors ?? []) });
  }, [lineAuthors]);

  useEffect(() => {
    editorRef.current?.view?.dispatch({ effects: setRemoteCursors.of(remoteCursors ?? []) });
  }, [remoteCursors]);

  // Stable across re-renders — only recreated if onCursorMove's identity
  // actually changes (it shouldn't, if the caller wraps it in useCallback).
  const cursorReporter = useMemo(
    () =>
      EditorView.updateListener.of((update) => {
        if (update.selectionSet && onCursorMove) {
          onCursorMove(update.state.selection.main.head);
        }
      }),
    [onCursorMove]
  );

  // THE FIX: this used to be an inline array literal rebuilt every render,
  // which made @uiw/react-codemirror treat every render as "extensions
  // changed" and fully reconfigure the EditorState — wiping StateFields
  // like remoteCursorsField and lineAuthorsField back to their initial
  // value. Memoizing it means the editor only actually reconfigures when
  // language or the cursor listener genuinely changes, not on every
  // document refetch / unrelated parent re-render.
  const extensions: Extension[] = useMemo(
    () => [stexLanguage, blameExtension, cursorExtension, cursorReporter],
    [cursorReporter]
  );

  return (
    <CodeMirror
      ref={editorRef}
      value={value}
      height="100%"
      editable={!readOnly}
      extensions={extensions}
      onChange={onChange}
      style={{ height: "100%" }}
    />
  );
}

```


## src/features/redaction/components/fileTabs.tsx

```tsx
import { Tabs, Group, Avatar, Tooltip } from "@mantine/core";  // CHANGED: added Avatar, Tooltip
import { IconFileText, IconAlertTriangle } from "@tabler/icons-react";
import type { ProjectFile } from "../types/redaction";

export const PREVIEW_TAB_ID = "__preview__";
export const LOG_TAB_ID = "__log__";

interface FileTabsProps {
  files: ProjectFile[];
  activeTabId: string;
  onSelect: (id: string) => void;
  hasLog?: boolean;
  presenceByFile?: Record<string, { connectionId: number; name?: string; email?: string }[]>; // NEW
}

// NEW
const AVATAR_COLORS = ["blue", "grape", "teal", "orange", "pink", "indigo"];
function colorFor(key: string) {
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}
function initials(label: string) {
  return label.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

// NEW
function PresenceStack({ users }: { users?: { connectionId: number; name?: string; email?: string }[] }) {
  if (!users?.length) return null;
  return (
    <Avatar.Group spacing={4} ml={6}>
      {users.slice(0, 3).map((u) => {
        const label = u.name ?? u.email ?? "?";
        return (
          <Tooltip key={u.connectionId} label={label}>
            <Avatar size={18} radius="xl" color={colorFor(u.email ?? label)}>
              {initials(label)}
            </Avatar>
          </Tooltip>
        );
      })}
    </Avatar.Group>
  );
}

export function FileTabs({ files, activeTabId, onSelect, hasLog, presenceByFile }: FileTabsProps) {
  return (
    <Tabs value={activeTabId} onChange={(id) => id && onSelect(id)}>
      <Tabs.List>
        {files.map((f) => (
          <Tabs.Tab key={f.id} value={f.id}>
            <Group gap={0} wrap="nowrap">
              {f.name}
              <PresenceStack users={presenceByFile?.[f.id]} />
            </Group>
          </Tabs.Tab>
        ))}
        {hasLog && (
          <Tabs.Tab value={LOG_TAB_ID} color="red" leftSection={<IconAlertTriangle size={14} />}>
            Compile Log
          </Tabs.Tab>
        )}
        <Tabs.Tab
          value={PREVIEW_TAB_ID}
          ml="auto"
          leftSection={<IconFileText size={14} />}
          color="violet"
        >
          Preview
        </Tabs.Tab>
      </Tabs.List>
    </Tabs>
  );
}

```


## src/features/redaction/components/invitationsBell.tsx

```tsx
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

```


## src/features/redaction/components/pdfPreview.tsx

```tsx
interface PdfPreviewProps {
  pdfUrl: string | null;
}

export function PdfPreview({ pdfUrl }: PdfPreviewProps) {
  if (!pdfUrl) {
    return (
      <div style={{ padding: "12px", color: "#888" }}>
        No preview yet — compile to see the PDF.
      </div>
    );
  }

  return (
    <iframe
      key={pdfUrl}
      src={pdfUrl}
      title="PDF Preview"
      style={{
        width: "100%",
        height: "100%",
        minHeight: "100%",
        border: "none",
        display: "block",
      }}
    />
  );
}

```


## src/features/redaction/components/redactionPage.tsx

```tsx
import { useCallback,  useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Editor } from "./editor";
import { PdfPreview } from "./pdfPreview";
import { FileTabs, LOG_TAB_ID, PREVIEW_TAB_ID } from "./fileTabs";
import { DocumentHeader } from "./documentHeader";
import { DuplicateDocumentDialog } from "./duplicateDocumentDialog";
import { CollaboratorsDialog } from "./collaboratorsDialog";
import { useCompileDocument } from "../hooks/useCompileDocument";
import { useUpdateDocumentTitle } from "../hooks/useUpdateDocumentTitle";
import { useDocumentSocket } from "../hooks/useDocumentSocket";
import { documentQueryOptions, duplicateDocument } from "../api/redaction";
import { useRedactionStore } from "../store/redactionStore";
import { useCurrentUser } from "#/features/auth";

interface RedactionPageProps {
  documentId: string;
}

const CURSOR_THROTTLE_MS = 80;

export function RedactionPage({ documentId }: RedactionPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Query Backend State
  const { data: document } = useQuery(documentQueryOptions(documentId));

  // Store State & Actions
  const activeTabId = useRedactionStore(
    (state) => state.activeTabs[documentId] ?? document?.files[0]?.id ?? ""
  );
  const activeFileId = useRedactionStore(
    (state) => state.activeFiles[documentId] ?? document?.files[0]?.id ?? null
  );
  const dialogState = useRedactionStore((state) => state.dialogs[documentId]);
  const dirtyCount = useRedactionStore((state) => state.dirtyFiles[documentId]?.size ?? 0);

  const setActiveTab = useRedactionStore((state) => state.setActiveTab);
  const setActiveFileId = useRedactionStore((state) => state.setActiveFile);
  const setDialog = useRedactionStore((state) => state.setDialog);
  const markFileDirty = useRedactionStore((state) => state.markFileDirty);

  const { data: currentUser } = useCurrentUser();

  // Live sockets & refresh trigger
  const {
    presenceByFile,
    remoteCursorsByFile,
    setActiveFile: setSocketActiveFile,
    sendCursor,
  } = useDocumentSocket(documentId, currentUser?.id, (event) => {
    if (event.phase) {
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
    }
  });

  const {
    compile,
    phase: compilePhase,
    progress: compileProgress,
    message: compileMessage,
    pdfUrl,
    error: compileError,
    log: compileLog,
  } = useCompileDocument(documentId, document?.pdfUrl ?? null);

  const { mutate: saveTitle, isPending: isSavingTitle } = useUpdateDocumentTitle(documentId);

  const { mutate: duplicate, isPending: isDuplicating } = useMutation({
    mutationFn: (opts: { template: string; title: string }) =>
      duplicateDocument(documentId, opts),
    onSuccess: (newDoc) => {
      setDialog(documentId, "duplicate", false);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      navigate({ to: "/redaction/$documentId", params: { documentId: newDoc.id } });
    },
  });

  const files = document?.files ?? [];
  const currentTabId = activeTabId || activeFileId || files[0]?.id || "";
  const activeFile = files.find((f) => f.id === currentTabId || f.id === activeFileId);

  // Throttled cursor sender — recreated only when the target file changes,
  // so rapid selection events within a file share one throttle window
  // instead of resetting it on every keystroke.
  const lastSentRef = useRef(0);
  const pendingRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCursorMove = useCallback(
    (pos: number) => {
      if (!currentTabId || currentTabId === PREVIEW_TAB_ID || currentTabId === LOG_TAB_ID) return;

      const now = Date.now();
      const elapsed = now - lastSentRef.current;

      if (elapsed >= CURSOR_THROTTLE_MS) {
        lastSentRef.current = now;
        sendCursor(currentTabId, pos);
      } else {
        pendingRef.current = pos;
        if (!timerRef.current) {
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            if (pendingRef.current !== null) {
              lastSentRef.current = Date.now();
              sendCursor(currentTabId, pendingRef.current);
              pendingRef.current = null;
            }
          }, CURSOR_THROTTLE_MS - elapsed);
        }
      }
    },
    [currentTabId, sendCursor]
  );

  if (!document) return null;

  const updateActiveFileContent = (content: string) => {
    const fileId = activeFileId ?? files[0]?.id;
    if (fileId) markFileDirty(documentId, fileId);

    queryClient.setQueryData(documentQueryOptions(documentId).queryKey, (oldData) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        files: oldData.files.map((f) =>
          f.id === (activeFileId ?? files[0]?.id) ? { ...f, content } : f
        ),
      };
    });
  };

  const handleSelectTab = (id: string) => {
    setActiveTab(documentId, id);
    if (id !== PREVIEW_TAB_ID && id !== LOG_TAB_ID) {
      setActiveFileId(documentId, id);
      setSocketActiveFile(id);
    }
  };

  const hasLog = compilePhase === "error" && !!compileLog;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <DocumentHeader
        title={document.title}
        onTitleSave={saveTitle}
        isSavingTitle={isSavingTitle}
        onCompile={() => compile(files)}
        compilePhase={compilePhase}
        compileProgress={compileProgress}
        compileMessage={compileMessage}
        compileError={compileError}
        compileLog={compileLog}
        template={document.template}
        pdfUrl={pdfUrl}
        dirtyCount={dirtyCount}
        onDuplicateClick={() => setDialog(documentId, "duplicate", true)}
        onShareClick={() => setDialog(documentId, "collaborators", true)}
        role={document.role}
      />

      <FileTabs
        files={files}
        activeTabId={currentTabId}
        onSelect={handleSelectTab}
        hasLog={hasLog}
        presenceByFile={presenceByFile}
      />

      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {currentTabId === PREVIEW_TAB_ID ? (
          <PdfPreview pdfUrl={pdfUrl} />
        ) : currentTabId === LOG_TAB_ID && compileLog ? (
          <Editor value={compileLog} language="log" onChange={() => {}} readOnly />
        ) : activeFile ? (
          <Editor
            value={activeFile.content}
            language={activeFile.language}
            onChange={updateActiveFileContent}
            lineAuthors={activeFile.lineAuthors}
            remoteCursors={remoteCursorsByFile[currentTabId]}
            onCursorMove={handleCursorMove}
          />
        ) : null}
      </div>

      <DuplicateDocumentDialog
        opened={!!dialogState?.duplicate}
        onClose={() => setDialog(documentId, "duplicate", false)}
        onDuplicate={(opts) => duplicate(opts)}
        isDuplicating={isDuplicating}
        sourceTitle={document.title}
        sourceTemplate={document.template}
      />

      <CollaboratorsDialog
        opened={!!dialogState?.collaborators}
        onClose={() => setDialog(documentId, "collaborators", false)}
        documentId={documentId}
      />
    </div>
  );
}

```


## src/features/redaction/hooks/useCollaborators.ts

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  inviteCollaborator,
  updateCollaboratorRole,
  removeCollaborator,
  getPendingInvitations,
  acceptInvitation,
  declineInvitation,
} from "../api/redaction";
import type { CollaboratorRole, Collaborator, RedactionDocument } from "../types/redaction";

const docKey = (documentId: string) => ["document", documentId] as const;

export function useInviteCollaborator(documentId: string) {
  const queryClient = useQueryClient();
  const key = docKey(documentId);

  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: CollaboratorRole }) =>
      inviteCollaborator(documentId, email, role),

    onMutate: async ({ email, role }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<RedactionDocument>(key);

      const optimisticCollaborator: Collaborator = {
        id: `optimistic-${Date.now()}`,
        userId: "",
        email,
        role,
        status: "pending",
      };

      queryClient.setQueryData<RedactionDocument>(key, (old) =>
        old ? { ...old, collaborators: [...old.collaborators, optimisticCollaborator] } : old
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useUpdateCollaboratorRole(documentId: string) {
  const queryClient = useQueryClient();
  const key = docKey(documentId);

  return useMutation({
    mutationFn: ({ collaboratorId, role }: { collaboratorId: string; role: CollaboratorRole }) =>
      updateCollaboratorRole(documentId, collaboratorId, role),

    onMutate: async ({ collaboratorId, role }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<RedactionDocument>(key);

      queryClient.setQueryData<RedactionDocument>(key, (old) =>
        old
          ? {
              ...old,
              collaborators: old.collaborators.map((c) =>
                c.id === collaboratorId ? { ...c, role } : c
              ),
            }
          : old
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useRemoveCollaborator(documentId: string) {
  const queryClient = useQueryClient();
  const key = docKey(documentId);

  return useMutation({
    mutationFn: (collaboratorId: string) => removeCollaborator(documentId, collaboratorId),

    onMutate: async (collaboratorId) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<RedactionDocument>(key);

      queryClient.setQueryData<RedactionDocument>(key, (old) =>
        old
          ? { ...old, collaborators: old.collaborators.filter((c) => c.id !== collaboratorId) }
          : old
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function usePendingInvitations() {
  return useQuery({
    queryKey: ["invitations"],
    queryFn: getPendingInvitations,
    refetchInterval: 30_000,
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useDeclineInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: declineInvitation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invitations"] }),
  });
}

```


## src/features/redaction/hooks/useCompileDocument.ts

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { startCompileJob, pollCompileStatus } from "../api/redaction";
import type { ProjectFile } from "../types/redaction";
import { useRedactionStore } from "../store/redactionStore";
import { LOG_TAB_ID, PREVIEW_TAB_ID } from "../components/fileTabs";

export type CompilePhase = "idle" | "saving" | "queued" | "running" | "done" | "error";

export interface CompileState {
  phase: CompilePhase;
  progress: number;
  message: string;
  pdfUrl: string | null;
  error: string | null;
  log: string | null;
}

function toPublicUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${import.meta.env.VITE_API_URL ?? ""}${path}`;
}

function addCacheBuster(url: string, key: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${key}`;
}

export function useCompileDocument(
  documentId: string,
  initialPdfUrl: string | null,
  liveRefreshKey: number = 0
) {
  const queryClient = useQueryClient();
  const setActiveTab = useRedactionStore((state) => state.setActiveTab);

  const [jobId, setJobId] = useState<string | null>(null);
  const [pdfCacheKey] = useState(() => `${Date.now()}`);

  const startMutation = useMutation({
    mutationFn: (files: ProjectFile[]) => startCompileJob(documentId, files),
    onSuccess: (data) => {
      setJobId(data.jobId);
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
    },
  });

  const pollQuery = useQuery({
    queryKey: ["compile-job", jobId],
    queryFn: () => pollCompileStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;

      // Handle side-effects cleanly inside the query callback when the job finishes
      if (data?.status === "done" && jobId) {
        setActiveTab(documentId, PREVIEW_TAB_ID);
        useRedactionStore.getState().clearDirty(documentId);
        setJobId(null);
        return false;
      }

      if (data?.status === "error" && jobId) {
        if (data.log) {
          setActiveTab(documentId, LOG_TAB_ID);
        }
        setJobId(null);
        return false;
      }

      return 800;
    },
  });

  const getPhase = (): CompilePhase => {
    if (startMutation.isPending) return "saving";
    if (!pollQuery.data) {
      if (jobId) return "queued";
      return initialPdfUrl ? "done" : "idle";
    }
    if (pollQuery.data.status === "done") return "done";
    if (pollQuery.data.status === "error") return "error";
    if (pollQuery.data.status === "running") return "running";
    return "queued";
  };

  const phase = getPhase();
  const progress = pollQuery.data?.percent ?? (startMutation.isPending ? 5 : 0);
  const message = pollQuery.data?.message ?? (startMutation.isPending ? "Saving files..." : "Ready");

  const pdfUrl = pollQuery.data?.result?.pdf_url
    ? addCacheBuster(toPublicUrl(pollQuery.data.result.pdf_url), jobId ?? pdfCacheKey)
    : !jobId && initialPdfUrl
    ? addCacheBuster(initialPdfUrl, `${pdfCacheKey}-${liveRefreshKey}`)
    : null;

  const error =
    pollQuery.data?.status === "error"
      ? pollQuery.data.error ?? "Compilation failed"
      : startMutation.isError
      ? (startMutation.error as Error)?.message ?? "Failed to start compilation"
      : null;

  const log = pollQuery.data?.log ?? pollQuery.data?.result?.log ?? null;

  const isActive = phase === "saving" || phase === "queued" || phase === "running";
  const isDone = phase === "done";
  const isError = phase === "error";

  const compile = (files: ProjectFile[]) => {
    setJobId(null);
    queryClient.removeQueries({ queryKey: ["compile-job"] });
    startMutation.mutate(files);
  };

  return {
    compile,
    phase,
    progress,
    message,
    pdfUrl,
    error,
    log,
    isActive,
    isDone,
    isError,
    jobId,
    pollData: pollQuery.data,
  };
}

```


## src/features/redaction/hooks/useDocumentSocket.ts

```ts
import { useEffect, useRef, useState } from "react";
import type { RemoteCursor } from "../components/cursorExtension";

interface PresenceUser {
  fileId: string;
  name: string;
  email: string;
  lastSeen: number;
}

interface CursorUser {
  fileId: string;
  name: string;
  email: string;
  pos: number;
  lastSeen: number;
}

const PRESENCE_INTERVAL_MS = 4000;
const STALE_AFTER_MS = 12000;
const CURSOR_STALE_AFTER_MS = 8000;

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 15000;

const AVATAR_COLORS = ["#4dabf7", "#9775fa", "#20c997", "#ff922b", "#f06595", "#748ffc"];
function colorFor(key: string) {
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

function resolveWsBase(): string {
  const httpBase = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
  return httpBase.replace(/^http/, "ws");
}

function buildPresenceMap(users: Map<string, PresenceUser>) {
  const map: Record<string, { connectionId: string; name: string; email: string }[]> = {};
  for (const [userId, u] of users) {
    (map[u.fileId] ??= []).push({ connectionId: userId, name: u.name, email: u.email });
  }
  return map;
}

function buildCursorMap(cursors: Map<string, CursorUser>, selfUserId: string | null) {
  const map: Record<string, RemoteCursor[]> = {};
  for (const [userId, c] of cursors) {
    if (userId === selfUserId) continue;
    (map[c.fileId] ??= []).push({
      userId,
      name: c.name,
      color: colorFor(c.email ?? userId),
      pos: c.pos,
    });
  }
  return map;
}

export type ConnectionStatus = "connecting" | "open" | "reconnecting" | "closed";

export function useDocumentSocket(documentId: string, onCompileUpdate: (event: any) => void) {
  const [presenceByFile, setPresenceByFile] = useState<Record<string, any[]>>({});
  const [remoteCursorsByFile, setRemoteCursorsByFile] = useState<Record<string, RemoteCursor[]>>({});
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");

  const wsRef = useRef<WebSocket | null>(null);
  const activeFileRef = useRef<string | null>(null);
  const usersRef = useRef<Map<string, PresenceUser>>(new Map());
  const cursorsRef = useRef<Map<string, CursorUser>>(new Map());
  const selfUserIdRef = useRef<string | null>(null);

  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  const onCompileUpdateRef = useRef(onCompileUpdate);
  onCompileUpdateRef.current = onCompileUpdate;

  useEffect(() => {
    unmountedRef.current = false;

    const heartbeat = setInterval(() => {
      const socket = wsRef.current;
      if (socket?.readyState === WebSocket.OPEN && activeFileRef.current) {
        socket.send(JSON.stringify({ type: "presence", fileId: activeFileRef.current }));
      }
    }, PRESENCE_INTERVAL_MS);

    const sweep = setInterval(() => {
      const now = Date.now();
      let presenceChanged = false;
      for (const [userId, u] of usersRef.current) {
        if (now - u.lastSeen > STALE_AFTER_MS) {
          usersRef.current.delete(userId);
          presenceChanged = true;
        }
      }
      if (presenceChanged) setPresenceByFile(buildPresenceMap(usersRef.current));

      let cursorsChanged = false;
      for (const [userId, c] of cursorsRef.current) {
        if (now - c.lastSeen > CURSOR_STALE_AFTER_MS) {
          cursorsRef.current.delete(userId);
          cursorsChanged = true;
        }
      }
      if (cursorsChanged) {
        setRemoteCursorsByFile(buildCursorMap(cursorsRef.current, selfUserIdRef.current));
      }
    }, 3000);

    function connect() {
      if (unmountedRef.current) return;

      const url = `${resolveWsBase()}/api/texademia/ws/documents/${documentId}`;
      console.log("[ws] connecting to", url, "attempt", reconnectAttemptRef.current);
      setConnectionStatus(reconnectAttemptRef.current === 0 ? "connecting" : "reconnecting");

      const socket = new WebSocket(url);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log("[ws] open");
        reconnectAttemptRef.current = 0;
        setConnectionStatus("open");

        // Rejoin state that lived only in memory: tell the server (and thus
        // other collaborators) which file we're on again, since a stale
        // connection means everyone else's view of us just went silent.
        if (activeFileRef.current) {
          socket.send(JSON.stringify({ type: "presence", fileId: activeFileRef.current }));
        }
      };

      socket.onclose = (e) => {
        console.log("[ws] closed", e.code, e.reason);
        if (unmountedRef.current) return;

        setConnectionStatus("reconnecting");

        // Stale presence/cursors from before the drop are misleading once
        // we're disconnected — clear them rather than show frozen ghosts.
        usersRef.current.clear();
        cursorsRef.current.clear();
        setPresenceByFile({});
        setRemoteCursorsByFile({});

        const attempt = reconnectAttemptRef.current;
        const delay = Math.min(
          RECONNECT_BASE_DELAY_MS * 2 ** attempt,
          RECONNECT_MAX_DELAY_MS
        );
        reconnectAttemptRef.current = attempt + 1;

        console.log(`[ws] reconnecting in ${delay}ms`);
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      socket.onerror = (e) => {
        console.log("[ws] error", e);
        // onclose fires right after onerror for a failed connection —
        // no separate reconnect scheduling needed here.
      };

      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data);

        if (payload.type === "presence") {
          selfUserIdRef.current = selfUserIdRef.current; // unchanged, see note below
          usersRef.current.set(payload.userId, {
            fileId: payload.fileId,
            name: payload.name,
            email: payload.email,
            lastSeen: Date.now(),
          });
          setPresenceByFile(buildPresenceMap(usersRef.current));
        } else if (payload.type === "cursor") {
          cursorsRef.current.set(payload.userId, {
            fileId: payload.fileId,
            name: payload.name,
            email: payload.email,
            pos: payload.pos,
            lastSeen: Date.now(),
          });
          setRemoteCursorsByFile(buildCursorMap(cursorsRef.current, selfUserIdRef.current));
        } else if (payload.type === "ping") {
          socket.send(JSON.stringify({ type: "pong" }));
        } else if (payload.type === "compile:update") {
          onCompileUpdateRef.current(payload);
        }
      };
    }

    connect();

    return () => {
      unmountedRef.current = true;
      clearInterval(heartbeat);
      clearInterval(sweep);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [documentId]);

  const setActiveFile = (fileId: string) => {
    activeFileRef.current = fileId;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "presence", fileId }));
    }
  };

  const sendCursor = (fileId: string, pos: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "cursor", fileId, pos }));
    }
  };

  return { presenceByFile, remoteCursorsByFile, connectionStatus, setActiveFile, sendCursor };
}

```


## src/features/redaction/hooks/useDocuments.ts

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createDocument, deleteDocument, getDocument } from "../api/redaction";

export function useDocument(documentId: string | null) {
  return useQuery({
    queryKey: ["document", documentId],
    queryFn: () => getDocument(documentId!),
    enabled: !!documentId,
  });
}

export function useCreateDocument() {
  return useMutation({
    mutationFn: ({ title, template }: { title: string; template: string }) =>
      createDocument(title, template),
  });
}

// NEW
export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

```


## src/features/redaction/hooks/useUpdateDocumentTitle.ts

```ts
// redaction/hooks/useUpdateDocumentTitle.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateDocumentTitle } from "../api/redaction";

export function useUpdateDocumentTitle(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => updateDocumentTitle(documentId, title),
    onSuccess: (updated) => {
      queryClient.setQueryData(["document", documentId], updated);
      queryClient.invalidateQueries({ queryKey: ["documents"] }); // list page shows new title too
    },
  });
}

```


## src/features/redaction/index.ts

```ts
// redaction/index.ts
export { RedactionPage } from "./components/redactionPage";
export { DocumentsListPage } from "./components/documentsListPage";
export { InvitationsBell } from "./components/invitationsBell"; // NEW
export {
  createDocument,
  deleteDocument,
  documentQueryOptions,
  documentsQueryOptions,
  startCompileJob,
  pollCompileStatus,
  type CompileJobResponse,
  type CompilePollResponse,
} from "./api/redaction";

```


## src/features/redaction/store/editorStore.ts

```ts
import { create } from "zustand";
import type { ProjectFile } from "../types/redaction";

interface EditorState {
  documentId: string | null;
  files: ProjectFile[];
  activeFileId: string | null;
  loadDocument: (documentId: string, files: ProjectFile[]) => void;
  setActiveFileId: (id: string) => void;
  updateActiveFileContent: (content: string) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  documentId: null,
  files: [],
  activeFileId: null,
  loadDocument: (documentId, files) =>
    set({
      documentId,
      files,
      activeFileId: files[0]?.id ?? null,
    }),
  setActiveFileId: (id) => set({ activeFileId: id }),
  updateActiveFileContent: (content) => {
    const { activeFileId, files } = get();
    set({
      files: files.map((f) => (f.id === activeFileId ? { ...f, content } : f)),
    });
  },
}));

```


## src/features/redaction/store/headerStore.ts

```ts
import { create } from "zustand";
import type { ProjectFile } from "../types/redaction";

interface HeaderState {
  documentId: string | null;
  files: ProjectFile[];
  activeFileId: string | null;
  loadDocument: (documentId: string, files: ProjectFile[]) => void;
  setActiveFileId: (id: string) => void;
  updateActiveFileContent: (content: string) => void;
}

export const useHeaderStore = create<HeaderState>((set, get) => ({
  documentId: null,
  files: [],
  activeFileId: null,
  loadDocument: (documentId, files) =>
    set({
      documentId,
      files,
      activeFileId: files[0]?.id ?? null,
    }),
  setActiveFileId: (id) => set({ activeFileId: id }),
  updateActiveFileContent: (content) => {
    const { activeFileId, files } = get();
    set({
      files: files.map((f) => (f.id === activeFileId ? { ...f, content } : f)),
    });
  },
}));

```


## src/features/redaction/store/redactionStore.ts

```ts
// src/features/redaction/store/redactionStore.ts
import { create } from "zustand";

interface RedactionUIStore {
  activeTabs: Record<string, string>;
  activeFiles: Record<string, string>;
  dialogs: Record<string, { duplicate?: boolean; collaborators?: boolean }>;
  dirtyFiles: Record<string, Set<string>>;

  setActiveTab: (documentId: string, tabId: string) => void;
  setActiveFile: (documentId: string, fileId: string) => void;
  setDialog: (documentId: string, dialog: "duplicate" | "collaborators", open: boolean) => void;
  markFileDirty: (documentId: string, fileId: string) => void;
  clearDirty: (documentId: string) => void;
}

export const useRedactionStore = create<RedactionUIStore>((set) => ({
  activeTabs: {},
  activeFiles: {},
  dialogs: {},
  dirtyFiles: {},

  // Actual function implementations (comma-separated, no type signatures here)
  setActiveTab: (documentId, tabId) =>
    set((state) => ({
      activeTabs: { ...state.activeTabs, [documentId]: tabId },
    })),

  setActiveFile: (documentId, fileId) =>
    set((state) => ({
      activeFiles: { ...state.activeFiles, [documentId]: fileId },
    })),

  setDialog: (documentId, dialog, open) =>
    set((state) => ({
      dialogs: {
        ...state.dialogs,
        [documentId]: { ...state.dialogs[documentId], [dialog]: open },
      },
    })),

  markFileDirty: (documentId, fileId) =>
    set((state) => {
      const current = state.dirtyFiles[documentId] ?? new Set<string>();
      if (current.has(fileId)) return state;
      const next = new Set(current);
      next.add(fileId);
      return { dirtyFiles: { ...state.dirtyFiles, [documentId]: next } };
    }),

  clearDirty: (documentId) =>
    set((state) => ({
      dirtyFiles: { ...state.dirtyFiles, [documentId]: new Set() },
    })),
}));

```


## src/features/redaction/types/redaction.ts

```ts
export interface LineAuthor {
  author: string;
  editedAt: string;
}


export interface ProjectFile {
  id: string;
  name: string;
  language: "latex" | "bibtex" | "log";
  content: string;
  lineAuthors?: LineAuthor[];
}

export interface RedactionDocument {
  id: string;
  title: string;
  template: string;
  files: ProjectFile[];
  pdfUrl: string | null;
  createdAt: string; // NEW
  updatedAt: string;
}

// CompileResponse is no longer used directly — kept for compatibility
export interface CompileResponse {
  pdfUrl: string;
}

export interface CompileError {
  message: string;
  log?: string;
}

export type CollaboratorRole = "reader" | "writer";

export interface Collaborator {
  id: string;
  userId: string;
  email: string;
  role: CollaboratorRole;
  status: "pending" | "accepted";
}

export interface RedactionDocument {
  id: string;
  title: string;
  template: string;
  files: ProjectFile[];
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
  role: "owner" | CollaboratorRole;
  collaborators: Collaborator[];
}

export interface Invitation {
  id: string;
  documentId: string;
  documentTitle: string;
  role: CollaboratorRole;
  invitedByEmail: string;
}

```


## src/integrations/tanstack-query/devtools.tsx

```tsx
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'

export default {
  name: 'Tanstack Query',
  render: <ReactQueryDevtoolsPanel />,
}

```


## src/integrations/tanstack-query/root-provider.tsx

```tsx
import { QueryClient } from '@tanstack/react-query'

export function getContext() {
  const queryClient = new QueryClient()

  return {
    queryClient,
  }
}
export default function TanstackQueryProvider() {}

```


## src/routeTree.gen.ts

```ts
/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

import { Route as rootRouteImport } from './routes/__root'
import { Route as IndexRouteImport } from './routes/index'
import { Route as LoginRouteImport } from './routes/login'
import { Route as ProfileRouteImport } from './routes/profile'
import { Route as RegisterRouteImport } from './routes/register'
import { Route as RedactionIndexRouteImport } from './routes/redaction.index'
import { Route as RedactionDocumentIdRouteImport } from './routes/redaction.$documentId'

const IndexRoute = IndexRouteImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRouteImport,
} as any)
const LoginRoute = LoginRouteImport.update({
  id: '/login',
  path: '/login',
  getParentRoute: () => rootRouteImport,
} as any)
const ProfileRoute = ProfileRouteImport.update({
  id: '/profile',
  path: '/profile',
  getParentRoute: () => rootRouteImport,
} as any)
const RegisterRoute = RegisterRouteImport.update({
  id: '/register',
  path: '/register',
  getParentRoute: () => rootRouteImport,
} as any)
const RedactionIndexRoute = RedactionIndexRouteImport.update({
  id: '/redaction/',
  path: '/redaction/',
  getParentRoute: () => rootRouteImport,
} as any)
const RedactionDocumentIdRoute = RedactionDocumentIdRouteImport.update({
  id: '/redaction/$documentId',
  path: '/redaction/$documentId',
  getParentRoute: () => rootRouteImport,
} as any)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/login': typeof LoginRoute
  '/profile': typeof ProfileRoute
  '/register': typeof RegisterRoute
  '/redaction/$documentId': typeof RedactionDocumentIdRoute
  '/redaction/': typeof RedactionIndexRoute
}
export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/login': typeof LoginRoute
  '/profile': typeof ProfileRoute
  '/register': typeof RegisterRoute
  '/redaction/$documentId': typeof RedactionDocumentIdRoute
  '/redaction': typeof RedactionIndexRoute
}
export interface FileRoutesById {
  __root__: typeof rootRouteImport
  '/': typeof IndexRoute
  '/login': typeof LoginRoute
  '/profile': typeof ProfileRoute
  '/register': typeof RegisterRoute
  '/redaction/$documentId': typeof RedactionDocumentIdRoute
  '/redaction/': typeof RedactionIndexRoute
}
export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths:
    | '/'
    | '/login'
    | '/profile'
    | '/register'
    | '/redaction/$documentId'
    | '/redaction/'
  fileRoutesByTo: FileRoutesByTo
  to:
    | '/'
    | '/login'
    | '/profile'
    | '/register'
    | '/redaction/$documentId'
    | '/redaction'
  id:
    | '__root__'
    | '/'
    | '/login'
    | '/profile'
    | '/register'
    | '/redaction/$documentId'
    | '/redaction/'
  fileRoutesById: FileRoutesById
}
export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  LoginRoute: typeof LoginRoute
  ProfileRoute: typeof ProfileRoute
  RegisterRoute: typeof RegisterRoute
  RedactionDocumentIdRoute: typeof RedactionDocumentIdRoute
  RedactionIndexRoute: typeof RedactionIndexRoute
}

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/login': {
      id: '/login'
      path: '/login'
      fullPath: '/login'
      preLoaderRoute: typeof LoginRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/profile': {
      id: '/profile'
      path: '/profile'
      fullPath: '/profile'
      preLoaderRoute: typeof ProfileRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/register': {
      id: '/register'
      path: '/register'
      fullPath: '/register'
      preLoaderRoute: typeof RegisterRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/redaction/': {
      id: '/redaction/'
      path: '/redaction'
      fullPath: '/redaction/'
      preLoaderRoute: typeof RedactionIndexRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/redaction/$documentId': {
      id: '/redaction/$documentId'
      path: '/redaction/$documentId'
      fullPath: '/redaction/$documentId'
      preLoaderRoute: typeof RedactionDocumentIdRouteImport
      parentRoute: typeof rootRouteImport
    }
  }
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  LoginRoute: LoginRoute,
  ProfileRoute: ProfileRoute,
  RegisterRoute: RegisterRoute,
  RedactionDocumentIdRoute: RedactionDocumentIdRoute,
  RedactionIndexRoute: RedactionIndexRoute,
}
export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

import type { getRouter } from './router.tsx'
import type { createStart } from '@tanstack/react-start'
declare module '@tanstack/react-start' {
  interface Register {
    ssr: true
    router: Awaited<ReturnType<typeof getRouter>>
  }
}

```


## src/router.tsx

```tsx
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

import type { ReactNode } from 'react'
import { QueryClient } from '@tanstack/react-query'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import TanstackQueryProvider, {
  getContext,
} from './integrations/tanstack-query/root-provider'

export function getRouter() {
  const context = getContext()

  const router = createTanStackRouter({
    routeTree,
    context,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}

```


## src/routes/__root.tsx

```tsx
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from '@mantine/core'
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import { theme } from '#/shared/theme/theme'
import mantineCss from '@mantine/core/styles.css?url'
import appCss from '../styles.css?url'
import type { QueryClient } from '@tanstack/react-query'
import { AppShell } from '#/shared/ui/app-shell/appShell'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Texademia',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: mantineCss,
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <HeadContent />
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="light">
          <AppShell>{children}</AppShell>
        </MantineProvider>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}

```


## src/routes/index.tsx

```tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import { ApiError } from "#/shared/api/client";
import { currentUserQueryOptions } from "#/features/auth";
import { getCookieHeader } from "#/shared/api/serverCookie";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context: { queryClient } }) => {
    try {
      await queryClient.ensureQueryData(currentUserQueryOptions(getCookieHeader()));
      throw redirect({ to: "/redaction" });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        throw redirect({ to: "/login" });
      }
      throw err; // real errors (network, 500...) and the redirect() above both fall through here
    }
  },
});

```


## src/routes/login.tsx

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "#/features/auth";

export const Route = createFileRoute("/login")({ component: LoginForm });

```


## src/routes/profile.tsx

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { ProfileForm, requireAuth } from "#/features/auth";

export const Route = createFileRoute("/profile")({
  beforeLoad: ({ context: { queryClient } }) => requireAuth(queryClient),
  component: ProfileForm,
});

```


## src/routes/redaction.$documentId.tsx

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { documentQueryOptions } from "#/features/redaction";
import { RedactionPage } from "#/features/redaction";
import { requireAuth } from "#/features/auth";
import { getCookieHeader } from "#/shared/api/serverCookie";

export const Route = createFileRoute("/redaction/$documentId")({
  beforeLoad: ({ context: { queryClient } }) => requireAuth(queryClient),
  loader: ({ context: { queryClient }, params: { documentId } }) =>
    queryClient.ensureQueryData(documentQueryOptions(documentId, getCookieHeader())),
  component: () => {
    const { documentId } = Route.useParams();
    return <RedactionPage key={documentId} documentId={documentId} />;
  },
});

```


## src/routes/redaction.index.tsx

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { documentsQueryOptions, DocumentsListPage } from "#/features/redaction";
import { requireAuth } from "#/features/auth";
import { getCookieHeader } from "#/shared/api/serverCookie";

export const Route = createFileRoute("/redaction/")({
  beforeLoad: ({ context: { queryClient } }) => requireAuth(queryClient),
  loader: ({ context: { queryClient } }) =>
      queryClient.ensureQueryData(documentsQueryOptions(getCookieHeader())),
  component: DocumentsListPage,
});

```


## src/routes/register.tsx

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { RegisterForm } from "#/features/auth";

export const Route = createFileRoute("/register")({ component: RegisterForm });

```


## src/shared/api/client.ts

```ts
export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

// SSR (inside the frontend container) must reach the backend via Docker's
// internal service name. Client-side (browser) must use localhost, since
// that's what's actually published to your host machine.
function resolveBaseUrl(): string {
  if (typeof window === "undefined") {
    return process.env.INTERNAL_API_URL ?? "http://backend:8000";
  }
  return import.meta.env.VITE_API_URL ?? "http://localhost:8000";
}

interface RequestOptions extends RequestInit {
  // Pass through the incoming request's Cookie header during SSR,
  // since server-side fetch doesn't have access to the browser's cookie jar.
  cookieHeader?: string | null;
}

let refreshPromise: Promise<string[]> | null = null;

async function refreshAccessToken(cookieHeader?: string | null): Promise<string[]> {
  if (refreshPromise) return refreshPromise;

  const baseUrl = resolveBaseUrl();
  refreshPromise = fetch(`${baseUrl}/api/auth/jwt/refresh`, {
    method: "POST",
    credentials: "include",
    headers: cookieHeader ? { Cookie: cookieHeader } : {},
  })
  .then((res) => {
      if (!res.ok) throw new ApiError("Refresh failed", res.status, null);
      return res.headers.getSetCookie();   // forward these to the browser
  })
  .finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { cookieHeader, headers, ...rest } = options;
  const baseUrl = resolveBaseUrl();

  const doFetch = () =>
    fetch(`${baseUrl}${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        ...headers,
      },
    });

  let res = await doFetch();

  // On the client, if the access token expired, try to refresh it once and
  // retry the original request. We can't refresh during SSR because there is
  // no browser cookie jar there.
  if (
    res.status === 401 && path !== "/api/auth/jwt/refresh"
  ) {
    try {
      await refreshAccessToken(cookieHeader);
      res = await doFetch();
    } catch {
      // Refresh failed; keep the original 401 response so the caller can
      // redirect to login or surface the error.
    }
  }

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // non-JSON error body, ignore
    }
    const message =
      (body as any)?.detail?.message ?? (body as any)?.detail ?? `Request failed: ${res.status}`;
    throw new ApiError(message, res.status, body);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};

// The PDF URL the backend returns is host-relative and only makes sense
// from the browser's perspective — use this whenever you render one.
export function toPublicUrl(path: string): string {
  const publicBase = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
  return `${publicBase}${path}`;
}

```


## src/shared/api/serverCookie.ts

```ts
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const getCookieHeader = createIsomorphicFn()
  .server(() => getRequest()?.headers.get("cookie") ?? null)
  .client(() => null);

```


## src/shared/styles/animations.module.css

```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.spin {
  animation: spin 1s linear infinite;
}

```


## src/shared/styles/tokens.module.css

```css
:root {
  --color-bg: #fdfdfd;
  --color-surface: #ffffff;
  --color-surface-raised: #ffffff;
  --color-border: #e5e7eb;
  --color-text: #1a1c1c;
  --color-text-secondary: #6b7280;
  --color-text-muted: #9ca3af;

  --color-accent: #4338ca;
  --color-accent-hover: #3730a3;
  --color-accent-subtle: #eef2ff;

  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-danger: #dc2626;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);

  --font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-family-serif: "Noto Serif", Georgia, serif;
  --font-family-mono: "JetBrains Mono", "SFMono-Regular", monospace;
}

html[data-mantine-color-scheme="dark"] {
  --color-bg: #0a0a0a;
  --color-surface: #18181b;
  --color-surface-raised: #1f1f23;
  --color-border: #27272a;
  --color-text: #fafafa;
  --color-text-secondary: #a1a1aa;
  --color-text-muted: #71717a;

  --color-accent: #818cf8;
  --color-accent-hover: #6366f1;
  --color-accent-subtle: #1e1b4b;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
}

```


## src/shared/theme/theme.ts

```ts
import { createTheme } from "@mantine/core";
import type { MantineColorsTuple } from "@mantine/core";

const accent: MantineColorsTuple = [
  "#eef2ff",
  "#e0e7ff",
  "#c7d2fe",
  "#a5b4fc",
  "#818cf8",
  "#6366f1",
  "#4f46e5",
  "#4338ca",
  "#3730a3",
  "#312e81",
];

export const theme = createTheme({
  fontFamily: "var(--font-family)",
  fontFamilyMonospace: "var(--font-family-mono)",
  headings: {
    fontFamily: "var(--font-family-serif)",
  },
  primaryColor: "accent",
  primaryShade: { light: 7, dark: 4 },
  colors: {
    accent,
  },
  defaultRadius: "md",
  radius: {
    sm: "6px",
    md: "8px",
    lg: "12px",
  },
  fontSizes: {
    xs: "12px",
    sm: "13px",
    md: "14px",
    lg: "16px",
    xl: "18px",
  },
  shadows: {
    sm: "var(--shadow-sm)",
    md: "var(--shadow-md)",
    lg: "var(--shadow-lg)",
  },

  components: {
    Button: {
      defaultProps: { size: "sm" },
      styles: {
        root: {
          fontWeight: 500,
          transition: "background-color 0.15s ease, transform 0.05s ease",
          "&:active": {
            transform: "scale(0.98)",
          },
        },
      },
    },

    TextInput: {
      defaultProps: { size: "sm" },
      styles: {
        input: {
          border: "1px solid var(--color-border)",
          backgroundColor: "var(--color-surface)",
          color: "var(--color-text)",
          "&:focus": {
            borderColor: "var(--color-accent)",
            outline: "none",
          },
        },
        label: {
          color: "var(--color-text)",
          fontWeight: 500,
          marginBottom: "4px",
        },
      },
    },

    Select: {
      defaultProps: { size: "sm" },
      styles: {
        input: {
          border: "1px solid var(--color-border)",
          backgroundColor: "var(--color-surface)",
          color: "var(--color-text)",
        },
        dropdown: {
          border: "1px solid var(--color-border)",
          backgroundColor: "var(--color-surface)",
          boxShadow: "var(--shadow-md)",
        },
      },
    },

    Card: {
      defaultProps: { padding: "lg", radius: "md" },
      styles: {
        root: {
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-sm)",
        },
      },
    },
  },
});

```


## src/shared/ui/app-shell/appShell.tsx

```tsx
import { AppShell as MantineAppShell, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { UserMenu } from "#/features/auth";
import { InvitationsBell } from "#/features/redaction"; // NEW

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
            overflowY: "auto",
            overflowX: "hidden",
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
            <Text component={Link} to="/" fw={700} size="md" c="var(--color-text)" style={{ textDecoration: "none" }}>
              Texademia
            </Text>
          </div>
          <div id="app-shell-header-center" style={{ justifySelf: "center", minWidth: 0 }} />
          <div
            style={{
              justifySelf: "end",
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: "var(--mantine-spacing-md)",
            }}
          >
            <div id="app-shell-header-actions" />
            <InvitationsBell />
            <UserMenu />
          </div>
        </div>
      </MantineAppShell.Header>
      <MantineAppShell.Main>{children}</MantineAppShell.Main>
    </MantineAppShell>
  );
}

```


## src/shared/ui/app-shell/headerPortal.tsx

```tsx
// shared/ui/app-shell/headerPortal.tsx
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type HeaderSlot = "center" | "actions";

const SLOT_IDS: Record<HeaderSlot, string> = {
  center: "app-shell-header-center",
  actions: "app-shell-header-actions",
};

export function AppShellHeaderPortal({
  slot,
  children,
}: {
  slot: HeaderSlot;
  children: React.ReactNode;
}) {
  const [target, setTarget] = useState<Element | null>(null);

  // AppShell renders before route content, so the slot div exists by the
  // time this mounts — but we still wait for a real DOM node (client-only).
  useEffect(() => {
    setTarget(document.getElementById(SLOT_IDS[slot]));
  }, [slot]);

  if (!target) return null;
  return createPortal(children, target);
}

```


## src/shared/ui/card/card.tsx

```tsx
import React from "react";
import styles from "./Card.module.css";

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Card({ title, children, className }: CardProps) {
  return (
    <div className={`${styles.card} ${className ?? ""}`}>
      {title && <div className={styles.cardTitle}>{title}</div>}
      <div className={styles.cardBody}>{children}</div>
    </div>
  );
}

```


## src/styles.css

```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Noto+Serif:ital,wght@0,400;0,700;1,400&family=JetBrains+Mono:wght@400;500&display=swap");
@import "#/shared/styles/tokens.module.css";
@import "#/shared/styles/animations.module.css";

* {
  box-sizing: border-box;
}
html,
body,
#app {
  min-height: 100%;
}
body {
  margin: 0;
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-family);
}

.academic-label {
  font-family: var(--font-family);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

```


## vite.config.ts

```ts
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
})

export default config

```

