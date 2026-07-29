import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { startCompileJob, pollCompileStatus } from "../api/redaction";
import type { ProjectFile } from "../types/redaction";
import { useRedactionStore } from "../store/redactionStore";
import { LOG_TAB_ID, PREVIEW_TAB_ID } from "../components/fileTabs";

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

export function useCompileDocument(
  documentId: string,
  initialPdfUrl: string | null,
  liveRefreshKey: number = 0
) {
  const queryClient = useQueryClient();
  const setActiveTab = useRedactionStore((state) => state.setActiveTab);

  const [jobId, setJobId] = useState<string | null>(null);
  const [pdfCacheKey] = useState(() => `${Date.now()}`);

  const startMutation = useMutation({
    mutationFn: (files: ProjectFile[]) => startCompileJob(documentId, files),
    onSuccess: (data) => {
      setJobId(data.jobId);
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
    },
  });

  const pollQuery = useQuery({
    queryKey: ["compile-job", jobId],
    queryFn: () => pollCompileStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;

      // Handle side-effects cleanly inside the query callback when the job finishes
      if (data?.status === "done" && jobId) {
        setActiveTab(documentId, PREVIEW_TAB_ID);
        useRedactionStore.getState().clearDirty(documentId);
        setJobId(null);
        return false;
      }

      if (data?.status === "error" && jobId) {
        if (data.log) {
          setActiveTab(documentId, LOG_TAB_ID);
        }
        setJobId(null);
        return false;
      }

      return 800;
    },
  });

  const getPhase = (): CompilePhase => {
    if (startMutation.isPending) return "saving";
    if (!pollQuery.data) {
      if (jobId) return "queued";
      return initialPdfUrl ? "done" : "idle";
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
    ? addCacheBuster(initialPdfUrl, `${pdfCacheKey}-${liveRefreshKey}`)
    : null;

  const error =
    pollQuery.data?.status === "error"
      ? pollQuery.data.error ?? "Compilation failed"
      : startMutation.isError
      ? (startMutation.error as Error)?.message ?? "Failed to start compilation"
      : null;

  const log = pollQuery.data?.log ?? pollQuery.data?.result?.log ?? null;

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
