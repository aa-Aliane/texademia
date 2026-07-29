import { useEffect, useRef, useState } from "react";

interface PresenceUser {
  fileId: string;
  name: string;
  email: string;
  lastSeen: number;
}

const PRESENCE_INTERVAL_MS = 4000;
const STALE_AFTER_MS = 12000;

function resolveWsBase(): string {
  const httpBase = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
  return httpBase.replace(/^http/, "ws");
}

function buildPresenceMap(users: Map<string, PresenceUser>) {
  const map: Record<string, { connectionId: string; name: string; email: string }[]> = {};
  for (const [userId, u] of users) {
    (map[u.fileId] ??= []).push({ connectionId: userId, name: u.name, email: u.email });
  }
  return map;
}

export function useDocumentSocket(documentId: string, onCompileUpdate: (event: any) => void) {
  const [presenceByFile, setPresenceByFile] = useState<Record<string, any[]>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const activeFileRef = useRef<string | null>(null);
  const usersRef = useRef<Map<string, PresenceUser>>(new Map());
  const onCompileUpdateRef = useRef(onCompileUpdate);
  onCompileUpdateRef.current = onCompileUpdate;

  useEffect(() => {
    const url = `${resolveWsBase()}/api/texademia/ws/documents/${documentId}`;
    console.log("[ws] connecting to", url);
    const socket = new WebSocket(url);
    wsRef.current = socket;

    socket.onopen = () => console.log("[ws] open");
    socket.onclose = (e) => console.log("[ws] closed", e.code, e.reason);
    socket.onerror = (e) => console.log("[ws] error", e);

    const heartbeat = setInterval(() => {
      console.log("[ws] readyState:", socket.readyState, "activeFile:", activeFileRef.current);
      if (socket.readyState === WebSocket.OPEN && activeFileRef.current) {
        socket.send(JSON.stringify({ type: "presence", fileId: activeFileRef.current }));
      }
    }, PRESENCE_INTERVAL_MS);

    const sweep = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [userId, u] of usersRef.current) {
        if (now - u.lastSeen > STALE_AFTER_MS) {
          usersRef.current.delete(userId);
          changed = true;
        }
      }
      if (changed) setPresenceByFile(buildPresenceMap(usersRef.current));
    }, 3000);

    socket.onmessage = (event) => {
      console.log("[ws] message received:", event.data);
      const payload = JSON.parse(event.data);
      if (payload.type === "presence") {
        usersRef.current.set(payload.userId, {
          fileId: payload.fileId,
          name: payload.name,
          email: payload.email,
          lastSeen: Date.now(),
        });
        setPresenceByFile(buildPresenceMap(usersRef.current));
      } else if (payload.type === "compile:update") {
        onCompileUpdateRef.current(payload);
      }
    };

    return () => {
      console.log("[ws] effect cleanup — closing socket, readyState was", socket.readyState);
      clearInterval(heartbeat);
      clearInterval(sweep);
      socket.close();
    };
  }, [documentId]);

  const setActiveFile = (fileId: string) => {
    activeFileRef.current = fileId;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "presence", fileId }));
    }
  };

  return { presenceByFile, setActiveFile };
}
