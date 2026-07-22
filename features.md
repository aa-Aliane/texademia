# Tree View:
```
frontend/src/features
└── redaction
    ├── api
    │   └── redaction.ts
    ├── components
    │   ├── compileButton.tsx
    │   ├── createDocumentDialog.tsx
    │   ├── documentHeader.tsx
    │   ├── documentMenu.tsx
    │   ├── documentsListPage.tsx
    │   ├── editor.tsx
    │   ├── fileTabs.tsx
    │   ├── pdfPreview.tsx
    │   └── redactionPage.tsx
    ├── hooks
    │   ├── useCompileDocument.ts
    │   ├── useDocuments.ts
    │   └── useUpdateDocumentTitle.ts
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

export async function updateDocumentTitle(
  documentId: string,
  title: string
): Promise<RedactionDocument> {
  const data = await api.patch<DocumentDto>(`/api/texademia/documents/${documentId}`, { title });
  return mapDocument(data);
}

export async function listDocuments(cookieHeader?: string | null): Promise<RedactionDocument[]> {
  const data = await api.get<DocumentDto[]>("/api/texademia/documents", { cookieHeader });
  return data.map(mapDocument);
}

export const documentsQueryOptions = (cookieHeader?: string | null) =>
  queryOptions({
    queryKey: ["documents"],
    queryFn: () => listDocuments(cookieHeader),
  });

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
    <Button onClick={onCompile} disabled={isCompiling}>
      {isCompiling ? "Compiling…" : "Compile"}
    </Button>
  );
}

```


## redaction/components/createDocumentDialog.tsx

```tsx
import { useState } from "react";
import { Button, Modal, Stack, TextInput, SegmentedControl, Text } from "@mantine/core";

const TEMPLATES = [
  { value: "default", label: "Default", description: "Plain article, minimal starter" },
  { value: "arxiv", label: "arXiv", description: "Preprint style with abstract" },
  { value: "ieee", label: "IEEE", description: "Conference paper (IEEEtran)" },
];

interface CreateDocumentDialogProps {
  opened: boolean;
  onClose: () => void;
  onCreate: (title: string, template: string) => void;
  isCreating: boolean;
}

export function CreateDocumentDialog({
  opened,
  onClose,
  onCreate,
  isCreating,
}: CreateDocumentDialogProps) {
  const [title, setTitle] = useState("Untitled");
  const [template, setTemplate] = useState("default");

  const handleSubmit = () => {
    onCreate(title.trim() || "Untitled", template);
  };

  return (
    <Modal opened={opened} onClose={onClose} title="New document" centered>
      <Stack gap="md">
        <TextInput
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          data-autofocus
        />

        <Stack gap={4}>
          <Text size="sm" fw={500}>Template</Text>
          <SegmentedControl
            fullWidth
            value={template}
            onChange={setTemplate}
            data={TEMPLATES.map((t) => ({ value: t.value, label: t.label }))}
          />
          <Text size="xs" c="dimmed">
            {TEMPLATES.find((t) => t.value === template)?.description}
          </Text>
        </Stack>

        <Button onClick={handleSubmit} loading={isCreating} fullWidth>
          Create
        </Button>
      </Stack>
    </Modal>
  );
}

```


## redaction/components/documentHeader.tsx

```tsx
// redaction/components/documentHeader.tsx
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Group, Text, TextInput, Loader, ActionIcon } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { AppShellHeaderPortal } from "#/shared/ui/app-shell/headerPortal";
import { CompileButton } from "./compileButton";
import { DocumentMenu } from "./documentMenu";

type CompileStatus = "idle" | "compiling" | "success" | "error";

interface DocumentHeaderProps {
  title: string;
  onTitleSave: (title: string) => void;
  isSavingTitle: boolean;
  onCompile: () => void;
  compileStatus: CompileStatus;
  compileError?: string;
  template: string;
  pdfUrl: string | null;
}

function EditableTitle({
  title,
  onSave,
  isSaving,
}: {
  title: string;
  onSave: (title: string) => void;
  isSaving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);

  useEffect(() => setValue(title), [title]);

  const commit = () => {
    setEditing(false);
    const trimmed = value.trim() || "Untitled";
    if (trimmed !== title) onSave(trimmed);
    else setValue(title);
  };

  if (editing) {
    return (
      <TextInput
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setValue(title);
            setEditing(false);
          }
        }}
        autoFocus
        variant="unstyled"
        styles={{ input: { fontSize: 16, fontWeight: 600, textAlign: "center" } }}
      />
    );
  }

  return (
    <Group gap={6} wrap="nowrap" onClick={() => setEditing(true)} style={{ cursor: "text" }}>
      <Text fw={600} size="sm" truncate>
        {title}
      </Text>
      {isSaving && <Loader size="xs" />}
    </Group>
  );
}

function CompileStatusLabel({ status, error }: { status: CompileStatus; error?: string }) {
  if (status === "compiling") {
    return (
      <Group gap={4} wrap="nowrap">
        <Loader size="xs" />
        <Text size="xs" c="dimmed">Compiling…</Text>
      </Group>
    );
  }
  if (status === "success") return <Text size="xs" c="teal">Compiled</Text>;
  if (status === "error") return <Text size="xs" c="red">{error ?? "Compile failed"}</Text>;
  return <Text size="xs" c="dimmed">Not compiled yet</Text>;
}

export function DocumentHeader({
  title,
  onTitleSave,
  isSavingTitle,
  onCompile,
  compileStatus,
  compileError,
  template,
  pdfUrl,
}: DocumentHeaderProps) {
  return (
    <>
      <AppShellHeaderPortal slot="center">
        <Group gap={8} wrap="nowrap">
          <ActionIcon component={Link} to="/redaction" variant="subtle" size="sm" aria-label="Back to documents">
            <IconArrowLeft size={16} />
          </ActionIcon>
          <EditableTitle title={title} onSave={onTitleSave} isSaving={isSavingTitle} />
        </Group>
      </AppShellHeaderPortal>

      <AppShellHeaderPortal slot="actions">
        <Group gap="md" wrap="nowrap">
          <CompileStatusLabel status={compileStatus} error={compileError} />
          <DocumentMenu template={template} pdfUrl={pdfUrl} />
          <CompileButton onCompile={onCompile} isCompiling={compileStatus === "compiling"} />
        </Group>
      </AppShellHeaderPortal>
    </>
  );
}

```


