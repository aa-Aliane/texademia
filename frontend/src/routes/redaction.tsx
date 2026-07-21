import { createFileRoute, redirect } from "@tanstack/react-router";
import { createDocument } from "#/features/redaction";

export const Route = createFileRoute("/redaction")({
  loader: async () => {
    const doc = await createDocument("Untitled", "default");
    throw redirect({
      to: "/redaction/$documentId" as any,
      params: { documentId: doc.id },
    });
  },
});
