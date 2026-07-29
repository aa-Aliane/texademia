// redaction/components/redactionPage.tsx
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Editor } from "./editor";
import { PdfPreview } from "./pdfPreview";
import { FileTabs, LOG_TAB_ID, PREVIEW_TAB_ID } from "./fileTabs";
import { DocumentHeader } from "./documentHeader";
import { DuplicateDocumentDialog } from "./duplicateDocumentDialog";
import { CollaboratorsDialog } from "./collaboratorsDialog";
import { useCompileDocument } from "../hooks/useCompileDocument";
import { useUpdateDocumentTitle } from "../hooks/useUpdateDocumentTitle";
import { useDocumentSocket } from "../hooks/useDocumentSocket"; // CHANGED
import { documentQueryOptions, duplicateDocument } from "../api/redaction";
import type { ProjectFile } from "../types/redaction";

interface RedactionPageProps {
  documentId: string;
}

export function RedactionPage({ documentId }: RedactionPageProps) {
  const { data: document } = useQuery(documentQueryOptions(documentId));
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [files, setFiles] = useState<ProjectFile[]>(() => document!.files);
  const [activeFileId, setActiveFileId] = useState<string | null>(
    () => document!.files[0]?.id ?? null
  );
  const [activeTabId, setActiveTabId] = useState<string>(
    () => (document!.pdfUrl ? PREVIEW_TAB_ID : "")
  );
  const [duplicateDialogOpened, setDuplicateDialogOpened] = useState(false);
  const [collaboratorsDialogOpened, setCollaboratorsDialogOpened] = useState(false);

  const [liveRefreshKey, setLiveRefreshKey] = useState(0);

  const {
    compile,
    phase: compilePhase,
    progress: compileProgress,
    message: compileMessage,
    pdfUrl,
    error: compileError,
    log: compileLog,
    isDone: isCompileSuccess,
  } = useCompileDocument(documentId, document?.pdfUrl ?? null, liveRefreshKey);

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



  // NEW — replaces RoomProvider/useOthers/useEventListener
  const { presenceByFile, setActiveFile } = useDocumentSocket(documentId, (event) => {
    if (event.phase) {
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      setLiveRefreshKey((k) => k + 1);
    }
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
    if (id !== PREVIEW_TAB_ID) {
      setActiveFileId(id);
      setActiveFile(id); // CHANGED — was updateMyPresence({ fileId: id })
    }
  };

  useEffect(() => {
    if (isCompileSuccess && pdfUrl) {
      setActiveTabId(PREVIEW_TAB_ID);
    }
  }, [isCompileSuccess, pdfUrl]);

  const hasLog = compilePhase === "error" && !!compileLog;

  useEffect(() => {
    if (compilePhase === "error" && compileLog) {
      setActiveTabId(LOG_TAB_ID);
    }
  }, [compilePhase, compileLog]);

  useEffect(() => {
    if (compilePhase === "queued" && activeTabId === LOG_TAB_ID) {
      setActiveTabId(activeFileId ?? "");
    }
  }, [compilePhase]);

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
        onShareClick={() => setCollaboratorsDialogOpened(true)}
        role={document.role}
      />

      <FileTabs
        files={files}
        activeTabId={currentTabId}
        onSelect={handleSelectTab}
        hasLog={hasLog}
        presenceByFile={presenceByFile}
      />

      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {currentTabId === PREVIEW_TAB_ID ? (
          <PdfPreview pdfUrl={pdfUrl} />
        ) : currentTabId === LOG_TAB_ID && compileLog ? (
          <Editor value={compileLog} language="log" onChange={() => {}} readOnly />
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

      <CollaboratorsDialog
        opened={collaboratorsDialogOpened}
        onClose={() => setCollaboratorsDialogOpened(false)}
        documentId={documentId}
      />
    </div>
  );
}