## redaction/components/documentMenu.tsx

```tsx
// redaction/components/documentMenu.tsx
import { Menu, ActionIcon, Badge, Text } from "@mantine/core";
import {
  IconDots,
  IconCopy,
  IconDownload,
  IconFileZip,
  IconTrash,
} from "@tabler/icons-react";

interface DocumentMenuProps {
  template: string;
  pdfUrl: string | null;
}

const TEMPLATE_LABELS: Record<string, string> = {
  default: "Default",
  arxiv: "arXiv",
  ieee: "IEEE",
};

export function DocumentMenu({ template, pdfUrl }: DocumentMenuProps) {
  return (
    <Menu position="bottom-end" shadow="md" width={240}>
      <Menu.Target>
        <ActionIcon variant="subtle" size="sm" aria-label="Document options">
          <IconDots size={18} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>
          <Text size="xs" c="dimmed" span>Template</Text>{" "}
          <Badge size="xs" variant="light">
            {TEMPLATE_LABELS[template] ?? template}
          </Badge>
        </Menu.Label>

        <Menu.Item
          leftSection={<IconDownload size={16} />}
          component="a"
          href={pdfUrl ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          disabled={!pdfUrl}
        >
          {pdfUrl ? "Download PDF" : "Download PDF (compile first)"}
        </Menu.Item>

        <Menu.Item leftSection={<IconFileZip size={16} />} disabled>
          Download source (.zip)
        </Menu.Item>

        <Menu.Item leftSection={<IconCopy size={16} />} disabled>
          Duplicate
        </Menu.Item>

        <Menu.Divider />

        <Menu.Item color="red" leftSection={<IconTrash size={16} />} disabled>
          Delete document
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

```


## redaction/components/documentsListPage.tsx

```tsx
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { createDocument, documentsQueryOptions } from "../api/redaction";
import { CreateDocumentDialog } from "./createDocumentDialog";

export function DocumentsListPage() {
  const { data: documents } = useQuery(documentsQueryOptions());
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpened, setDialogOpened] = useState(false);

  const { mutate: createNew, isPending: isCreating } = useMutation({
    mutationFn: ({ title, template }: { title: string; template: string }) =>
      createDocument(title, template),
    onSuccess: (doc) => {
      setDialogOpened(false);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      navigate({ to: "/redaction/$documentId", params: { documentId: doc.id } });
    },
  });

  return (
    <Stack p="md" gap="md">
      <Group justify="space-between">
        <Title order={2}>Your documents</Title>
        <Button onClick={() => setDialogOpened(true)}>New document</Button>
      </Group>

      {documents?.length === 0 && (
        <Text c="dimmed">No documents yet — create one to get started.</Text>
      )}

      <Stack gap="xs">
        {documents?.map((doc) => (
          <Card
            key={doc.id}
            withBorder
            component="button"
            onClick={() => navigate({ to: "/redaction/$documentId", params: { documentId: doc.id } })}
            style={{ textAlign: "left", cursor: "pointer" }}
          >
            <Text fw={500}>{doc.title}</Text>
            <Text size="sm" c="dimmed">{doc.template}</Text>
          </Card>
        ))}
      </Stack>

      <CreateDocumentDialog
        opened={dialogOpened}
        onClose={() => setDialogOpened(false)}
        onCreate={(title, template) => createNew({ title, template })}
        isCreating={isCreating}
      />
    </Stack>
  );
}

```


## redaction/components/editor.tsx

```tsx
import CodeMirror from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";

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
      style={{ height: "100%" }}
    />
  );
}

```


