import CodeMirror from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";

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
      style={{ height: "100%" }}
    />
  );
}
