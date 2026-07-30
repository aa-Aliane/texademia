# Tree View:
```
frontend
└── src
    └── features
        └── redaction
            ├── api
            │   └── redaction.ts
            ├── components
            │   └── documentMenu.tsx
            ├── hooks
            │   └── useCompileDocument.ts
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

