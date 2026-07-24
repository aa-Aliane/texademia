import { useState } from "react";
import { Button, Modal, Stack, TextInput, SegmentedControl, Text } from "@mantine/core";

const TEMPLATES = [
  { value: "default", label: "Default", description: "Plain article, minimal starter" },
  { value: "arxiv", label: "arXiv", description: "Preprint style with abstract" },
  { value: "ieee", label: "IEEE", description: "Conference paper (IEEEtran)" },
  { value: "acl", label: "ACL", description: "ACL conference/workshop style" },
];

interface DuplicateDocumentDialogProps {
  opened: boolean;
  onClose: () => void;
  onDuplicate: (opts: { template: string; title: string }) => void;
  isDuplicating: boolean;
  sourceTitle: string;
  sourceTemplate: string;
}

export function DuplicateDocumentDialog({
  opened, onClose, onDuplicate, isDuplicating, sourceTitle, sourceTemplate,
}: DuplicateDocumentDialogProps) {
  const [title, setTitle] = useState(`${sourceTitle} (copy)`);
  const [template, setTemplate] = useState(sourceTemplate);

  return (
    <Modal opened={opened} onClose={onClose} title="Duplicate document" centered>
      <Stack gap="md">
        <TextInput label="Title" value={title} onChange={(e) => setTitle(e.currentTarget.value)} data-autofocus />
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
        <Button onClick={() => onDuplicate({ template, title: title.trim() || sourceTitle })} loading={isDuplicating} fullWidth>
          Duplicate
        </Button>
      </Stack>
    </Modal>
  );
}
