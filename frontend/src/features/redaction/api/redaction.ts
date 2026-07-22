import { queryOptions } from "@tanstack/react-query";
import { api, toPublicUrl } from "#/shared/api/client";
import type { CompileResponse, ProjectFile, RedactionDocument } from "../types/redaction";

interface DocumentDto {
  id: string;
  title: string;
  template: string;
  files: { id: string; name: string; language: "latex" | "bibtex"; content: string }[];
}

function mapDocument(data: DocumentDto): RedactionDocument {
  return data;
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

export async function compileDocument(
  documentId: string,
  files: ProjectFile[]
): Promise<CompileResponse> {
  await Promise.all(files.map((f) => saveFile(documentId, f.id, f.content)));
  const data = await api.post<{ pdf_url: string }>(`/api/texademia/documents/${documentId}/compile`);
  return { pdfUrl: toPublicUrl(data.pdf_url) };
}

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
