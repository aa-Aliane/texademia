// redaction/components/redactionPage.tsx
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Editor } from "./editor";
import { PdfPreview } from "./pdfPreview";
import { FileTabs, PREVIEW_TAB_ID } from "./fileTabs";
import { DocumentHeader } from "./documentHeader";
import { DuplicateDocumentDialog } from "./duplicateDocumentDialog";
import { CollaboratorsDialog } from "./collaboratorsDialog"; // NEW
import { useCompileDocument } from "../hooks/useCompileDocument";
import { useUpdateDocumentTitle } from "../hooks/useUpdateDocumentTitle";
import { documentQueryOptions, duplicateDocument } from "../api/redaction";
import type { ProjectFile } from "../types/redaction";

interface RedactionPageProps {
  documentId: string;
}

export function RedactionPage({ documentId }: RedactionPageProps) {
  const { data: document } = useQuery(documentQueryOptions(documentId));
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Initialized from the prefetched document so we don't need a useEffect to
  // sync local file state. The route loader guarantees `document` exists on
  // first render; the component remounts when documentId changes.
  const [files, setFiles] = useState<ProjectFile[]>(() => document!.files);
  const [activeFileId, setActiveFileId] = useState<string | null>(
    () => document!.files[0]?.id ?? null
  );
  const [activeTabId, setActiveTabId] = useState<string>(
    () => (document!.pdfUrl ? PREVIEW_TAB_ID : "")
  );
  const [duplicateDialogOpened, setDuplicateDialogOpened] = useState(false);
  const [collaboratorsDialogOpened, setCollaboratorsDialogOpened] = useState(false); // NEW

  const {
    compile,
    phase: compilePhase,
    progress: compileProgress,
    message: compileMessage,
    pdfUrl,
    error: compileError,
    log: compileLog,
    isDone: isCompileSuccess,
  } = useCompileDocument(documentId, document?.pdfUrl ?? null);

  const { mutate: saveTitle, isPending: isSavingTitle } = useUpdateDocumentTitle(documentId);

  const { mutate: duplicate, isPending: isDuplicating } = useMutation({
    mutationFn: (opts: { template: string; title: string }) =>
      duplicateDocument(documentId, opts),
    onSuccess: (newDoc) => {
      setDuplicateDialogOpened(false);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      navigate({ to: "/redaction/$documentId", params: { documentId: newDoc.id } });
    },
  });

  if (!document) return null;

  const dirtyCount = files.reduce((count, file) => {
    const serverFile = document.files.find((f) => f.id === file.id);
    return serverFile && file.content === serverFile.content ? count : count + 1;
  }, 0);

  const currentTabId = activeTabId || activeFileId || "";
  const activeFile = files.find((f) => f.id === currentTabId);

  const updateActiveFileContent = (content: string) => {
    setFiles((prev) => prev.map((f) => (f.id === activeFileId ? { ...f, content } : f)));
  };

  const handleSelectTab = (id: string) => {
    setActiveTabId(id);
    if (id !== PREVIEW_TAB_ID) setActiveFileId(id);
  };

  useEffect(() => {
    if (isCompileSuccess && pdfUrl) {
      setActiveTabId(PREVIEW_TAB_ID);
    }
  }, [isCompileSuccess, pdfUrl]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <DocumentHeader
        title={document.title}
        onTitleSave={saveTitle}
        isSavingTitle={isSavingTitle}
        onCompile={() => compile(files)}
        compilePhase={compilePhase}
        compileProgress={compileProgress}
        compileMessage={compileMessage}
        compileError={compileError}
        compileLog={compileLog}
        template={document.template}
        pdfUrl={pdfUrl}
        dirtyCount={dirtyCount}
        onDuplicateClick={() => setDuplicateDialogOpened(true)}
        onShareClick={() => setCollaboratorsDialogOpened(true)} // NEW
        role={document.role}                                    // NEW
      />

      <FileTabs files={files} activeTabId={currentTabId} onSelect={handleSelectTab} />

      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {currentTabId === PREVIEW_TAB_ID ? (
          <PdfPreview pdfUrl={pdfUrl} />
        ) : activeFile ? (
          <Editor
            value={activeFile.content}
            language={activeFile.language}
            onChange={updateActiveFileContent}
            lineAuthors={activeFile.lineAuthors}
          />
        ) : null}
      </div>

      <DuplicateDocumentDialog
        opened={duplicateDialogOpened}
        onClose={() => setDuplicateDialogOpened(false)}
        onDuplicate={(opts) => duplicate(opts)}
        isDuplicating={isDuplicating}
        sourceTitle={document.title}
        sourceTemplate={document.template}
      />

      {/* NEW */}
      <CollaboratorsDialog
        opened={collaboratorsDialogOpened}
        onClose={() => setCollaboratorsDialogOpened(false)}
        documentId={documentId}
      />
    </div>
  );
}
