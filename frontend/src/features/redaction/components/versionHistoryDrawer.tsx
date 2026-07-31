import { Drawer, Timeline, Text, Button, Badge, Group, Loader, Modal, TextInput, Stack, Alert } from "@mantine/core";
import { useState } from "react";
import { IconFileCheck, IconClock, IconHistoryToggle, IconAlertTriangle } from "@tabler/icons-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDocumentVersions, getDocumentVersionDetail, restoreDocumentVersion, documentQueryOptions } from "../api/redaction";
import type { VersionTrigger, DocumentVersionDetail } from "../types/redaction";

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
}

export function VersionHistoryDrawer({ opened, onClose, documentId }: Props) {
  const queryClient = useQueryClient();
  const [confirmTargetId, setConfirmTargetId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const isConfirmed = confirmText.trim().toUpperCase() === "I CONFIRM";
  const [detailTargetId, setDetailTargetId] = useState<string | null>(null);

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["document-version-detail", documentId, detailTargetId],
    queryFn: () => getDocumentVersionDetail(documentId, detailTargetId as string),
    enabled: detailTargetId !== null,
  });

  const { data: versions, isLoading } = useQuery({
    queryKey: ["document-versions", documentId],
    queryFn: () => getDocumentVersions(documentId),
    enabled: opened,
  });

  const restoreMutation = useMutation({
    mutationFn: (versionId: string) => restoreDocumentVersion(documentId, versionId),
    onSuccess: (restoredDocument) => {
      queryClient.setQueryData(documentQueryOptions(documentId).queryKey, restoredDocument);
      queryClient.invalidateQueries({ queryKey: ["document-versions", documentId] });
      setConfirmTargetId(null);
      onClose();
    },
  });

  return (
    <Drawer opened={opened} onClose={onClose} title="Document history" position="right" size="sm">
      {isLoading && <Loader size="sm" />}

      {!isLoading && (!versions || versions.length === 0) && (
        <Text size="sm" c="dimmed">No checkpoints yet for this document.</Text>
      )}

      <Timeline bulletSize={22} lineWidth={2}>
        {versions?.map((v) => (
          <Timeline.Item key={v.id} bullet={TRIGGER_ICON[v.trigger]} title={
            <Group gap="xs">
              <Badge size="xs" variant="light">{TRIGGER_LABEL[v.trigger]}</Badge>
              <Text size="xs" c="dimmed">{new Date(v.createdAt).toLocaleString()}</Text>
            </Group>
          }>
            <Text size="xs" c="dimmed" mb={2}>{v.author}</Text>
            <Text size="xs" mb={2}>{v.summary}</Text>
            <Group gap={4} mb={6}>
              {v.filesChanged.map((name) => (
                <Badge key={name} size="xs" variant="dot" color="gray">{name}</Badge>
              ))}
            </Group>
            <Group gap="xs">
              <Button size="xs" variant="subtle" onClick={() => setDetailTargetId(v.id)}>
                Details
              </Button>
              <Button
                size="xs"
                variant="light"
                onClick={() => {
                  setConfirmText("");
                  setConfirmTargetId(v.id);
                }}
              >
                Restore this version
              </Button>
            </Group>
          </Timeline.Item>
        ))}
      </Timeline>
      <Modal
        opened={confirmTargetId !== null}
        onClose={() => setConfirmTargetId(null)}
        title="Restore this version?"
        centered
      >
        <Stack gap="sm">
          <Group gap="xs" wrap="nowrap" align="flex-start">
            <IconAlertTriangle size={18} color="var(--mantine-color-red-6)" style={{ flexShrink: 0, marginTop: 2 }} />
            <Text size="sm" c="dimmed">
              Every checkpoint made after this point will be permanently deleted.
              This cannot be undone.
            </Text>
          </Group>
          <Text size="sm">
            Type <b>I CONFIRM</b> below to proceed.
          </Text>
          <TextInput
            value={confirmText}
            onChange={(e) => setConfirmText(e.currentTarget.value)}
            placeholder="I CONFIRM"
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setConfirmTargetId(null)}>
              Cancel
            </Button>
            <Button
              color="red"
              disabled={!isConfirmed}
              loading={restoreMutation.isPending}
              onClick={() => {
                if (confirmTargetId) restoreMutation.mutate(confirmTargetId);
              }}
            >
              Delete future versions & restore
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal
        opened={detailTargetId !== null}
        onClose={() => setDetailTargetId(null)}
        title="Checkpoint details"
        size="lg"
        centered
      >
        {detailLoading && <Loader size="sm" />}
        {detail && (
          <Stack gap="md">
            {detail.diffs.map((fd: DocumentVersionDetail["diffs"][number]) => (
              <div key={fd.fileName}>
                <Text size="sm" fw={600} mb={4}>{fd.fileName}</Text>
                <div style={{ fontFamily: "monospace", fontSize: 12, border: "1px solid var(--mantine-color-gray-3)", borderRadius: 4, overflow: "hidden" }}>
                  {fd.lines.map((line, i) => (
                    <div
                      key={i}
                      style={{
                        whiteSpace: "pre-wrap",
                        padding: "0 8px",
                        backgroundColor:
                          line.type === "add" ? "var(--mantine-color-green-1)" :
                          line.type === "remove" ? "var(--mantine-color-red-1)" :
                          "transparent",
                      }}
                    >
                      {line.type === "add" ? "+ " : line.type === "remove" ? "- " : "  "}
                      {line.content}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Stack>
        )}
      </Modal>
    </Drawer>
  );
}
