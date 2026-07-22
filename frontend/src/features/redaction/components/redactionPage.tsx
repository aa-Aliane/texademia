// redaction/components/redactionPage.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Editor } from "./editor";
import { PdfPreview } from "./pdfPreview";
import { FileTabs, PREVIEW_TAB_ID } from "./fileTabs";
import { DocumentHeader } from "./documentHeader";
import { useCompileDocument } from "../hooks/useCompileDocument";
import { useUpdateDocumentTitle } from "../hooks/useUpdateDocumentTitle";
import { documentQueryOptions } from "../api/redaction";
import type { ProjectFile } from "../types/redaction";

interface RedactionPageProps {
  documentId: string;
}

export function RedactionPage({ documentId }: RedactionPageProps) {
  const { data: document } = useQuery(documentQueryOptions(documentId));

  const [files, setFiles] = useState<ProjectFile[]>(() => document?.files ?? []);
  const [activeFileId, setActiveFileId] = useState<string | null>(
    () => document?.files[0]?.id ?? null
  );
  const [activeTabId, setActiveTabId] = useState<string>("");

  const {
    mutate: compile,
    data: compileResult,
    isPending: isCompiling,
    isSuccess: isCompileSuccess,
    isError: isCompileError,
    error: compileError,
  } = useCompileDocument(documentId);

  const { mutate: saveTitle, isPending: isSavingTitle } = useUpdateDocumentTitle(documentId);

  if (!document || !activeFileId) return null;

  const currentTabId = activeTabId || activeFileId;
  const activeFile = files.find((f) => f.id === currentTabId);

  const updateActiveFileContent = (content: string) => {
    setFiles((prev) => prev.map((f) => (f.id === activeFileId ? { ...f, content } : f)));
  };

  const handleSelectTab = (id: string) => {
    setActiveTabId(id);
    if (id !== PREVIEW_TAB_ID) setActiveFileId(id);
  };

  const compileStatus = isCompiling
    ? "compiling"
    : isCompileError
    ? "error"
    : isCompileSuccess
    ? "success"
    : "idle";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <DocumentHeader
        title={document.title}
        onTitleSave={saveTitle}
        isSavingTitle={isSavingTitle}
        onCompile={() => compile(files)}
        compileStatus={compileStatus}
        compileError={(compileError as any)?.message}
        template={document.template}
        pdfUrl={compileResult?.pdfUrl ?? null}
      />

      <FileTabs files={files} activeTabId={currentTabId} onSelect={handleSelectTab} />

      <div style={{ flex: 1, minHeight: 0 }}>
        {currentTabId === PREVIEW_TAB_ID ? (
          <PdfPreview pdfUrl={compileResult?.pdfUrl ?? null} />
        ) : activeFile ? (
          <Editor
            value={activeFile.content}
            language={activeFile.language}
            onChange={updateActiveFileContent}
          />
        ) : null}
      </div>
    </div>
  );
}
