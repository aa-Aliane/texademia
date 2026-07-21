import { useMutation } from "@tanstack/react-query";
import { compileDocument } from "../api/redaction";
import type { ProjectFile } from "../types/redaction";

export function useCompileDocument(documentId: string) {
  return useMutation({
    mutationFn: (files: ProjectFile[]) => compileDocument(documentId, files),
  });
}
