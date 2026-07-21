# Tree View:
```
frontend/src/features
└── redaction
    ├── api
    │   └── redaction.ts
    ├── components
    │   ├── compileButton.tsx
    │   ├── editor.tsx
    │   ├── fileTabs.tsx
    │   ├── pdfPreview.tsx
    │   └── redactionPage.tsx
    ├── hooks
    │   ├── useCompileDocument.ts
    │   └── useDocuments.ts
    ├── index.ts
    ├── store
    │   └── editorStore.ts
    └── types
        └── redaction.ts

```

# Content:

## redaction/api/redaction.ts

```ts
import { queryOptions } from "@tanstack/react-query";
import { api, toPublicUrl } from "#/shared/api/client";
import type { CompileResponse, ProjectFile, RedactionDocument } from "../types/redaction";

interface DocumentDto {
  id: string;
  title: string;
  template: string;
  files: { id: string; name: string; language: "latex" | "bibtex"; content: string }[];
}

function mapDocument(data: DocumentDto): RedactionDocument {
  return data;
}

export async function createDocument(
  title: string,
  template: string,
  cookieHeader?: string | null
): Promise<RedactionDocument> {
  const data = await api.post<DocumentDto>("/api/texademia/documents", { title, template }, { cookieHeader });
  return mapDocument(data);
}

export async function getDocument(id: string, cookieHeader?: string | null): Promise<RedactionDocument> {
  const data = await api.get<DocumentDto>(`/api/texademia/documents/${id}`, { cookieHeader });
  return mapDocument(data);
}

export const documentQueryOptions = (documentId: string, cookieHeader?: string | null) =>
  queryOptions({
    queryKey: ["document", documentId],
    queryFn: () => getDocument(documentId, cookieHeader),
  });

async function saveFile(documentId: string, fileId: string, content: string): Promise<void> {
  await api.patch(`/api/texademia/documents/${documentId}/files/${fileId}`, { content });
}

export async function compileDocument(
  documentId: string,
  files: ProjectFile[]
): Promise<CompileResponse> {
  await Promise.all(files.map((f) => saveFile(documentId, f.id, f.content)));
  const data = await api.post<{ pdf_url: string }>(`/api/texademia/documents/${documentId}/compile`);
  return { pdfUrl: toPublicUrl(data.pdf_url) };
}

```


## redaction/components/compileButton.tsx

```tsx
import { Button } from "@mantine/core";

interface CompileButtonProps {
  onCompile: () => void;
  isCompiling: boolean;
}

export function CompileButton({ onCompile, isCompiling }: CompileButtonProps) {
  return (
    <Button onClick={onCompile} loading={isCompiling}>
      Compile
    </Button>
  );
}

```


## redaction/components/editor.tsx

```tsx
import CodeMirror from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";

// swap for a dedicated bibtex mode later if you want stricter highlighting.

interface EditorProps {
  value: string;
  language: "latex" | "bibtex";
  onChange: (value: string) => void;
}

export function Editor({ value, onChange }: EditorProps) {
  return (
    <CodeMirror
      value={value}
      height="100%"
      extensions={[StreamLanguage.define(stex)]}
      onChange={(val) => onChange(val)}
      style={{ height: "100%", border: "1px solid #ccc" }}
    />
  );
}

```


## redaction/components/fileTabs.tsx

```tsx
import { Tabs } from "@mantine/core";
import type { ProjectFile } from "../types/redaction";

interface FileTabsProps {
  files: ProjectFile[];
  activeFileId: string;
  onSelect: (id: string) => void;
}

export function FileTabs({ files, activeFileId, onSelect }: FileTabsProps) {
  return (
    <Tabs value={activeFileId} onChange={(id) => id && onSelect(id)}>
      <Tabs.List>
        {files.map((f) => (
          <Tabs.Tab key={f.id} value={f.id}>
            {f.name}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  );
}

```


## redaction/components/pdfPreview.tsx

