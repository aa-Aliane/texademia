import { useMutation, useQuery } from "@tanstack/react-query";
import { createDocument, getDocument } from "../api/redaction";

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
