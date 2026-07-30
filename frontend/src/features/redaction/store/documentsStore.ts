// src/features/redaction/store/documentsStore.ts
import { create } from "zustand";
import type { RedactionDocument } from "../types/redaction";

interface DocumentsUIStoreState {
  // dialog opend state
  dialogOpened: boolean;
  setDialogOpened: (open: boolean) => void;

  // duplicate target state
  duplicateTarget: RedactionDocument | null;
  setDuplicateTarget: (target: RedactionDocument | null) => void;
}

export const useDocumentsUIStore = create<DocumentsUIStoreState>((set)   => ({
  // dialog opend state
  dialogOpened: false,
  setDialogOpened: (open: boolean) => set({ dialogOpened: open }),

  // duplicate target state
  duplicateTarget: null,
  setDuplicateTarget: (target: RedactionDocument | null) => set({ duplicateTarget: target }),

}));
