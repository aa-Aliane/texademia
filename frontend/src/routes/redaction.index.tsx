import { createFileRoute } from "@tanstack/react-router";
import { documentsQueryOptions, DocumentsListPage } from "#/features/redaction";

export const Route = createFileRoute("/redaction/")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(documentsQueryOptions()),
  component: DocumentsListPage,
});
