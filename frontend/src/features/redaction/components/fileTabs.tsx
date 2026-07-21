import { Tabs } from "@mantine/core";
import type { ProjectFile } from "../types/redaction";

interface FileTabsProps {
  files: ProjectFile[];
  activeFileId: string;
  onSelect: (id: string) => void;
}

export function FileTabs({ files, activeFileId, onSelect }: FileTabsProps) {
  return (
    <Tabs value={activeFileId} onChange={(id) => id && onSelect(id)}>
      <Tabs.List>
        {files.map((f) => (
          <Tabs.Tab key={f.id} value={f.id}>
            {f.name}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  );
}
