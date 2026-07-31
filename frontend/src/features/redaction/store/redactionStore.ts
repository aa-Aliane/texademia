// src/features/redaction/store/redactionStore.ts
import { create } from "zustand";

interface RedactionUIStore {
  activeTabs: Record<string, string>;
  activeFiles: Record<string, string>;
  dialogs: Record<string, { duplicate?: boolean; collaborators?: boolean; history?: boolean }>;
  dirtyFiles: Record<string, Set<string>>;

  setActiveTab: (documentId: string, tabId: string) => void;
  setActiveFile: (documentId: string, fileId: string) => void;
  setDialog: (documentId: string, dialog: "duplicate" | "collaborators" | "history", open: boolean) => void;
  markFileDirty: (documentId: string, fileId: string) => void;
  clearDirty: (documentId: string) => void;
}

export const useRedactionStore = create<RedactionUIStore>((set) => ({
  activeTabs: {},
  activeFiles: {},
  dialogs: {},
  dirtyFiles: {},

  // Actual function implementations (comma-separated, no type signatures here)
  setActiveTab: (documentId, tabId) =>
    set((state) => ({
      activeTabs: { ...state.activeTabs, [documentId]: tabId },
    })),

  setActiveFile: (documentId, fileId) =>
    set((state) => ({
      activeFiles: { ...state.activeFiles, [documentId]: fileId },
    })),

  setDialog: (documentId, dialog, open) =>
    set((state) => ({
      dialogs: {
        ...state.dialogs,
        [documentId]: { ...state.dialogs[documentId], [dialog]: open },
      },
    })),

  markFileDirty: (documentId, fileId) =>
    set((state) => {
      const current = state.dirtyFiles[documentId] ?? new Set<string>();
      if (current.has(fileId)) return state;
      const next = new Set(current);
      next.add(fileId);
      return { dirtyFiles: { ...state.dirtyFiles, [documentId]: next } };
    }),

  clearDirty: (documentId) =>
    set((state) => ({
      dirtyFiles: { ...state.dirtyFiles, [documentId]: new Set() },
    })),
}));