## redaction/components/fileTabs.tsx

```tsx
import { Tabs, Group } from "@mantine/core";
import { IconFileText } from "@tabler/icons-react";
import type { ProjectFile } from "../types/redaction";

export const PREVIEW_TAB_ID = "__preview__";

interface FileTabsProps {
  files: ProjectFile[];
  activeTabId: string;
  onSelect: (id: string) => void;
}

export function FileTabs({ files, activeTabId, onSelect }: FileTabsProps) {
  return (
    <Tabs value={activeTabId} onChange={(id) => id && onSelect(id)}>
      <Tabs.List>
        {files.map((f) => (
          <Tabs.Tab key={f.id} value={f.id}>
            {f.name}
          </Tabs.Tab>
        ))}
        <Tabs.Tab
          value={PREVIEW_TAB_ID}
          ml="auto"
          leftSection={<IconFileText size={14} />}
          color="violet"
        >
          Preview
        </Tabs.Tab>
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
// redaction/components/redactionPage.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Editor } from "./editor";
import { PdfPreview } from "./pdfPreview";
import { FileTabs, PREVIEW_TAB_ID } from "./fileTabs";
import { DocumentHeader } from "./documentHeader";
import { useCompileDocument } from "../hooks/useCompileDocument";
import { useUpdateDocumentTitle } from "../hooks/useUpdateDocumentTitle";
import { documentQueryOptions } from "../api/redaction";
import type { ProjectFile } from "../types/redaction";

interface RedactionPageProps {
  documentId: string;
}

export function RedactionPage({ documentId }: RedactionPageProps) {
  const { data: document } = useQuery(documentQueryOptions(documentId));

  const [files, setFiles] = useState<ProjectFile[]>(() => document?.files ?? []);
  const [activeFileId, setActiveFileId] = useState<string | null>(
    () => document?.files[0]?.id ?? null
  );
  const [activeTabId, setActiveTabId] = useState<string>("");

  const {
    mutate: compile,
    data: compileResult,
    isPending: isCompiling,
    isSuccess: isCompileSuccess,
    isError: isCompileError,
    error: compileError,
  } = useCompileDocument(documentId);

  const { mutate: saveTitle, isPending: isSavingTitle } = useUpdateDocumentTitle(documentId);

  if (!document || !activeFileId) return null;

  const currentTabId = activeTabId || activeFileId;
  const activeFile = files.find((f) => f.id === currentTabId);

  const updateActiveFileContent = (content: string) => {
    setFiles((prev) => prev.map((f) => (f.id === activeFileId ? { ...f, content } : f)));
  };

  const handleSelectTab = (id: string) => {
    setActiveTabId(id);
    if (id !== PREVIEW_TAB_ID) setActiveFileId(id);
  };

  const compileStatus = isCompiling
    ? "compiling"
    : isCompileError
    ? "error"
    : isCompileSuccess
    ? "success"
    : "idle";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <DocumentHeader
        title={document.title}
        onTitleSave={saveTitle}
        isSavingTitle={isSavingTitle}
        onCompile={() => compile(files)}
        compileStatus={compileStatus}
        compileError={(compileError as any)?.message}
        template={document.template}
        pdfUrl={compileResult?.pdfUrl ?? null}
      />

      <FileTabs files={files} activeTabId={currentTabId} onSelect={handleSelectTab} />

      <div style={{ flex: 1, minHeight: 0 }}>
        {currentTabId === PREVIEW_TAB_ID ? (
          <PdfPreview pdfUrl={compileResult?.pdfUrl ?? null} />
        ) : activeFile ? (
          <Editor
            value={activeFile.content}
            language={activeFile.language}
            onChange={updateActiveFileContent}
          />
        ) : null}
      </div>
    </div>
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


## redaction/hooks/useUpdateDocumentTitle.ts

```ts
// redaction/hooks/useUpdateDocumentTitle.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateDocumentTitle } from "../api/redaction";

export function useUpdateDocumentTitle(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => updateDocumentTitle(documentId, title),
    onSuccess: (updated) => {
      queryClient.setQueryData(["document", documentId], updated);
      queryClient.invalidateQueries({ queryKey: ["documents"] }); // list page shows new title too
    },
  });
}

```


## redaction/index.ts

```ts
export { RedactionPage } from "./components/redactionPage";
export { DocumentsListPage } from "./components/documentsListPage"
export { createDocument, documentQueryOptions, documentsQueryOptions } from "./api/redaction";

```


## redaction/store/editorStore.ts

```ts
import { create } from "zustand";
import type { ProjectFile } from "../types/redaction";

interface EditorState {
  documentId: string | null;
  files: ProjectFile[];
  activeFileId: string | null;
  loadDocument: (documentId: string, files: ProjectFile[]) => void;
  setActiveFileId: (id: string) => void;
  updateActiveFileContent: (content: string) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  documentId: null,
  files: [],
  activeFileId: null,
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

