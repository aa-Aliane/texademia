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


interface FileVersionDto {
  id: string;
  created_at: string;
  trigger: VersionTrigger;
  author: string;
}

function mapFileVersion(data: FileVersionDto): FileVersion {
  return { id: data.id, createdAt: data.created_at, trigger: data.trigger, author: data.author };
}

export async function getFileVersions(documentId: string, fileId: string): Promise<FileVersion[]> {
  const data = await api.get<FileVersionDto[]>(
    `/api/texademia/documents/${documentId}/files/${fileId}/versions`
  );
  return data.map(mapFileVersion);
}

export async function restoreFileVersion(
  documentId: string,
  fileId: string,
  versionId: string
): Promise<FileDto> {
  return api.post<FileDto>(
    `/api/texademia/documents/${documentId}/files/${fileId}/versions/${versionId}/restore`
  );
}

export async function checkpointFile(documentId: string, fileId: string): Promise<void> {
  await api.post(`/api/texademia/documents/${documentId}/files/${fileId}/checkpoint`);
}
