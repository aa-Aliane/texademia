// redaction/hooks/useCompileDocument.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { startCompileJob, pollCompileStatus } from "../api/redaction";
import type { ProjectFile } from "../types/redaction";

export type CompilePhase = "idle" | "saving" | "queued" | "running" | "done" | "error";

export interface CompileState {
  phase: CompilePhase;
  progress: number;
  message: string;
  pdfUrl: string | null;
  error: string | null;
  log: string | null;
}

function toPublicUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${import.meta.env.VITE_API_URL ?? ""}${path}`;
}

function addCacheBuster(url: string, key: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${key}`;
}

export function useCompileDocument(documentId: string, initialPdfUrl: string | null) {
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);
  // Busts browser/iframe caching for the PDF URL. The mount-time key keeps the
  // initial preview fresh; each compile uses its job id so recompiles always
  // reload instead of showing a stale cached PDF.
  const [pdfCacheKey] = useState(() => `${Date.now()}`);

  const startMutation = useMutation({
    mutationFn: (files: ProjectFile[]) => startCompileJob(documentId, files),
    onSuccess: (data) => {
      setJobId(data.jobId);
      // Files were just saved; refresh the server snapshot so the dirty count
      // drops to zero after a successful recompile.
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
    },
  });

  const pollQuery = useQuery({
    queryKey: ["compile-job", jobId],
    queryFn: () => pollCompileStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "done" || data?.status === "error") {
        return false;
      }
      return 800;
    },
  });

  const getPhase = (): CompilePhase => {
    if (startMutation.isPending) return "saving";
    if (!pollQuery.data) {
      if (jobId) return "queued";
      return initialPdfUrl ? "done" : "idle"; // NEW
    }
    if (pollQuery.data.status === "done") return "done";
    if (pollQuery.data.status === "error") return "error";
    if (pollQuery.data.status === "running") return "running";
    return "queued";
  };

  const phase = getPhase();
  const progress = pollQuery.data?.percent ?? (startMutation.isPending ? 5 : 0);
  const message = pollQuery.data?.message ?? (startMutation.isPending ? "Saving files..." : "Ready");
  const pdfUrl = pollQuery.data?.result?.pdf_url
    ? addCacheBuster(toPublicUrl(pollQuery.data.result.pdf_url), jobId ?? pdfCacheKey)
    : !jobId && initialPdfUrl
      ? addCacheBuster(initialPdfUrl, pdfCacheKey)
      : null;

  // DEBUG
  console.log("[compile] derived pdfUrl", { phase, jobId, pdfUrl });

  const error = pollQuery.data?.status === "error"
    ? (pollQuery.data.error ?? "Compilation failed")
    : startMutation.isError
    ? (startMutation.error as Error)?.message ?? "Failed to start compilation"
    : null;
  const log = pollQuery.data?.result?.log ?? null;

  const isActive = phase === "saving" || phase === "queued" || phase === "running";
  const isDone = phase === "done";
  const isError = phase === "error";

  const compile = (files: ProjectFile[]) => {
    setJobId(null);
    queryClient.removeQueries({ queryKey: ["compile-job"] });
    startMutation.mutate(files);
  };

  return {
    compile,
    phase,
    progress,
    message,
    pdfUrl,
    error,
    log,
    isActive,
    isDone,
    isError,
    jobId,
    pollData: pollQuery.data,
  };
}
