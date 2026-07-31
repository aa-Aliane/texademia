import { useEffect, useRef } from "react";
import { checkpointFile } from "../api/redaction";

const IDLE_MS = 30_000;

export function useIdleCheckpoint(documentId: string, fileId: string | null, content: string) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!fileId) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      checkpointFile(documentId, fileId).catch(() => {
        // best-effort background op — safe to ignore failures
      });
    }, IDLE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, fileId, content]);
}
