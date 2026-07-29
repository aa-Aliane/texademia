import { useEffect, useRef, useState } from "react";
import type { RemoteCursor } from "../components/cursorExtension";

interface PresenceUser {
  fileId: string;
  name: string;
  email: string;
  lastSeen: number;
}

interface CursorUser {
  fileId: string;
  name: string;
  email: string;
  pos: number;
  lastSeen: number;
}

const PRESENCE_INTERVAL_MS = 4000;
const STALE_AFTER_MS = 12000;
const CURSOR_STALE_AFTER_MS = 8000;

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 15000;

const AVATAR_COLORS = ["#4dabf7", "#9775fa", "#20c997", "#ff922b", "#f06595", "#748ffc"];
function colorFor(key: string) {
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

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

function buildCursorMap(cursors: Map<string, CursorUser>, selfUserId: string | null) {
  const map: Record<string, RemoteCursor[]> = {};
  for (const [userId, c] of cursors) {
    if (userId === selfUserId) continue;
    (map[c.fileId] ??= []).push({
      userId,
      name: c.name,
      color: colorFor(c.email ?? userId),
      pos: c.pos,
    });
  }
  return map;
}

export type ConnectionStatus = "connecting" | "open" | "reconnecting" | "closed";

export function useDocumentSocket(documentId: string, onCompileUpdate: (event: any) => void) {
  const [presenceByFile, setPresenceByFile] = useState<Record<string, any[]>>({});
  const [remoteCursorsByFile, setRemoteCursorsByFile] = useState<Record<string, RemoteCursor[]>>({});
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");

  const wsRef = useRef<WebSocket | null>(null);
  const activeFileRef = useRef<string | null>(null);
  const usersRef = useRef<Map<string, PresenceUser>>(new Map());
  const cursorsRef = useRef<Map<string, CursorUser>>(new Map());
  const selfUserIdRef = useRef<string | null>(null);

  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  const onCompileUpdateRef = useRef(onCompileUpdate);
  onCompileUpdateRef.current = onCompileUpdate;

  useEffect(() => {
    unmountedRef.current = false;

    const heartbeat = setInterval(() => {
      const socket = wsRef.current;
      if (socket?.readyState === WebSocket.OPEN && activeFileRef.current) {
        socket.send(JSON.stringify({ type: "presence", fileId: activeFileRef.current }));
      }
    }, PRESENCE_INTERVAL_MS);

    const sweep = setInterval(() => {
      const now = Date.now();
      let presenceChanged = false;
      for (const [userId, u] of usersRef.current) {
        if (now - u.lastSeen > STALE_AFTER_MS) {
          usersRef.current.delete(userId);
          presenceChanged = true;
        }
      }
      if (presenceChanged) setPresenceByFile(buildPresenceMap(usersRef.current));

      let cursorsChanged = false;
      for (const [userId, c] of cursorsRef.current) {
        if (now - c.lastSeen > CURSOR_STALE_AFTER_MS) {
          cursorsRef.current.delete(userId);
          cursorsChanged = true;
        }
      }
      if (cursorsChanged) {
        setRemoteCursorsByFile(buildCursorMap(cursorsRef.current, selfUserIdRef.current));
      }
    }, 3000);

    function connect() {
      if (unmountedRef.current) return;

      const url = `${resolveWsBase()}/api/texademia/ws/documents/${documentId}`;
      console.log("[ws] connecting to", url, "attempt", reconnectAttemptRef.current);
      setConnectionStatus(reconnectAttemptRef.current === 0 ? "connecting" : "reconnecting");

      const socket = new WebSocket(url);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log("[ws] open");
        reconnectAttemptRef.current = 0;
        setConnectionStatus("open");

        // Rejoin state that lived only in memory: tell the server (and thus
        // other collaborators) which file we're on again, since a stale
        // connection means everyone else's view of us just went silent.
        if (activeFileRef.current) {
          socket.send(JSON.stringify({ type: "presence", fileId: activeFileRef.current }));
        }
      };

      socket.onclose = (e) => {
        console.log("[ws] closed", e.code, e.reason);
        if (unmountedRef.current) return;

        setConnectionStatus("reconnecting");

        // Stale presence/cursors from before the drop are misleading once
        // we're disconnected — clear them rather than show frozen ghosts.
        usersRef.current.clear();
        cursorsRef.current.clear();
        setPresenceByFile({});
        setRemoteCursorsByFile({});

        const attempt = reconnectAttemptRef.current;
        const delay = Math.min(
          RECONNECT_BASE_DELAY_MS * 2 ** attempt,
          RECONNECT_MAX_DELAY_MS
        );
        reconnectAttemptRef.current = attempt + 1;

        console.log(`[ws] reconnecting in ${delay}ms`);
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      socket.onerror = (e) => {
        console.log("[ws] error", e);
        // onclose fires right after onerror for a failed connection —
        // no separate reconnect scheduling needed here.
      };

      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data);

        if (payload.type === "presence") {
          selfUserIdRef.current = selfUserIdRef.current; // unchanged, see note below
          usersRef.current.set(payload.userId, {
            fileId: payload.fileId,
            name: payload.name,
            email: payload.email,
            lastSeen: Date.now(),
          });
          setPresenceByFile(buildPresenceMap(usersRef.current));
        } else if (payload.type === "cursor") {
          cursorsRef.current.set(payload.userId, {
            fileId: payload.fileId,
            name: payload.name,
            email: payload.email,
            pos: payload.pos,
            lastSeen: Date.now(),
          });
          setRemoteCursorsByFile(buildCursorMap(cursorsRef.current, selfUserIdRef.current));
        } else if (payload.type === "ping") {
          socket.send(JSON.stringify({ type: "pong" }));
        } else if (payload.type === "compile:update") {
          onCompileUpdateRef.current(payload);
        }
      };
    }

    connect();

    return () => {
      unmountedRef.current = true;
      clearInterval(heartbeat);
      clearInterval(sweep);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [documentId]);

  const setActiveFile = (fileId: string) => {
    activeFileRef.current = fileId;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "presence", fileId }));
    }
  };

  const sendCursor = (fileId: string, pos: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "cursor", fileId, pos }));
    }
  };

  return { presenceByFile, remoteCursorsByFile, connectionStatus, setActiveFile, sendCursor };
}
