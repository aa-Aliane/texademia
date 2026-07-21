import { create } from "zustand";
import type { ProjectFile } from "../types/redaction";

interface EditorState {
  files: ProjectFile[];
  activeFileId: string | null;
  setFiles: (files: ProjectFile[]) => void;
  setActiveFileId: (id: string) => void;
  updateActiveFileContent: (content: string) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  files: [],
  activeFileId: null,
  setFiles: (files) =>
    set((state) => ({
      files,
      activeFileId: state.activeFileId ?? files[0]?.id ?? null,
    })),
  setActiveFileId: (id) => set({ activeFileId: id }),
  updateActiveFileContent: (content) => {
    const { activeFileId, files } = get();
    set({
      files: files.map((f) => (f.id === activeFileId ? { ...f, content } : f)),
    });
  },
}));
