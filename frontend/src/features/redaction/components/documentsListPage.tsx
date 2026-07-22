import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { createDocument, documentsQueryOptions } from "../api/redaction";
import { CreateDocumentDialog } from "./createDocumentDialog";

export function DocumentsListPage() {
  const { data: documents } = useQuery(documentsQueryOptions());
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpened, setDialogOpened] = useState(false);

  const { mutate: createNew, isPending: isCreating } = useMutation({
    mutationFn: ({ title, template }: { title: string; template: string }) =>
      createDocument(title, template),
    onSuccess: (doc) => {
      setDialogOpened(false);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      navigate({ to: "/redaction/$documentId", params: { documentId: doc.id } });
    },
  });

  return (
    <Stack p="md" gap="md">
      <Group justify="space-between">
        <Title order={2}>Your documents</Title>
        <Button onClick={() => setDialogOpened(true)}>New document</Button>
      </Group>

      {documents?.length === 0 && (
        <Text c="dimmed">No documents yet — create one to get started.</Text>
      )}

      <Stack gap="xs">
        {documents?.map((doc) => (
          <Card
            key={doc.id}
            withBorder
            component="button"
            onClick={() => navigate({ to: "/redaction/$documentId", params: { documentId: doc.id } })}
            style={{ textAlign: "left", cursor: "pointer" }}
          >
            <Text fw={500}>{doc.title}</Text>
            <Text size="sm" c="dimmed">{doc.template}</Text>
          </Card>
        ))}
      </Stack>

      <CreateDocumentDialog
        opened={dialogOpened}
        onClose={() => setDialogOpened(false)}
        onCreate={(title, template) => createNew({ title, template })}
        isCreating={isCreating}
      />
    </Stack>
  );
}
