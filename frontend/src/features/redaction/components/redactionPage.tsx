import { useCallback, useRef, useState } from "react";
import { Button } from "@mantine/core";
import { IconEye, IconCode } from "@tabler/icons-react";
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
import { documentQueryOptions, duplicateDocument, getDocumentZipUrl } from "../api/redaction";
import { useRedactionStore } from "../store/redactionStore";
import { useCurrentUser } from "#/features/auth";
import { VersionHistoryDrawer } from "./versionHistoryDrawer";

interface RedactionPageProps {
  documentId: string;
}

const CURSOR_THROTTLE_MS = 80;

export function RedactionPage({ documentId }: RedactionPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [richMode, setRichMode] = useState(false);

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
  const dirtyCount = useRedactionStore((state) => state.dirtyFiles[documentId]?.size ?? 0);

  const setActiveTab = useRedactionStore((state) => state.setActiveTab);
  const setActiveFileId = useRedactionStore((state) => state.setActiveFile);
  const setDialog = useRedactionStore((state) => state.setDialog);
  const markFileDirty = useRedactionStore((state) => state.markFileDirty);

  const { data: currentUser } = useCurrentUser();

  // Live sockets & refresh trigger
  const {
    presenceByFile,
    remoteCursorsByFile,
    setActiveFile: setSocketActiveFile,
    sendCursor,
  } = useDocumentSocket(documentId, currentUser?.id, (event) => {
    if (event.phase) {
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
    }
  });

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

  const files = document?.files ?? [];
  const currentTabId = activeTabId || activeFileId || files[0]?.id || "";
  const activeFile = files.find((f) => f.id === currentTabId || f.id === activeFileId);

  // Throttled cursor sender — recreated only when the target file changes,
  // so rapid selection events within a file share one throttle window
  // instead of resetting it on every keystroke.
  const lastSentRef = useRef(0);
  const pendingRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCursorMove = useCallback(
    (pos: number) => {
      if (!currentTabId || currentTabId === PREVIEW_TAB_ID || currentTabId === LOG_TAB_ID) return;

      const now = Date.now();
      const elapsed = now - lastSentRef.current;

      if (elapsed >= CURSOR_THROTTLE_MS) {
        lastSentRef.current = now;
        sendCursor(currentTabId, pos);
      } else {
        pendingRef.current = pos;
        if (!timerRef.current) {
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            if (pendingRef.current !== null) {
              lastSentRef.current = Date.now();
              sendCursor(currentTabId, pendingRef.current);
              pendingRef.current = null;
            }
          }, CURSOR_THROTTLE_MS - elapsed);
        }
      }
    },
    [currentTabId, sendCursor]
  );

  if (!document) return null;

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
        zipUrl={getDocumentZipUrl(documentId)}
        dirtyCount={dirtyCount}
        onDuplicateClick={() => setDialog(documentId, "duplicate", true)}
        onShareClick={() => setDialog(documentId, "collaborators", true)}
        onHistoryClick={() => setDialog(documentId, "history", true)}
        role={document.role}
        historyOpened={!!dialogState?.history}
      />

      <FileTabs
        files={files}
        activeTabId={currentTabId}
        onSelect={handleSelectTab}
        hasLog={hasLog}
        presenceByFile={presenceByFile}
      />

      {currentTabId !== PREVIEW_TAB_ID && currentTabId !== LOG_TAB_ID && activeFile?.language === "latex" && (
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "4px 12px" }}>
          <Button.Group>
            <Button
              variant={!richMode ? "filled" : "default"}
              size="compact-xs"
              leftSection={<IconCode size={13} />}
              onClick={() => setRichMode(false)}
            >
              Source
            </Button>
            <Button
              variant={richMode ? "filled" : "default"}
              size="compact-xs"
              leftSection={<IconEye size={13} />}
              onClick={() => setRichMode(true)}
            >
              Rich
            </Button>
          </Button.Group>
        </div>
      )}

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
            remoteCursors={remoteCursorsByFile[currentTabId]}
            onCursorMove={handleCursorMove}
            richMode={richMode}
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
      <VersionHistoryDrawer
        opened={!!dialogState?.history}
        onClose={() => setDialog(documentId, "history", false)}
        documentId={documentId}
      />
    </div>
  );
}
