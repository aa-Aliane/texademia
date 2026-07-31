# Tree View:
```
frontend
└── src
    └── features
        └── redaction
            ├── api
            │   └── redaction.ts
            ├── components
            │   ├── blameExtension.ts
            │   └── versionHistoryDrawer.tsx
            ├── store
            │   └── editorStore.ts
            └── types
                └── redaction.ts

```

# Content:

## src/features/redaction/api/redaction.ts

```ts
// redaction/api/redaction.ts
import { queryOptions } from "@tanstack/react-query";
import { api, toPublicUrl } from "#/shared/api/client";
import type { ProjectFile, RedactionDocument, Collaborator, CollaboratorRole, Invitation, DocumentVersion, VersionTrigger } from "../types/redaction";

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


interface DocumentVersionDto {
  id: string;
  created_at: string;
  trigger: VersionTrigger;
  author: string;
  files_changed: string[];
}

function mapDocumentVersion(d: DocumentVersionDto): DocumentVersion {
  return { id: d.id, createdAt: d.created_at, trigger: d.trigger, author: d.author, filesChanged: d.files_changed };
}

export async function getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
  const data = await api.get<DocumentVersionDto[]>(`/api/texademia/documents/${documentId}/versions`);
  return data.map(mapDocumentVersion);
}

export async function restoreDocumentVersion(documentId: string, versionId: string): Promise<RedactionDocument> {
  const data = await api.post<DocumentDto>(`/api/texademia/documents/${documentId}/versions/${versionId}/restore`);
  return mapDocument(data);
}

export async function checkpointDocument(documentId: string): Promise<void> {
  await api.post(`/api/texademia/documents/${documentId}/checkpoint`);
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


## src/features/redaction/components/versionHistoryDrawer.tsx

```tsx
import { Drawer, Timeline, Text, Button, Badge, Group, Loader } from "@mantine/core";
import { IconFileCheck, IconClock, IconHistoryToggle } from "@tabler/icons-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDocumentVersions, restoreDocumentVersion, documentQueryOptions } from "../api/redaction";
import type { VersionTrigger } from "../types/redaction";

const TRIGGER_ICON: Record<VersionTrigger, JSX.Element> = {
  compile: <IconFileCheck size={14} />,
  idle: <IconClock size={14} />,
  restore: <IconHistoryToggle size={14} />,
};

const TRIGGER_LABEL: Record<VersionTrigger, string> = {
  compile: "Compile",
  idle: "Auto-save",
  restore: "Restored",
};

interface Props {
  opened: boolean;
  onClose: () => void;
  documentId: string;
}

export function VersionHistoryDrawer({ opened, onClose, documentId }: Props) {
  const queryClient = useQueryClient();

  const { data: versions, isLoading } = useQuery({
    queryKey: ["document-versions", documentId],
    queryFn: () => getDocumentVersions(documentId),
    enabled: opened,
  });

  const restoreMutation = useMutation({
    mutationFn: (versionId: string) => restoreDocumentVersion(documentId, versionId),
    onSuccess: (restoredDocument) => {
      queryClient.setQueryData(documentQueryOptions(documentId).queryKey, restoredDocument);
      queryClient.invalidateQueries({ queryKey: ["document-versions", documentId] });
      onClose();
    },
  });

  return (
    <Drawer opened={opened} onClose={onClose} title="Document history" position="right" size="sm">
      {isLoading && <Loader size="sm" />}

      {!isLoading && (!versions || versions.length === 0) && (
        <Text size="sm" c="dimmed">No checkpoints yet for this document.</Text>
      )}

      <Timeline bulletSize={22} lineWidth={2}>
        {versions?.map((v) => (
          <Timeline.Item key={v.id} bullet={TRIGGER_ICON[v.trigger]} title={
            <Group gap="xs">
              <Badge size="xs" variant="light">{TRIGGER_LABEL[v.trigger]}</Badge>
              <Text size="xs" c="dimmed">{new Date(v.createdAt).toLocaleString()}</Text>
            </Group>
          }>
            <Text size="xs" c="dimmed" mb={2}>{v.author}</Text>
            <Group gap={4} mb={6}>
              {v.filesChanged.map((name) => (
                <Badge key={name} size="xs" variant="dot" color="gray">{name}</Badge>
              ))}
            </Group>
            <Button
              size="xs"
              variant="light"
              loading={restoreMutation.isPending && restoreMutation.variables === v.id}
              onClick={() => restoreMutation.mutate(v.id)}
            >
              Restore this version
            </Button>
          </Timeline.Item>
        ))}
      </Timeline>
    </Drawer>
  );
}

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
  setFileContent: (fileId: string, content: string) => void;
  historyOpened: boolean,
  setHistoryOpened: (opened: boolean) => void,
}

export const useEditorStore = create<EditorState>((set, get) => ({
  documentId: null,
  files: [],
  activeFileId: null,
  historyOpened: false,
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
  setFileContent: (fileId, content) => {
      set((state) => ({
        files: state.files.map((f) => (f.id === fileId ? { ...f, content } : f)),
      }));
  },

  setHistoryOpened: (opened:boolean) => set({ historyOpened: opened }),
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

export type VersionTrigger = "compile" | "idle" | "restore";

export interface FileVersion {
  id: string;
  createdAt: string;
  trigger: VersionTrigger;
  author: string;
}

export interface DocumentVersion {
  id: string;
  createdAt: string;
  trigger: VersionTrigger;
  author: string;
  filesChanged: string[];
}

```

