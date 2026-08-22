// Editor.tsx
import { StreamLanguage, type StreamParser } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { EditorView, type Extension } from "@codemirror/view";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { useMemo, useRef } from "react";
import { cursorPersistencePlugin } from "../plugins/cursorPersistencePlugin";
import { gotoLineSync, lineAuthorSync, remoteCursorSync } from "../plugins/editorStoreBridge";
import { blameExtension } from "./blameExtension";
import { cursorExtension } from "./cursorExtension";
import { richTextExtension } from "./richTextMode";
import { zedSearchExtension } from "./searchPanel";

interface EditorProps {
  /** Stable identity for the open document — drives cursor/scroll persistence. */
  documentId: string;
  /** Active file/tab id — cursor/scroll are persisted per file, not per document. */
  fileId?: string;
  value: string;
  language?: "latex" | "bibtex" | "log";
  onChange: (value: string) => void;
  readOnly?: boolean;
  richMode?: boolean;
}

// Module-level, not per-render — StreamLanguage.define(...) only needs to
// run once ever, not once per keystroke.
const stexLanguage = StreamLanguage.define(stex as StreamParser<unknown>);

// Match the gutters (line numbers column) to the app theme — kills the
// default grey strip and the visible seam at the top of the gutter.
const gutterTheme = EditorView.theme({
  ".cm-gutters": {
    backgroundColor: "var(--color-surface)",
    color: "var(--color-text-muted)",
    borderRight: "1px solid var(--color-border)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--color-accent-subtle)",
    color: "var(--color-text)",
  },
});

export function Editor({ documentId, fileId, value, language, onChange, readOnly, richMode }: EditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const persistKey = fileId ?? documentId;

  // All state sync (line authors, remote cursors, goto-line, cursor/scroll
  // persistence) now lives inside ViewPlugins that subscribe to the Zustand
  // store directly — no React useEffect involved. Recreated only when
  // persistKey/language/richMode actually change, which is also what forces
  // cursorPersistencePlugin to re-run its "restore on construction" logic
  // for the newly opened file.
  const extensions: Extension[] = useMemo(() => {
    const base = [
      stexLanguage,
      gutterTheme,
      blameExtension,
      cursorExtension,
      lineAuthorSync,
      remoteCursorSync,
      gotoLineSync,
      cursorPersistencePlugin(persistKey),
      zedSearchExtension,
    ];
    return language === "latex" && richMode ? [...base, richTextExtension] : base;
  }, [persistKey, language, richMode]);

  return (
    <CodeMirror
      // key forces a hard remount when switching files/documents, guaranteeing
      // ViewPlugins are reconstructed (and cursorPersistencePlugin's
      // restore-on-mount fires) rather than relying on @uiw/react-codemirror
      // to diff a changed extensions array correctly.
      key={persistKey}
      ref={editorRef}
      value={value}
      height="100%"
      editable={!readOnly}
      extensions={extensions}
      onChange={onChange}
      style={{ height: "100%" }}
    />
  );
}
