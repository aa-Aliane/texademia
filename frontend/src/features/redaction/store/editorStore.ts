import { create } from "zustand";
import type { ProjectFile } from "../types/redaction";

interface EditorState {
  documentId: string | null;
  files: ProjectFile[];
  activeFileId: string | null;
  loadDocument: (documentId: string, files: ProjectFile[]) => void;
  setActiveFileId: (id: string) => void;
  updateActiveFileContent: (content: string) => void;
  setFileContent: (fileId: string, content: string) => void;
  historyOpened: boolean,
  setHistoryOpened: (opened: boolean) => void,
}

export const useEditorStore = create<EditorState>((set, get) => ({
  documentId: null,
  files: [],
  activeFileId: null,
  historyOpened: false,
  loadDocument: (documentId, files) =>
    set({
      documentId,
      files,
      activeFileId: files[0]?.id ?? null,
    }),
  setActiveFileId: (id) => set({ activeFileId: id }),
  updateActiveFileContent: (content) => {
    const { activeFileId, files } = get();
    set({
      files: files.map((f) => (f.id === activeFileId ? { ...f, content } : f)),
    });
  },
  setFileContent: (fileId, content) => {
      set((state) => ({
        files: state.files.map((f) => (f.id === fileId ? { ...f, content } : f)),
      }));
  },

  setHistoryOpened: (opened:boolean) => set({ historyOpened: opened }),
}));
