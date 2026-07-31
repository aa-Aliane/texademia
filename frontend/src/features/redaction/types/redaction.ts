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
  summary: string; // NEW
}

export interface DiffLine {
  type: "add" | "remove" | "context";
  content: string;
}

export interface FileDiff {
  fileName: string;
  lines: DiffLine[];
}

export interface DocumentVersionDetail {
  id: string;
  createdAt: string;
  trigger: VersionTrigger;
  author: string;
  diffs: FileDiff[];
}
