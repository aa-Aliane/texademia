import CodeMirror from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";

// swap for a dedicated bibtex mode later if you want stricter highlighting.

interface EditorProps {
  value: string;
  language: "latex" | "bibtex";
  onChange: (value: string) => void;
}

export function Editor({ value, onChange }: EditorProps) {
  return (
    <CodeMirror
      value={value}
      height="100%"
      extensions={[StreamLanguage.define(stex)]}
      onChange={(val) => onChange(val)}
      style={{ height: "100%", border: "1px solid #ccc" }}
    />
  );
}
