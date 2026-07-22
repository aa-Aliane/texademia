import { createFileRoute } from "@tanstack/react-router";
import { documentQueryOptions } from "#/features/redaction";
import { RedactionPage } from "#/features/redaction";

export const Route = createFileRoute("/redaction/$documentId")({
  loader: ({ context: { queryClient }, params: { documentId } }) =>
    queryClient.ensureQueryData(documentQueryOptions(documentId)),
  component: () => {
    const { documentId } = Route.useParams();
    return <RedactionPage key={documentId} documentId={documentId} />;
  },
});
