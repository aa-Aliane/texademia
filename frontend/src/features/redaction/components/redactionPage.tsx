import { useQuery } from "@tanstack/react-query";
import { Group, Stack } from "@mantine/core";
import { Editor } from "./editor";
import { PdfPreview } from "./pdfPreview";
import { CompileButton } from "./compileButton";
import { FileTabs } from "./fileTabs";
import { useCompileDocument } from "../hooks/useCompileDocument";
import { documentQueryOptions } from "../api/redaction";
import { useEditorStore } from "../store/editorStore";

interface RedactionPageProps {
  documentId: string;
}

export function RedactionPage({ documentId }: RedactionPageProps) {
  // Cache is already warm — the route loader awaited this exact query.
  const { data: document } = useQuery(documentQueryOptions(documentId));

  const files = useEditorStore((s) => s.files);
  const activeFileId = useEditorStore((s) => s.activeFileId);
  const setFiles = useEditorStore((s) => s.setFiles);
  const setActiveFileId = useEditorStore((s) => s.setActiveFileId);
  const updateActiveFileContent = useEditorStore(
    (s) => s.updateActiveFileContent,
  );

  // First render after navigation: store is empty, server data is ready synchronously
  // (thanks to the loader) — seed it here, no effect needed.
  if (files.length === 0 && document) {
    setFiles(document.files);
  }

  const {
    mutate: compile,
    data: compileResult,
    isPending: isCompiling,
  } = useCompileDocument(documentId);

  if (!document || !activeFileId) return null;

  const activeFile = files.find((f) => f.id === activeFileId)!;

  return (
    <Stack h="100%" gap="md">
      <Group>
        <CompileButton
          onCompile={() => compile(files)}
          isCompiling={isCompiling}
        />
      </Group>
      <Group align="stretch" style={{ flex: 1 }} gap="md">
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <FileTabs
            files={files}
            activeFileId={activeFileId}
            onSelect={setActiveFileId}
          />
          <div style={{ flex: 1 }}>
            <Editor
              value={activeFile.content}
              language={activeFile.language}
              onChange={updateActiveFileContent}
            />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <PdfPreview pdfUrl={compileResult?.pdfUrl ?? null} />
        </div>
      </Group>
    </Stack>
  );
}
