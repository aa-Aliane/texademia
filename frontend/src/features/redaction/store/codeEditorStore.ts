// store/editorStore.ts
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { RemoteCursor } from "../components/cursorExtension";
import type { LineAuthor } from "../types/redaction";

const MAX_TRACKED_DOCS = 200;

interface GotoLineRequest {
  line: number;
  nonce: number;
}

interface CodeEditorState {
  lineAuthors: LineAuthor[];
  remoteCursors: RemoteCursor[];
  gotoLineRequest: GotoLineRequest | null;
  cursorPositions: Record<string, number>;
  scrollPositions: Record<string, number>;
}

interface CodeEditorActions {
  setLineAuthors: (a: LineAuthor[]) => void;
  setRemoteCursors: (c: RemoteCursor[]) => void;
  requestGotoLine: (line: number) => void;
  saveCursor: (documentId: string, pos: number) => void;
  saveScroll: (documentId: string, top: number) => void;
}

type CodeEditorStore = CodeEditorState & CodeEditorActions;

export const useCodeEditorStore = create<CodeEditorStore>()(
  persist(
    (set) => ({
      lineAuthors: [],
      remoteCursors: [],
      gotoLineRequest: null,
      cursorPositions: {},
      scrollPositions: {},

      setLineAuthors: (a) => set({ lineAuthors: a }),
      setRemoteCursors: (c) => set({ remoteCursors: c }),
      requestGotoLine: (line) =>
        set((s) => ({ gotoLineRequest: { line, nonce: (s.gotoLineRequest?.nonce ?? 0) + 1 } })),
      saveCursor: (documentId, pos) =>
        set((s) => {
          const next = { ...s.cursorPositions, [documentId]: pos };
          const keys = Object.keys(next);
          if (keys.length > MAX_TRACKED_DOCS) {
            // drop oldest-inserted key (Object key order = insertion order in JS)
            delete next[keys[0]];
          }
          return { cursorPositions: next };
        }),
      saveScroll: (documentId, top) =>
        set((s) => {
          const next = { ...s.scrollPositions, [documentId]: top };
          const keys = Object.keys(next);
          if (keys.length > MAX_TRACKED_DOCS) {
            delete next[keys[0]];
          }
          return { scrollPositions: next };
        }),
  }),
    {
      name: "editor-store", // localStorage key
      storage: createJSONStorage(() => localStorage),
      version: 1,

      partialize: (state) => ({
        cursorPositions: state.cursorPositions,
        scrollPositions: state.scrollPositions,
      }),

      merge: (persisted, current) => {
        const p = persisted as Partial<CodeEditorState>;
        return { ...current, ...p };
      },
    }
  )
);
