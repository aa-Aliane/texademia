// src/features/redaction/store/documentsStore.ts
import { create } from "zustand";
import type { RedactionDocument } from "../types/redaction";

export interface DocumentsUIStoreState {
  // dialog opend state
  dialogOpened: boolean;
  setDialogOpened: (open: boolean) => void;

  // duplicate target state
  duplicateTarget: RedactionDocument | null;
  setDuplicateTarget: (target: RedactionDocument | null) => void;

  // delete target state
  deleteTarget: RedactionDocument | null;
  setDeleteTarget: (target: RedactionDocument | null) => void;

  // collaborors target state
  collaboratorsTarget: RedactionDocument | null;
  setCollaboratorsTarget: (target: RedactionDocument | null) => void;

}

export const useDocumentsUIStore = create<DocumentsUIStoreState>((set)   => ({
  // dialog opend state
  dialogOpened: false,
  setDialogOpened: (open: boolean) => set({ dialogOpened: open }),

  // duplicate target state
  duplicateTarget: null,
  setDuplicateTarget: (target: RedactionDocument | null) => set({ duplicateTarget: target }),

  // delete target state
  deleteTarget: null,
  setDeleteTarget: (target: RedactionDocument | null) => set({ deleteTarget: target }),

  // collaborators target state
  collaboratorsTarget: null,
  setCollaboratorsTarget: (target: RedactionDocument | null) => set({ collaboratorsTarget: target }),

}));
