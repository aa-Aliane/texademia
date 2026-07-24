import { createFileRoute } from "@tanstack/react-router";
import { documentQueryOptions } from "#/features/redaction";
import { RedactionPage } from "#/features/redaction";
import { requireAuth } from "#/features/auth";
import { getCookieHeader } from "#/shared/api/serverCookie";

export const Route = createFileRoute("/redaction/$documentId")({
  beforeLoad: ({ context: { queryClient } }) => requireAuth(queryClient),
  loader: ({ context: { queryClient }, params: { documentId } }) =>
    queryClient.ensureQueryData(documentQueryOptions(documentId, getCookieHeader())),
  component: () => {
    const { documentId } = Route.useParams();
    return <RedactionPage key={documentId} documentId={documentId} />;
  },
});