```tsx
interface PdfPreviewProps {
  pdfUrl: string | null;
}

export function PdfPreview({ pdfUrl }: PdfPreviewProps) {
  if (!pdfUrl) {
    return (
      <div style={{ padding: "12px", color: "#888" }}>
        No preview yet — compile to see the PDF.
      </div>
    );
  }

  return (
    <iframe
      src={pdfUrl}
      title="PDF Preview"
      style={{ width: "100%", height: "100%", border: "1px solid #ccc" }}
    />
  );
}

```


## redaction/components/redactionPage.tsx

```tsx
import { useQuery } from "@tanstack/react-query";
import { Group, Stack } from "@mantine/core";
import { Editor } from "./editor";
import { PdfPreview } from "./pdfPreview";
import { CompileButton } from "./compileButton";
import { FileTabs } from "./fileTabs";
import { useCompileDocument } from "../hooks/useCompileDocument";
import { documentQueryOptions } from "../api/redaction";
import { useEditorStore } from "../store/editorStore";

interface RedactionPageProps {
  documentId: string;
}

export function RedactionPage({ documentId }: RedactionPageProps) {
  // Cache is already warm — the route loader awaited this exact query.
  const { data: document } = useQuery(documentQueryOptions(documentId));

  const files = useEditorStore((s) => s.files);
  const activeFileId = useEditorStore((s) => s.activeFileId);
  const setFiles = useEditorStore((s) => s.setFiles);
  const setActiveFileId = useEditorStore((s) => s.setActiveFileId);
  const updateActiveFileContent = useEditorStore(
    (s) => s.updateActiveFileContent,
  );

  // First render after navigation: store is empty, server data is ready synchronously
  // (thanks to the loader) — seed it here, no effect needed.
  if (files.length === 0 && document) {
    setFiles(document.files);
  }

  const {
    mutate: compile,
    data: compileResult,
    isPending: isCompiling,
  } = useCompileDocument(documentId);

  if (!document || !activeFileId) return null;

  const activeFile = files.find((f) => f.id === activeFileId)!;

  return (
    <Stack h="100%" gap="md">
      <Group>
        <CompileButton
          onCompile={() => compile(files)}
          isCompiling={isCompiling}
        />
      </Group>
      <Group align="stretch" style={{ flex: 1 }} gap="md">
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <FileTabs
            files={files}
            activeFileId={activeFileId}
            onSelect={setActiveFileId}
          />
          <div style={{ flex: 1 }}>
            <Editor
              value={activeFile.content}
              language={activeFile.language}
              onChange={updateActiveFileContent}
            />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <PdfPreview pdfUrl={compileResult?.pdfUrl ?? null} />
        </div>
      </Group>
    </Stack>
  );
}

```


## redaction/hooks/useCompileDocument.ts

```ts
import { useMutation } from "@tanstack/react-query";
import { compileDocument } from "../api/redaction";
import type { ProjectFile } from "../types/redaction";

export function useCompileDocument(documentId: string) {
  return useMutation({
    mutationFn: (files: ProjectFile[]) => compileDocument(documentId, files),
  });
}

```


## redaction/hooks/useDocuments.ts

```ts
import { useMutation, useQuery } from "@tanstack/react-query";
import { createDocument, getDocument } from "../api/redaction";

export function useDocument(documentId: string | null) {
  return useQuery({
    queryKey: ["document", documentId],
    queryFn: () => getDocument(documentId!),
    enabled: !!documentId,
  });
}

export function useCreateDocument() {
  return useMutation({
    mutationFn: ({ title, template }: { title: string; template: string }) =>
      createDocument(title, template),
  });
}

```


## redaction/index.ts

```ts
export { RedactionPage } from "./components/redactionPage";
export { createDocument, documentQueryOptions } from "./api/redaction";

```


## redaction/store/editorStore.ts

```ts
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

```


## redaction/types/redaction.ts

```ts
export interface ProjectFile {
  id: string;
  name: string;
  language: "latex" | "bibtex";
  content: string;
}

export interface RedactionDocument {
  id: string;
  title: string;
  template: string;
  files: ProjectFile[];
}

export interface CompileResponse {
  pdfUrl: string;
}

export interface CompileError {
  message: string;
  log?: string;
}

```

