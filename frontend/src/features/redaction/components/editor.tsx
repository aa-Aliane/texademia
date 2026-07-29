import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { useEffect, useRef } from "react";
import { blameExtension, setLineAuthors } from "./blameExtension";
import type { LineAuthor } from "../types/redaction";

interface EditorProps {
  value: string;
  language: "latex" | "bibtex" | "log";
  onChange: (value: string) => void;
  lineAuthors?: LineAuthor[];
}

export function Editor({ value, onChange, lineAuthors }: EditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  useEffect(() => {
    editorRef.current?.view?.dispatch({ effects: setLineAuthors.of(lineAuthors ?? []) });
  }, [lineAuthors]);

  return (
    <CodeMirror
      ref={editorRef}
      value={value}
      height="100%"
      extensions={[StreamLanguage.define(stex), blameExtension]}
      onChange={onChange}
      style={{ height: "100%" }}
    />
  );
}
