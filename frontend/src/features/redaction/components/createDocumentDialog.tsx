import { useState } from "react";
import { Button, Modal, Stack, TextInput, SegmentedControl, Text } from "@mantine/core";

const TEMPLATES = [
  { value: "default", label: "Default", description: "Plain article, minimal starter" },
  { value: "arxiv", label: "arXiv", description: "Preprint style with abstract" },
  { value: "ieee", label: "IEEE", description: "Conference paper (IEEEtran)" },
];

interface CreateDocumentDialogProps {
  opened: boolean;
  onClose: () => void;
  onCreate: (title: string, template: string) => void;
  isCreating: boolean;
}

export function CreateDocumentDialog({
  opened,
  onClose,
  onCreate,
  isCreating,
}: CreateDocumentDialogProps) {
  const [title, setTitle] = useState("Untitled");
  const [template, setTemplate] = useState("default");

  const handleSubmit = () => {
    onCreate(title.trim() || "Untitled", template);
  };

  return (
    <Modal opened={opened} onClose={onClose} title="New document" centered>
      <Stack gap="md">
        <TextInput
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          data-autofocus
        />

        <Stack gap={4}>
          <Text size="sm" fw={500}>Template</Text>
          <SegmentedControl
            fullWidth
            value={template}
            onChange={setTemplate}
            data={TEMPLATES.map((t) => ({ value: t.value, label: t.label }))}
          />
          <Text size="xs" c="dimmed">
            {TEMPLATES.find((t) => t.value === template)?.description}
          </Text>
        </Stack>

        <Button onClick={handleSubmit} loading={isCreating} fullWidth>
          Create
        </Button>
      </Stack>
    </Modal>
  );
}
