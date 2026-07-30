import { useEffect, useRef, useState } from "react";

interface DocViewer {
  documentId: string;
  userId: string;
  name: string;
  email: string;
  lastSeen: number;
}

const STALE_AFTER_MS = 12000;
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 15000;

function resolveWsBase(): string {
  const httpBase = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
  return httpBase.replace(/^http/, "ws");
}

function buildViewersMap(viewers: Map<string, DocViewer>) {
  const map: Record<string, { userId: string; name: string; email: string }[]> = {};
  for (const v of viewers.values()) {
    (map[v.documentId] ??= []).push({ userId: v.userId, name: v.name, email: v.email });
  }
  return map;
}

export function useDocumentsPresence() {
  const [viewersByDocument, setViewersByDocument] = useState<
    Record<string, { userId: string; name: string; email: string }[]>
  >({});

  const wsRef = useRef<WebSocket | null>(null);
  const viewersRef = useRef<Map<string, DocViewer>>(new Map());
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;

    const sweep = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [key, v] of viewersRef.current) {
        if (now - v.lastSeen > STALE_AFTER_MS) {
          viewersRef.current.delete(key);
          changed = true;
        }
      }
      if (changed) setViewersByDocument(buildViewersMap(viewersRef.current));
    }, 3000);

    function connect() {
      if (unmountedRef.current) return;

      const url = `${resolveWsBase()}/api/texademia/ws/documents-presence`;
      const socket = new WebSocket(url);
      wsRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptRef.current = 0;
      };

      socket.onclose = () => {
        if (unmountedRef.current) return;
        viewersRef.current.clear();
        setViewersByDocument({});

        const attempt = reconnectAttemptRef.current;
        const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** attempt, RECONNECT_MAX_DELAY_MS);
        reconnectAttemptRef.current = attempt + 1;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      socket.onerror = () => {
        // onclose fires right after — reconnect handled there.
      };

      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data);

        if (payload.type === "presence" && payload.documentId) {
          const key = `${payload.documentId}:${payload.userId}`;
          viewersRef.current.set(key, {
            documentId: payload.documentId,
            userId: payload.userId,
            name: payload.name,
            email: payload.email,
            lastSeen: Date.now(),
          });
          setViewersByDocument(buildViewersMap(viewersRef.current));
        } else if (payload.type === "ping") {
          socket.send(JSON.stringify({ type: "pong" }));
        }
      };
    }

    connect();

    return () => {
      unmountedRef.current = true;
      clearInterval(sweep);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, []);

  return viewersByDocument;
}
