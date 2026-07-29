import { Tabs, Group } from "@mantine/core";
import { IconFileText } from "@tabler/icons-react";
import type { ProjectFile } from "../types/redaction";
import { IconAlertTriangle } from "@tabler/icons-react";

export const PREVIEW_TAB_ID = "__preview__";
export const LOG_TAB_ID = "__log__";

interface FileTabsProps {
  files: ProjectFile[];
  activeTabId: string;
  onSelect: (id: string) => void;
  hasLog?: boolean;
}

export function FileTabs({ files, activeTabId, onSelect, hasLog }: FileTabsProps) {
  return (
    <Tabs value={activeTabId} onChange={(id) => id && onSelect(id)}>
      <Tabs.List>
        {files.map((f) => (
          <Tabs.Tab key={f.id} value={f.id}>
            {f.name}
          </Tabs.Tab>
        ))}
        {hasLog && (
          <Tabs.Tab value={LOG_TAB_ID} color="red" leftSection={<IconAlertTriangle size={14} />}>
            Compile Log
          </Tabs.Tab>
        )}
        <Tabs.Tab
          value={PREVIEW_TAB_ID}
          ml="auto"
          leftSection={<IconFileText size={14} />}
          color="violet"
        >
          Preview
        </Tabs.Tab>
      </Tabs.List>
    </Tabs>
  );
}
