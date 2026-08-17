import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { StreamLanguage, type LanguageSupport, type StreamParser } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { EditorView, type Extension } from "@codemirror/view";
import { useEffect, useMemo, useRef } from "react";
import { blameExtension, setLineAuthors } from "./blameExtension";
import { cursorExtension, setRemoteCursors, type RemoteCursor } from "./cursorExtension";
import { richTextExtension } from "./richTextMode";
import { zedSearchExtension } from "./searchPanel";
import type { LineAuthor } from "../types/redaction";

interface EditorProps {
  value: string;
  language?: "latex" | "bibtex" | "log";
  onChange: (value: string) => void;
  lineAuthors?: LineAuthor[];
  remoteCursors?: RemoteCursor[];
  onCursorMove?: (pos: number) => void;
  readOnly?: boolean;
  richMode?: boolean;
  gotoLine?: number | null;
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

export function Editor({
  value,
  language,
  onChange,
  lineAuthors,
  remoteCursors,
  onCursorMove,
  readOnly,
  richMode,
  gotoLine,
}: EditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  // Jump-to-line (compile errors): select the line and scroll it into view.
  useEffect(() => {
    if (gotoLine == null) return;
    const view = editorRef.current?.view;
    if (!view) return;
    const line = Math.max(1, Math.min(gotoLine, view.state.doc.lines));
    const pos = view.state.doc.line(line).from;
    view.dispatch({
      selection: { anchor: pos },
      effects: EditorView.scrollIntoView(pos, { y: "center" }),
    });
    view.focus();
  }, [gotoLine]);

  useEffect(() => {
    editorRef.current?.view?.dispatch({ effects: setLineAuthors.of(lineAuthors ?? []) });
  }, [lineAuthors]);

  useEffect(() => {
    editorRef.current?.view?.dispatch({ effects: setRemoteCursors.of(remoteCursors ?? []) });
  }, [remoteCursors]);

  // Stable across re-renders — only recreated if onCursorMove's identity
  // actually changes (it shouldn't, if the caller wraps it in useCallback).
  const cursorReporter = useMemo(
    () =>
      EditorView.updateListener.of((update) => {
        if (update.selectionSet && onCursorMove) {
          onCursorMove(update.state.selection.main.head);
        }
      }),
    [onCursorMove]
  );

  const extensions: Extension[] = useMemo(() => {
    const base = [stexLanguage, gutterTheme, blameExtension, cursorExtension, cursorReporter, zedSearchExtension];
    if (language === "latex" && richMode) {
      return [...base, richTextExtension];
    }
    return base;
  }, [cursorReporter, language, richMode]);

  return (
    <CodeMirror
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
