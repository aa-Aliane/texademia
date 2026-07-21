import { Button } from "@mantine/core";

interface CompileButtonProps {
  onCompile: () => void;
  isCompiling: boolean;
}

export function CompileButton({ onCompile, isCompiling }: CompileButtonProps) {
  return (
    <Button onClick={onCompile} loading={isCompiling}>
      Compile
    </Button>
  );
}
