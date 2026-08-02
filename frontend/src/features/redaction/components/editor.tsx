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
}

// Module-level, not per-render — StreamLanguage.define(...) only needs to
// run once ever, not once per keystroke.
const stexLanguage = StreamLanguage.define(stex as StreamParser<unknown>);

export function Editor({
  value,
  language,
  onChange,
  lineAuthors,
  remoteCursors,
  onCursorMove,
  readOnly,
  richMode,
}: EditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);

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
    const base = [stexLanguage, blameExtension, cursorExtension, cursorReporter, zedSearchExtension];
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
