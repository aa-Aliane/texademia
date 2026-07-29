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
import { useDocumentSocket } from "../hooks/useDocumentSocket";
import { documentQueryOptions, duplicateDocument } from "../api/redaction";
import { useRedactionStore } from "../store/redactionStore";

interface RedactionPageProps {
  documentId: string;
}

export function RedactionPage({ documentId }: RedactionPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Query Backend State
  const { data: document } = useQuery(documentQueryOptions(documentId));

  // Store State & Actions
  const activeTabId = useRedactionStore(
    (state) => state.activeTabs[documentId] ?? document?.files[0]?.id ?? ""
  );
  const activeFileId = useRedactionStore(
    (state) => state.activeFiles[documentId] ?? document?.files[0]?.id ?? null
  );
  const dialogState = useRedactionStore((state) => state.dialogs[documentId]);

  const setActiveTab = useRedactionStore((state) => state.setActiveTab);
  const setActiveFileId = useRedactionStore((state) => state.setActiveFile);
  const setDialog = useRedactionStore((state) => state.setDialog);

  const dirtyCount = useRedactionStore(
    (state) => state.dirtyFiles[documentId]?.size ?? 0
  );
  const markFileDirty = useRedactionStore((state) => state.markFileDirty);


  // Live sockets & refresh trigger
  const { presenceByFile, setActiveFile: setSocketActiveFile } = useDocumentSocket(
    documentId,
    (event) => {
      if (event.phase) {
        queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      }
    }
  );

  const {
    compile,
    phase: compilePhase,
    progress: compileProgress,
    message: compileMessage,
    pdfUrl,
    error: compileError,
    log: compileLog,
  } = useCompileDocument(documentId, document?.pdfUrl ?? null);

  const { mutate: saveTitle, isPending: isSavingTitle } = useUpdateDocumentTitle(documentId);

  const { mutate: duplicate, isPending: isDuplicating } = useMutation({
    mutationFn: (opts: { template: string; title: string }) =>
      duplicateDocument(documentId, opts),
    onSuccess: (newDoc) => {
      setDialog(documentId, "duplicate", false);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      navigate({ to: "/redaction/$documentId", params: { documentId: newDoc.id } });
    },
  });

  if (!document) return null;

  const files = document.files;
  const currentTabId = activeTabId || activeFileId || files[0]?.id || "";
  const activeFile = files.find((f) => f.id === currentTabId || f.id === activeFileId);

  const updateActiveFileContent = (content: string) => {
    const fileId = activeFileId ?? files[0]?.id;
    if (fileId) markFileDirty(documentId, fileId);

    queryClient.setQueryData(documentQueryOptions(documentId).queryKey, (oldData) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        files: oldData.files.map((f) =>
          f.id === (activeFileId ?? files[0]?.id) ? { ...f, content } : f
        ),
      };
    });
  };

  const handleSelectTab = (id: string) => {
    setActiveTab(documentId, id);
    if (id !== PREVIEW_TAB_ID && id !== LOG_TAB_ID) {
      setActiveFileId(documentId, id);
      setSocketActiveFile(id);
    }
  };

  const hasLog = compilePhase === "error" && !!compileLog;

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
        onDuplicateClick={() => setDialog(documentId, "duplicate", true)}
        onShareClick={() => setDialog(documentId, "collaborators", true)}
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
        opened={!!dialogState?.duplicate}
        onClose={() => setDialog(documentId, "duplicate", false)}
        onDuplicate={(opts) => duplicate(opts)}
        isDuplicating={isDuplicating}
        sourceTitle={document.title}
        sourceTemplate={document.template}
      />

      <CollaboratorsDialog
        opened={!!dialogState?.collaborators}
        onClose={() => setDialog(documentId, "collaborators", false)}
        documentId={documentId}
      />
    </div>
  );
}
