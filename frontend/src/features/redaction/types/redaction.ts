export interface ProjectFile {
  id: string;
  name: string;
  language: "latex" | "bibtex";
  content: string;
}

export interface RedactionDocument {
  id: string;
  title: string;
  template: string;
  files: ProjectFile[];
}

export interface CompileResponse {
  pdfUrl: string;
}

export interface CompileError {
  message: string;
  log?: string;
}
