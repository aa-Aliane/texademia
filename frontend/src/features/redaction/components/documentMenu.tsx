// redaction/components/documentMenu.tsx
import { Menu, ActionIcon, Badge, Text } from "@mantine/core";
import {
  IconDots,
  IconCopy,
  IconDownload,
  IconFileZip,
  IconTrash,
  IconUsers,
  IconHistory
} from "@tabler/icons-react";

interface DocumentMenuProps {
  template: string;
  pdfUrl: string | null;
  onDuplicateClick: () => void;
  onShareClick: () => void;
  role: string; // "owner" | "writer" | "reader"
  onHistoryClick: () => void;
}

const TEMPLATE_LABELS: Record<string, string> = {
  default: "Default",
  arxiv: "arXiv",
  ieee: "IEEE",
  acl: "ACL",
};

export function DocumentMenu({ template, pdfUrl, onDuplicateClick, onShareClick, role, onHistoryClick }: DocumentMenuProps) {
  return (
    <Menu position="bottom-end" shadow="md" width={240}>
      <Menu.Target>
        <ActionIcon variant="subtle" size="sm" aria-label="Document options">
          <IconDots size={18} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>
          <Text size="xs" c="dimmed" span>Template</Text>{" "}
          <Badge size="xs" variant="light">
            {TEMPLATE_LABELS[template] ?? template}
          </Badge>
        </Menu.Label>

        {role === "owner" && (
          <Menu.Item leftSection={<IconUsers size={16} />} onClick={onShareClick}>
            Manage collaborators
          </Menu.Item>
        )}

        <Menu.Item
          leftSection={<IconDownload size={16} />}
          component="a"
          href={pdfUrl ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          disabled={!pdfUrl}
        >
          {pdfUrl ? "Download PDF" : "Download PDF (compile first)"}
        </Menu.Item>

        <Menu.Item leftSection={<IconFileZip size={16} />} disabled>
          Download source (.zip)
        </Menu.Item>

        <Menu.Item leftSection={<IconCopy size={16} />} onClick={onDuplicateClick}>
          Duplicate
        </Menu.Item>

        <Menu.Item leftSection={<IconHistory size={16} />} onClick={onHistoryClick}>
          Document history
        </Menu.Item>

        <Menu.Divider />

        <Menu.Item color="red" leftSection={<IconTrash size={16} />} disabled>
          Delete document
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
