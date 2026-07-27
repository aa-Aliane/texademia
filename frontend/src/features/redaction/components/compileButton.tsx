// redaction/components/compileButton.tsx
import { Button, Badge } from "@mantine/core";
import { IconPlayerPlay, IconLoader2 } from "@tabler/icons-react";

interface CompileButtonProps {
  onCompile: () => void;
  isCompiling: boolean;
  hasCompiledBefore: boolean;
  dirtyCount: number;
}

export function CompileButton({
  onCompile,
  isCompiling,
  hasCompiledBefore,
  dirtyCount,
}: CompileButtonProps) {
  const canCompile = !isCompiling && (!hasCompiledBefore || dirtyCount > 0);

  return (
    <Button
      onClick={onCompile}
      disabled={!canCompile}
      leftSection={isCompiling ? <IconLoader2 size={16} className="spin" /> : <IconPlayerPlay size={16} />}
      rightSection={
        dirtyCount > 0 ? (
          <Badge color="red" size="xs" variant="filled">
            {dirtyCount}
          </Badge>
        ) : undefined
      }
      color={isCompiling ? "gray" : "blue"}
    >
      {isCompiling ? "Compiling…" : hasCompiledBefore ? "Recompile" : "Compile"}
    </Button>
  );
}
