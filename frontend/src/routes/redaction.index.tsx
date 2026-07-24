import { createFileRoute } from "@tanstack/react-router";
import { documentsQueryOptions, DocumentsListPage } from "#/features/redaction";
import { requireAuth } from "#/features/auth";
import { getCookieHeader } from "#/shared/api/serverCookie";

export const Route = createFileRoute("/redaction/")({
  beforeLoad: ({ context: { queryClient } }) => requireAuth(queryClient),
  loader: ({ context: { queryClient } }) =>
      queryClient.ensureQueryData(documentsQueryOptions(getCookieHeader())),
  component: DocumentsListPage,
});
