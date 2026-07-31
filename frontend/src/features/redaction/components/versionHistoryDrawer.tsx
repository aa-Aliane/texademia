import { Drawer, Timeline, Text, Button, Badge, Group, Loader } from "@mantine/core";
import { IconFileCheck, IconClock, IconHistoryToggle } from "@tabler/icons-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFileVersions, restoreFileVersion } from "../api/redaction";
import { useEditorStore } from "../store/editorStore";
import type { VersionTrigger } from "../types/redaction";

const TRIGGER_ICON: Record<VersionTrigger, JSX.Element> = {
  compile: <IconFileCheck size={14} />,
  idle: <IconClock size={14} />,
  restore: <IconHistoryToggle size={14} />,
};

const TRIGGER_LABEL: Record<VersionTrigger, string> = {
  compile: "Compile",
  idle: "Auto-save",
  restore: "Restored",
};

interface Props {
  opened: boolean;
  onClose: () => void;
  documentId: string;
  fileId: string;
}

export function VersionHistoryDrawer({ opened, onClose, documentId, fileId }: Props) {
  const queryClient = useQueryClient();
  const setFileContent = useEditorStore((s) => s.setFileContent);

  const { data: versions, isLoading } = useQuery({
    queryKey: ["file-versions", documentId, fileId],
    queryFn: () => getFileVersions(documentId, fileId),
    enabled: opened,
  });

  const restoreMutation = useMutation({
    mutationFn: (versionId: string) => restoreFileVersion(documentId, fileId, versionId),
    onSuccess: (fileDto) => {
      setFileContent(fileId, fileDto.content);
      queryClient.invalidateQueries({ queryKey: ["file-versions", documentId, fileId] });
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      onClose();
    },
  });

  return (
    <Drawer opened={opened} onClose={onClose} title="Version history" position="right" size="sm">
      {isLoading && <Loader size="sm" />}

      {!isLoading && (!versions || versions.length === 0) && (
        <Text size="sm" c="dimmed">No checkpoints yet for this file.</Text>
      )}

      <Timeline bulletSize={22} lineWidth={2}>
        {versions?.map((v) => (
          <Timeline.Item key={v.id} bullet={TRIGGER_ICON[v.trigger]} title={
            <Group gap="xs">
              <Badge size="xs" variant="light">{TRIGGER_LABEL[v.trigger]}</Badge>
              <Text size="xs" c="dimmed">{new Date(v.createdAt).toLocaleString()}</Text>
            </Group>
          }>
            <Text size="xs" c="dimmed" mb={4}>{v.author}</Text>
            <Button
              size="xs"
              variant="light"
              loading={restoreMutation.isPending && restoreMutation.variables === v.id}
              onClick={() => restoreMutation.mutate(v.id)}
            >
              Restore this version
            </Button>
          </Timeline.Item>
        ))}
      </Timeline>
    </Drawer>
  );
}
