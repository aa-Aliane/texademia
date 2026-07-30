// src/features/redaction/store/documentsStore.ts
import { create } from "zustand";

interface DocumentsUIStoreState {
  dialogOpened: boolean;
  setDialogOpened: (open: boolean) => void;
}

export const useDocumentsUIStore = create<DocumentsUIStoreState>((set) => ({
  dialogOpened: false,
  setDialogOpened: (open: boolean) => set({ dialogOpened: open }),
}));
