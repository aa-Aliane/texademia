// src/features/redaction/store/documentsStore.ts
import { create } from "zustand";
import type { RedactionDocument } from "../types/redaction";
import type { SortingState } from "@tanstack/react-table";

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

  // global filter state
  globalFilter: string;
  setGlobalFilter: (filter: string) => void;

  // sorting state
  sorting: SortingState;
  setSorting: (sorting: SortingState) => void;

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

   // global filter state
   globalFilter: "",
  setGlobalFilter: (filter: string) => set({ globalFilter: filter }),

  // sorting state
  sorting :  [{ id: "updatedAt", desc: true },
  setSorting: (sorting: SortingState) => set({ sorting }),

}));
