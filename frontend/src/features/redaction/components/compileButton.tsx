// redaction/components/compileButton.tsx
import { Button } from "@mantine/core";
import { IconPlayerPlay, IconLoader2 } from "@tabler/icons-react";

interface CompileButtonProps {
  onCompile: () => void;
  isCompiling: boolean;
  hasCompiledBefore: boolean;
}

export function CompileButton({ onCompile, isCompiling, hasCompiledBefore }: CompileButtonProps) {
  return (
    <Button
      onClick={onCompile}
      disabled={isCompiling}
      leftSection={isCompiling ? <IconLoader2 size={16} className="spin" /> : <IconPlayerPlay size={16} />}
      color={isCompiling ? "gray" : "blue"}
    >
      {isCompiling ? "Compiling…" : hasCompiledBefore ? "Recompile" : "Compile"}
    </Button>
  );
}
