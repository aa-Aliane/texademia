import { Tabs, Group, Avatar, Tooltip } from "@mantine/core";  // CHANGED: added Avatar, Tooltip
import { IconFileText, IconAlertTriangle } from "@tabler/icons-react";
import type { ProjectFile } from "../types/redaction";

export const PREVIEW_TAB_ID = "__preview__";
export const LOG_TAB_ID = "__log__";

interface FileTabsProps {
  files: ProjectFile[];
  activeTabId: string;
  onSelect: (id: string) => void;
  hasLog?: boolean;
  presenceByFile?: Record<string, { connectionId: number; name?: string; email?: string }[]>; // NEW
}

// NEW
const AVATAR_COLORS = ["blue", "grape", "teal", "orange", "pink", "indigo"];
function colorFor(key: string) {
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}
function initials(label: string) {
  return label.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

// NEW
function PresenceStack({ users }: { users?: { connectionId: number; name?: string; email?: string }[] }) {
  if (!users?.length) return null;
  return (
    <Avatar.Group spacing={4} ml={6}>
      {users.slice(0, 3).map((u) => {
        const label = u.name ?? u.email ?? "?";
        return (
          <Tooltip key={u.connectionId} label={label}>
            <Avatar size={18} radius="xl" color={colorFor(u.email ?? label)}>
              {initials(label)}
            </Avatar>
          </Tooltip>
        );
      })}
    </Avatar.Group>
  );
}

export function FileTabs({ files, activeTabId, onSelect, hasLog, presenceByFile }: FileTabsProps) {
  return (
    <Tabs value={activeTabId} onChange={(id) => id && onSelect(id)}>
      <Tabs.List>
        {files.map((f) => (
          <Tabs.Tab key={f.id} value={f.id}>
            <Group gap={0} wrap="nowrap">
              {f.name}
              <PresenceStack users={presenceByFile?.[f.id]} />
            </Group>
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
