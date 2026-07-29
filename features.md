# Tree View:
```
frontend/src/features
├── auth
│   ├── api
│   │   └── auth.ts
│   ├── components
│   │   ├── loginForm.tsx
│   │   ├── profileForm.tsx
│   │   ├── registerForm.tsx
│   │   └── userMenu.tsx
│   ├── guards
│   │   └── requireAuth.ts
│   ├── hooks
│   │   └── useAuth.ts
│   ├── index.ts
│   ├── schemas
│   │   └── auth.ts
│   └── types
│       └── auth.ts
└── redaction
    ├── api
    │   └── redaction.ts
    ├── components
    │   ├── blameExtension.ts
    │   ├── collaboratorsDialog.tsx
    │   ├── compileButton.tsx
    │   ├── createDocumentDialog.tsx
    │   ├── documentHeader.tsx
    │   ├── documentMenu.tsx
    │   ├── documentsListPage.module.css
    │   ├── documentsListPage.tsx
    │   ├── duplicateDocumentDialog.tsx
    │   ├── editor.tsx
    │   ├── fileTabs.tsx
    │   ├── invitationsBell.tsx
    │   ├── pdfPreview.tsx
    │   └── redactionPage.tsx
    ├── hooks
    │   ├── useCollaborators.ts
    │   ├── useCompileDocument.ts
    │   ├── useDocuments.ts
    │   ├── useDocumentSocket.ts
    │   └── useUpdateDocumentTitle.ts
    ├── index.ts
    ├── store
    │   ├── editorStore.ts
    │   └── headerStore.ts
    └── types
        └── redaction.ts

```

# Content:

## auth/api/auth.ts

```ts
import { queryOptions } from "@tanstack/react-query";
import { api } from "#/shared/api/client";
import type { User } from "../types/auth";

interface UserDto {
  id: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  is_verified: boolean;
  first_name?: string | null;
  last_name?: string | null;
}

function mapUser(data: UserDto): User {
  return {
    id: data.id,
    email: data.email,
    isActive: data.is_active,
    isSuperuser: data.is_superuser,
    isVerified: data.is_verified,
    firstName: data.first_name ?? null,
    lastName: data.last_name ?? null,
  };
}

export async function updateCurrentUser(updates: { firstName?: string; lastName?: string }): Promise<User> {
  const data = await api.patch<UserDto>("/api/auth/users/me", {
    first_name: updates.firstName,
    last_name: updates.lastName,
  });
  return mapUser(data);
}

export async function getCurrentUser(cookieHeader?: string | null): Promise<User> {
  const data = await api.get<UserDto>("/api/auth/users/me", { cookieHeader });
  return mapUser(data);
}

export const currentUserQueryOptions = (cookieHeader?: string | null) =>
  queryOptions({
    queryKey: ["current-user"],
    queryFn: () => getCurrentUser(cookieHeader),
    retry: false,
  });

// fastapi-users' /jwt/login is OAuth2PasswordRequestForm: it needs
// application/x-www-form-urlencoded with `username`/`password`, not JSON —
// so it can't go through the shared `api` client, which always sends JSON.
export async function login(email: string, password: string): Promise<void> {
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);

  const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
  const res = await fetch(`${baseUrl}/api/auth/jwt/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    let detail = "Login failed";
    try {
      const data = await res.json();
      detail = data?.detail ?? detail;
    } catch {
      // ignore non-JSON error body
    }
    throw new Error(detail === "LOGIN_BAD_CREDENTIALS" ? "Invalid email or password" : detail);
  }
}

export async function logout(): Promise<void> {
  await api.post("/api/auth/jwt/logout");
}

export async function register(email: string, password: string): Promise<void> {
  await api.post("/api/auth/register", { email, password });
}

```


## auth/components/loginForm.tsx

```tsx
import { TextInput, PasswordInput, Button, Stack, Alert, Title, Text, Anchor } from "@mantine/core";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin } from "../hooks/useAuth";
import { loginSchema, type LoginInput } from "../schemas/auth";

export function LoginForm() {
  const navigate = useNavigate();
  const { mutate, isPending, error } = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (values: LoginInput) => {
    mutate(values, { onSuccess: () => navigate({ to: "/redaction" }) });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack maw={360} mx="auto" mt={80}>
        <Title order={2}>Sign in</Title>
        {error && <Alert color="red">{(error as Error).message}</Alert>}
        <TextInput label="Email" type="email" error={errors.email?.message} {...register("email")} />
        <PasswordInput label="Password" error={errors.password?.message} {...register("password")} />
        <Button type="submit" loading={isPending}>Sign in</Button>
        <Text size="sm">No account? <Anchor component={Link} to="/register">Register</Anchor></Text>
      </Stack>
    </form>
  );
}

```


## auth/components/profileForm.tsx

```tsx
import { TextInput, Button, Stack, Alert, Title } from "@mantine/core";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCurrentUser, useUpdateProfile } from "../hooks/useAuth";
import { profileSchema, type ProfileInput } from "../schemas/auth";

export function ProfileForm() {
  const { data: user } = useCurrentUser();
  const { mutate, isPending, error, isSuccess } = useUpdateProfile();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    // resyncs whenever `user` changes — no useEffect needed
    values: user ? { firstName: user.firstName ?? "", lastName: user.lastName ?? "" } : undefined,
  });

  if (!user) return null;

  const onSubmit = (values: ProfileInput) => {
    mutate({ firstName: values.firstName || undefined, lastName: values.lastName || undefined });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack maw={420} mx="auto" mt={80}>
        <Title order={2}>Your profile</Title>
        {error && <Alert color="red">{(error as Error).message}</Alert>}
        {isSuccess && <Alert color="green">Profile updated</Alert>}
        <TextInput label="Email" value={user.email} disabled />
        <TextInput label="First name" error={errors.firstName?.message} {...register("firstName")} />
        <TextInput label="Last name" error={errors.lastName?.message} {...register("lastName")} />
        <Button type="submit" loading={isPending}>Save changes</Button>
      </Stack>
    </form>
  );
}

```


## auth/components/registerForm.tsx

```tsx
import { TextInput, PasswordInput, Button, Stack, Alert, Title, Text, Anchor } from "@mantine/core";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRegister, useLogin } from "../hooks/useAuth";
import { registerSchema, type RegisterInput } from "../schemas/auth";

export function RegisterForm() {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const loginMutation = useLogin();
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = (values: RegisterInput) => {
    registerMutation.mutate(values, {
      // /register doesn't set the auth cookie — log in right after
      onSuccess: () =>
        loginMutation.mutate(values, { onSuccess: () => navigate({ to: "/redaction" }) }),
    });
  };

  const error = registerMutation.error ?? loginMutation.error;
  const isPending = registerMutation.isPending || loginMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack maw={360} mx="auto" mt={80}>
        <Title order={2}>Create account</Title>
        {error && <Alert color="red">{(error as Error).message}</Alert>}
        <TextInput label="Email" type="email" error={errors.email?.message} {...registerField("email")} />
        <PasswordInput label="Password" error={errors.password?.message} {...registerField("password")} />
        <Button type="submit" loading={isPending}>Create account</Button>
        <Text size="sm">Already have an account? <Anchor component={Link} to="/login">Sign in</Anchor></Text>
      </Stack>
    </form>
  );
}

```


## auth/components/userMenu.tsx

```tsx
import { Menu, Avatar, UnstyledButton, Group, Text, Skeleton } from "@mantine/core";
import { IconUser, IconLogout, IconChevronDown } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useCurrentUser, useLogout } from "../hooks/useAuth";

function initials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

export function UserMenu() {
  const { data: user, isLoading } = useCurrentUser();
  const { mutate: logout, isPending } = useLogout();


  if (isLoading) return <Skeleton height={36} width={140} radius="sm" />;
  if (!user) return null;

  const displayName =
    user.firstName || user.lastName ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : user.email;

  return (
    <Menu position="bottom-end" withArrow shadow="md">
      <Menu.Target>
        <UnstyledButton>
          <Group gap={8}>
            <Avatar radius="xl" size={32} color="blue">{initials(user.email)}</Avatar>
            <Text size="sm" fw={500} visibleFrom="sm">{displayName}</Text>
            <IconChevronDown size={14} />
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{user.email}</Menu.Label>
        <Menu.Item component={Link} to="/profile" leftSection={<IconUser size={16} />}>
          Edit profile
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={() => logout()} disabled={isPending}>
          Log out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

```


## auth/guards/requireAuth.ts

```ts
import { redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { ApiError } from "#/shared/api/client";
import { getCookieHeader } from "#/shared/api/serverCookie";
import { currentUserQueryOptions } from "../api/auth";

export async function requireAuth(queryClient: QueryClient) {
  try {
    return await queryClient.ensureQueryData(currentUserQueryOptions(getCookieHeader()));
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      throw redirect({ to: "/login" });
    }
    throw err;
  }
}

```


## auth/hooks/useAuth.ts

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { currentUserQueryOptions, login, logout, register, updateCurrentUser } from "../api/auth";

export function useCurrentUser() {
  return useQuery(currentUserQueryOptions());
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCurrentUser,
    onSuccess: (user) => queryClient.setQueryData(["current-user"], user),
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => login(email, password),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      await router.invalidate();
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => register(email, password),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      queryClient.clear(); // wipe cached documents/profile etc. that belonged to this user
      await router.invalidate();
      router.navigate({ to: "/login" });
    },
  });
}

```


## auth/index.ts

```ts
export { LoginForm } from "./components/loginForm";
export { RegisterForm } from "./components/registerForm";
export { useCurrentUser, useLogin, useRegister, useLogout } from "./hooks/useAuth";
export { currentUserQueryOptions, getCurrentUser } from "./api/auth";
export { requireAuth } from "./guards/requireAuth";
export type { User } from "./types/auth";
export { UserMenu } from "./components/userMenu";
export { ProfileForm } from "./components/profileForm";
export { useUpdateProfile } from "./hooks/useAuth";

```


## auth/schemas/auth.ts

```ts
import { z } from "zod";

// login schema
export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// register schema
export const registerSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

// profile schema
export const profileSchema = z.object({
  firstName: z.string().max(100).optional().or(z.literal("")),
  lastName: z.string().max(100).optional().or(z.literal("")),
});
export type ProfileInput = z.infer<typeof profileSchema>;

```


## auth/types/auth.ts

```ts
export interface User {
  id: string;
  email: string;
  isActive: boolean;
  isSuperuser: boolean;
  isVerified: boolean;
  firstName?: string | null;
  lastName?: string | null;
}

```


## redaction/api/redaction.ts

```ts
// redaction/api/redaction.ts
import { queryOptions } from "@tanstack/react-query";
import { api, toPublicUrl } from "#/shared/api/client";
import type { ProjectFile, RedactionDocument, Collaborator, CollaboratorRole, Invitation } from "../types/redaction";

interface FileDto {
  id: string;
  name: string;
  language: "latex" | "bibtex" | "log";
  content: string;
  line_authors?: { author: string; edited_at: string }[] | null;
}

interface CollaboratorDto {
  id: string;
  user_id: string;
  email: string;
  role: CollaboratorRole;
  status: "pending" | "accepted";
}

interface DocumentDto {
  id: string;
  title: string;
  template: string;
  files: FileDto[];
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  role: string; // NEW — "owner" | "writer" | "reader"
  collaborators: CollaboratorDto[]; // NEW
}

function mapDocument(data: DocumentDto): RedactionDocument {
  return {
    id: data.id,
    title: data.title,
    template: data.template,
    pdfUrl: data.pdf_url ? toPublicUrl(data.pdf_url) : null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    role: data.role, // NEW
    collaborators: (data.collaborators ?? []).map((c) => ({ // NEW
      id: c.id,
      userId: c.user_id,
      email: c.email,
      role: c.role,
      status: c.status,
    })),
    files: data.files.map((f) => ({
      id: f.id,
      name: f.name,
      language: f.language,
      content: f.content,
      lineAuthors: (f.line_authors ?? []).map((la) => ({
        author: la.author,
        editedAt: la.edited_at,
      })),
    })),
  };
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

export async function duplicateDocument(
  documentId: string,
  opts: { template?: string; title?: string }
): Promise<RedactionDocument> {
  const data = await api.post<DocumentDto>(
    `/api/texademia/documents/${documentId}/duplicate`,
    opts
  );
  return mapDocument(data);
}

export async function deleteDocument(documentId: string): Promise<void> {
  await api.delete(`/api/texademia/documents/${documentId}`);
}

// ============================================
// Background compilation with polling
// ============================================

export interface CompileJobResponse {
  jobId: string;
  status: string;
}

export interface CompilePollResponse {
  status: "queued" | "running" | "done" | "error";
  step?: string;
  percent?: number;
  message?: string;
  result?: {
    pdf_url: string;
    log: string;
  };
  error?: string;
}

export async function startCompileJob(
  documentId: string,
  files: ProjectFile[]
): Promise<CompileJobResponse> {
  // DEBUG: verify the editor content reaching the compile request
  const mainFile = files.find((f) => f.name.endsWith(".tex"));
  console.log("[compile] saving files before compile", {
    documentId,
    fileCount: files.length,
    mainFileName: mainFile?.name,
    mainContentSnippet: mainFile?.content.slice(0, 200),
  });

  await Promise.all(files.map((f) => saveFile(documentId, f.id, f.content)));

  const data = await api.post<{ job_id: string; status: string }>(
    `/api/texademia/documents/${documentId}/compile`
  );
  console.log("[compile] started job", data);
  return { jobId: data.job_id, status: data.status };
}

export async function pollCompileStatus(jobId: string): Promise<CompilePollResponse> {
  return api.get<CompilePollResponse>(`/api/texademia/compile/${jobId}`);
}

// BACKWARD COMPATIBILITY ALIAS — pour éviter les erreurs d'import
// @deprecated Use startCompileJob instead
export const compileDocument = startCompileJob;

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

// ============================================
// Collaborators & invitations — NEW
// ============================================

export async function inviteCollaborator(
  documentId: string,
  email: string,
  role: CollaboratorRole
): Promise<Collaborator> {
  const data = await api.post<CollaboratorDto>(`/api/texademia/documents/${documentId}/collaborators`, {
    email,
    role,
  });
  return { id: data.id, userId: data.user_id, email: data.email, role: data.role, status: data.status };
}

export async function updateCollaboratorRole(
  documentId: string,
  collaboratorId: string,
  role: CollaboratorRole
): Promise<Collaborator> {
  const data = await api.patch<CollaboratorDto>(
    `/api/texademia/documents/${documentId}/collaborators/${collaboratorId}`,
    { role }
  );
  return { id: data.id, userId: data.user_id, email: data.email, role: data.role, status: data.status };
}

export async function removeCollaborator(documentId: string, collaboratorId: string): Promise<void> {
  await api.delete(`/api/texademia/documents/${documentId}/collaborators/${collaboratorId}`);
}

interface InvitationDto {
  id: string;
  document_id: string;
  document_title: string;
  role: CollaboratorRole;
  invited_by_email: string;
}

function mapInvitation(data: InvitationDto): Invitation {
  return {
    id: data.id,
    documentId: data.document_id,
    documentTitle: data.document_title,
    role: data.role,
    invitedByEmail: data.invited_by_email,
  };
}

export async function getPendingInvitations(): Promise<Invitation[]> {
  const data = await api.get<InvitationDto[]>("/api/texademia/invitations");
  return data.map(mapInvitation);
}

export async function acceptInvitation(invitationId: string): Promise<void> {
  await api.post(`/api/texademia/invitations/${invitationId}/accept`);
}

export async function declineInvitation(invitationId: string): Promise<void> {
  await api.post(`/api/texademia/invitations/${invitationId}/decline`);
}

```


## redaction/components/blameExtension.ts

```ts
import { StateField, StateEffect, type EditorState } from "@codemirror/state";
import { EditorView, Decoration, WidgetType, type DecorationSet } from "@codemirror/view";
import type { LineAuthor } from "../types/redaction";

export const setLineAuthors = StateEffect.define<LineAuthor[]>();

export const lineAuthorsField = StateField.define<LineAuthor[]>({
  create: () => [],
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setLineAuthors)) return effect.value;
    }
    return value;
  },
});

function formatRelative(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString();
}

class BlameWidget extends WidgetType {
  constructor(private author: string, private editedAt: string) {
    super();
  }
  eq(other: BlameWidget) {
    return other.author === this.author && other.editedAt === this.editedAt;
  }
  toDOM() {
    const span = document.createElement("span");
    span.textContent = `  ${this.author}, ${formatRelative(this.editedAt)}`;
    Object.assign(span.style, {
      opacity: "0.45",
      fontStyle: "italic",
      fontSize: "0.85em",
      pointerEvents: "none",
      userSelect: "none",
    });
    return span;
  }
  ignoreEvent() {
    return true;
  }
}

function buildDecorations(state: EditorState): DecorationSet {
  const authors = state.field(lineAuthorsField, false) ?? [];
  if (!authors.length) return Decoration.none;

  const cursorLine = state.doc.lineAt(state.selection.main.head);
  const meta = authors[cursorLine.number - 1];
  if (!meta) return Decoration.none;

  return Decoration.set([
    Decoration.widget({ widget: new BlameWidget(meta.author, meta.editedAt), side: 1 }).range(
      cursorLine.to
    ),
  ]);
}

export const blameLinePlugin = EditorView.decorations.compute(
  [lineAuthorsField, "selection"],
  buildDecorations
);

export const blameExtension = [lineAuthorsField, blameLinePlugin];

```


## redaction/components/collaboratorsDialog.tsx

```tsx
// redaction/components/collaboratorsDialog.tsx
import { Modal, Stack, TextInput, Select, Button, Group, Avatar, ActionIcon, Text } from "@mantine/core";
import { IconTrash, IconCheck, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useDocument } from "../hooks/useDocuments";
import { useInviteCollaborator, useUpdateCollaboratorRole, useRemoveCollaborator } from "../hooks/useCollaborators";
import type { CollaboratorRole } from "../types/redaction";

interface CollaboratorsDialogProps {
  opened: boolean;
  onClose: () => void;
  documentId: string;
}

const ROLE_OPTIONS = [
  { value: "reader", label: "Can view" },
  { value: "writer", label: "Can edit" },
];

export function CollaboratorsDialog({ opened, onClose, documentId }: CollaboratorsDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CollaboratorRole>("reader");
  const [pendingRoles, setPendingRoles] = useState<Record<string, CollaboratorRole>>({});

  const { data: document } = useDocument(documentId);
  const collaborators = document?.collaborators ?? [];

  const invite = useInviteCollaborator(documentId);
  const updateRole = useUpdateCollaboratorRole(documentId);
  const remove = useRemoveCollaborator(documentId);

  const onInvite = () => {
    invite.mutate({ email, role }, { onSuccess: () => setEmail("") });
  };

  const onSelectChange = (collaboratorId: string, currentRole: CollaboratorRole, value: string | null) => {
    if (!value) return;
    if (value === currentRole) {
      setPendingRoles((prev) => {
        const next = { ...prev };
        delete next[collaboratorId];
        return next;
      });
      return;
    }
    setPendingRoles((prev) => ({ ...prev, [collaboratorId]: value as CollaboratorRole }));
  };

  const onConfirmRole = (collaboratorId: string) => {
    const newRole = pendingRoles[collaboratorId];
    if (!newRole) return;
    updateRole.mutate(
      { collaboratorId, role: newRole },
      {
        onSuccess: () => {
          setPendingRoles((prev) => {
            const next = { ...prev };
            delete next[collaboratorId];
            return next;
          });
        },
      }
    );
  };

  const onCancelRole = (collaboratorId: string) => {
    setPendingRoles((prev) => {
      const next = { ...prev };
      delete next[collaboratorId];
      return next;
    });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Collaborators">
      <Stack>
        <Group align="flex-end">
          <TextInput
            label="Email"
            placeholder="colleague@example.com"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Select
            label="Access"
            data={ROLE_OPTIONS}
            value={role}
            onChange={(v) => setRole((v as CollaboratorRole) ?? "reader")}
            w={140}
          />
          <Button onClick={onInvite} loading={invite.isPending} disabled={!email}>
            Invite
          </Button>
        </Group>
        {invite.error && (
          <Text c="red" size="sm">
            {(invite.error as Error).message}
          </Text>
        )}

        <Stack gap="xs">
          {collaborators.map((c) => {
            const isOptimistic = c.id.startsWith("optimistic-");
            const pending = pendingRoles[c.id];
            const isDirty = !!pending && pending !== c.role;
            const isSavingThis = updateRole.isPending && updateRole.variables?.collaboratorId === c.id;
            const isRemovingThis = remove.isPending && remove.variables === c.id;

            return (
              <Group key={c.id} justify="space-between">
                <Group gap="sm">
                  <Avatar radius="xl">{c.email.slice(0, 2).toUpperCase()}</Avatar>
                  <div>
                    <Text size="sm">{c.email}</Text>
                    <Text size="xs" c="dimmed">
                      {isOptimistic
                        ? "Sending invite…"
                        : c.status === "pending"
                        ? "Invitation pending"
                        : "Active"}
                    </Text>
                  </div>
                </Group>
                <Group gap="xs">
                  <Select
                    data={ROLE_OPTIONS}
                    value={pending ?? c.role}
                    onChange={(v) => onSelectChange(c.id, c.role, v)}
                    w={130}
                    size="xs"
                    disabled={isSavingThis || isOptimistic || isRemovingThis}
                  />
                  {isDirty && (
                    <>
                      <ActionIcon color="green" variant="subtle" onClick={() => onConfirmRole(c.id)} loading={isSavingThis} aria-label="Confirm role change">
                        <IconCheck size={16} />
                      </ActionIcon>
                      <ActionIcon color="gray" variant="subtle" onClick={() => onCancelRole(c.id)} disabled={isSavingThis} aria-label="Cancel role change">
                        <IconX size={16} />
                      </ActionIcon>
                    </>
                  )}
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => remove.mutate(c.id)}
                    loading={isRemovingThis}
                    disabled={isDirty || isOptimistic}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Group>
            );
          })}
          {collaborators.length === 0 && (
            <Text size="sm" c="dimmed" ta="center" py="md">
              No collaborators yet — invite someone above.
            </Text>
          )}
        </Stack>
      </Stack>
    </Modal>
  );
}

```


## redaction/components/compileButton.tsx

```tsx
// redaction/components/compileButton.tsx
import { Button, Badge } from "@mantine/core";
import { IconPlayerPlay, IconLoader2 } from "@tabler/icons-react";

interface CompileButtonProps {
  onCompile: () => void;
  isCompiling: boolean;
  hasCompiledBefore: boolean;
  dirtyCount: number;
}

export function CompileButton({
  onCompile,
  isCompiling,
  hasCompiledBefore,
  dirtyCount,
}: CompileButtonProps) {
  const canCompile = !isCompiling && (!hasCompiledBefore || dirtyCount > 0);

  return (
    <Button
      onClick={onCompile}
      disabled={!canCompile}
      leftSection={isCompiling ? <IconLoader2 size={16} className="spin" /> : <IconPlayerPlay size={16} />}
      rightSection={
        dirtyCount > 0 ? (
          <Badge color="red" size="xs" variant="filled">
            {dirtyCount}
          </Badge>
        ) : undefined
      }
      color={isCompiling ? "gray" : "blue"}
    >
      {isCompiling ? "Compiling…" : hasCompiledBefore ? "Recompile" : "Compile"}
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
  { value: "acl", label: "ACL", description: "ACL conference/workshop style" },
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
import { Link } from "@tanstack/react-router";
import {
  Group,
  Text,
  TextInput,
  Loader,
  ActionIcon,
  Progress,
  Stack,
  Tooltip,
} from "@mantine/core";
import { IconArrowLeft, IconCheck, IconX } from "@tabler/icons-react";
import { AppShellHeaderPortal } from "#/shared/ui/app-shell/headerPortal";
import { CompileButton } from "./compileButton";
import { DocumentMenu } from "./documentMenu";
import type { CompilePhase } from "../hooks/useCompileDocument";

interface DocumentHeaderProps {
  title: string;
  onTitleSave: (title: string) => void;
  isSavingTitle: boolean;
  onCompile: () => void;
  compilePhase: CompilePhase;
  compileProgress: number;
  compileMessage: string;
  compileError: string | null;
  compileLog: string | null;
  template: string;
  pdfUrl: string | null;
  dirtyCount: number;
  onDuplicateClick: () => void;
  onShareClick: () => void; // NEW
  role: string;             // NEW
}

export function EditableTitle({
  title,
  onSave,
  isSaving,
}: {
  title: string;
  onSave: (title: string) => void;
  isSaving: boolean;
}) {
  const commit = (el: HTMLHeadingElement) => {
    const trimmed = el.textContent?.trim() || "Untitled";
    if (trimmed !== title) {
      onSave(trimmed);
    } else {
      el.textContent = title; // Reset on no change
    }
  };

  return (
    <Group gap={6} wrap="nowrap">
      <Text
        fw={600}
        size="sm"
        truncate
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => commit(e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
          if (e.key === "Escape") {
            e.currentTarget.textContent = title;
            e.currentTarget.blur();
          }
        }}
        style={{ cursor: "text", outline: "none" }}
      >
        {title}
      </Text>
      {isSaving && <Loader size="xs" />}
    </Group>
  );
}



function CompileStatusIndicator({
  phase,
  progress,
  message,
  error,
  log,
}: {
  phase: CompilePhase;
  progress: number;
  message: string;
  error: string | null;
  log: string | null;
}) {
  if (phase === "idle") {
    return <Text size="xs" c="dimmed">Not compiled yet</Text>;
  }

  if (phase === "saving") {
    return (
      <Group gap={4} wrap="nowrap">
        <Loader size="xs" />
        <Text size="xs" c="dimmed">Saving…</Text>
      </Group>
    );
  }

  if (phase === "queued") {
    return (
      <Group gap={4} wrap="nowrap">
        <Loader size="xs" />
        <Text size="xs" c="dimmed">Queued…</Text>
      </Group>
    );
  }

  if (phase === "running") {
    return (
      <Stack gap={4} w={180}>
        <Group gap={4} wrap="nowrap" justify="space-between">
          <Group gap={4} wrap="nowrap">
            <Loader size="xs" />
            <Text size="xs" c="dimmed" truncate>{message || "Compiling…"}</Text>
          </Group>
          <Text size="xs" c="dimmed" w={30} ta="right">{progress}%</Text>
        </Group>
        <Progress value={progress} size="xs" animated color="blue" />
      </Stack>
    );
  }

  if (phase === "done") {
    return (
      <Group gap={4} wrap="nowrap">
        <IconCheck size={14} color="teal" />
        <Text size="xs" c="teal">Compiled</Text>
      </Group>
    );
  }

  if (phase === "error") {
    return (
      <Tooltip
        label={
          <Stack gap={4} maw={400}>
            <Text size="xs" c="red">{error}</Text>
            {log && (
              <Text size="xs" c="dimmed" style={{ fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                {log.slice(0, 800)}{log.length > 800 ? "…" : ""}
              </Text>
            )}
          </Stack>
        }
        multiline
        withArrow
      >
        <Group gap={4} wrap="nowrap" style={{ cursor: "help" }}>
          <IconX size={14} color="red" />
          <Text size="xs" c="red">Compile failed</Text>
        </Group>
      </Tooltip>
    );
  }

  return null;
}

export function DocumentHeader({
  title,
  onTitleSave,
  isSavingTitle,
  onCompile,
  compilePhase,
  compileProgress,
  compileMessage,
  compileError,
  compileLog,
  template,
  pdfUrl,
  dirtyCount,
  onDuplicateClick,
  onShareClick, // NEW
  role,         // NEW
}: DocumentHeaderProps) {
  const isCompiling = compilePhase === "saving" || compilePhase === "queued" || compilePhase === "running";
  const hasCompiledBefore = compilePhase === "done" || !!pdfUrl;

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
          <CompileStatusIndicator
            phase={compilePhase}
            progress={compileProgress}
            message={compileMessage}
            error={compileError}
            log={compileLog}
          />
          <DocumentMenu
            template={template}
            pdfUrl={pdfUrl}
            onDuplicateClick={onDuplicateClick}
            onShareClick={onShareClick}
            role={role}
          />
          <CompileButton
            onCompile={onCompile}
            isCompiling={isCompiling}
            hasCompiledBefore={hasCompiledBefore}
            dirtyCount={dirtyCount}
          />
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
  IconUsers,
} from "@tabler/icons-react";

interface DocumentMenuProps {
  template: string;
  pdfUrl: string | null;
  onDuplicateClick: () => void;
  onShareClick: () => void;
  role: string; // "owner" | "writer" | "reader"
}

const TEMPLATE_LABELS: Record<string, string> = {
  default: "Default",
  arxiv: "arXiv",
  ieee: "IEEE",
  acl: "ACL",
};

export function DocumentMenu({ template, pdfUrl, onDuplicateClick, onShareClick, role }: DocumentMenuProps) {
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

        {role === "owner" && (
          <Menu.Item leftSection={<IconUsers size={16} />} onClick={onShareClick}>
            Manage collaborators
          </Menu.Item>
        )}

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

        <Menu.Item leftSection={<IconCopy size={16} />} onClick={onDuplicateClick}>
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


## redaction/components/documentsListPage.module.css

```css
.actionsCell {
  position: relative;
  overflow: hidden;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  transition: opacity 120ms ease;
  z-index: 900;

}

.actionsCell:hover .overlay {
  opacity: 1;
}

.row {
  cursor: pointer;
}

```


## redaction/components/documentsListPage.tsx

```tsx
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import {
  ActionIcon,
  Indicator,
  Avatar,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  Pagination,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconCopy,
  IconCrown,
  IconDownload,
  IconFileText,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUsers,
  IconClock,
} from "@tabler/icons-react";
import { createDocument, deleteDocument, documentsQueryOptions, duplicateDocument } from "../api/redaction";
import { CreateDocumentDialog } from "./createDocumentDialog";
import { DuplicateDocumentDialog } from "./duplicateDocumentDialog";
import { CollaboratorsDialog } from "./collaboratorsDialog"; // NEW
import type { RedactionDocument } from "../types/redaction";
import classes from "./documentsListPage.module.css";

const TEMPLATE_LABELS: Record<string, string> = {
  default: "Default",
  arxiv: "arXiv",
  ieee: "IEEE",
  acl: "ACL",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const columnHelper = createColumnHelper<RedactionDocument>();

export function DocumentsListPage() {
  const { data: documents, isLoading } = useQuery(documentsQueryOptions());
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [dialogOpened, setDialogOpened] = useState(false);
  const [duplicateTarget, setDuplicateTarget] = useState<RedactionDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RedactionDocument | null>(null);
  const [collaboratorsTarget, setCollaboratorsTarget] = useState<RedactionDocument | null>(null); // NEW
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "updatedAt", desc: true }]);

  const { mutate: createNew, isPending: isCreating } = useMutation({
    mutationFn: ({ title, template }: { title: string; template: string }) =>
      createDocument(title, template),
    onSuccess: (doc) => {
      setDialogOpened(false);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      navigate({ to: "/redaction/$documentId", params: { documentId: doc.id } });
    },
  });

  const { mutate: duplicate, isPending: isDuplicating } = useMutation({
    mutationFn: (opts: { template: string; title: string }) =>
      duplicateDocument(duplicateTarget!.id, opts),
    onSuccess: (newDoc) => {
      setDuplicateTarget(null);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      navigate({ to: "/redaction/$documentId", params: { documentId: newDoc.id } });
    },
  });

  const { mutate: remove, isPending: isDeleting } = useMutation({
    mutationFn: (documentId: string) => deleteDocument(documentId),
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const columns = useMemo(
    () => [
      columnHelper.accessor("title", {
        header: "Document Title / Subject",
        cell: (info) => {
          const doc = info.row.original;
          return (
            <Group gap="sm" wrap="nowrap">
              <IconFileText size={18} color="var(--mantine-color-gray-6)" />
              <Stack gap={2}>
                <Group gap={6} wrap="nowrap">
                  <Text fw={600} c="accent" size="sm">
                    {doc.title}
                  </Text>
                  {doc.role === "owner" && (
                    <Badge
                      size="xs"
                      color="accent"
                      variant="filled"
                      leftSection={<IconCrown size={10} />}
                    >
                      Owner
                    </Badge>
                  )}
                </Group>
                <Text ff="monospace" fz={11} c="dimmed">
                  {TEMPLATE_LABELS[doc.template] ?? doc.template} · {doc.files.length}{" "}
                  {doc.files.length === 1 ? "file" : "files"}
                </Text>
              </Stack>
            </Group>
          );
        },
      }),
      columnHelper.display({
              id: "collaborators",
              header: "Access",
              cell: (info) => {
                const doc = info.row.original;
                const others = doc.collaborators ?? [];

                if (others.length === 0) {
                  return (
                    <Text size="xs" c="dimmed" ta="center">
                      Only you
                    </Text>
                  );
                }

                return (
                  <Group gap={6} wrap="nowrap">
                    {others.slice(0, 4).map((c) => (
                      <Tooltip
                        key={c.id}
                        label={`${c.email} · ${c.role === "writer" ? "Can edit" : "Can view"}${
                          c.status === "pending" ? " (invitation pending)" : ""
                        }`}
                      >
                        <Indicator
                          disabled={c.status !== "pending"}
                          size={14}
                          color="var(--color-warning)"
                          offset={3}
                          position="bottom-end"
                          label={<IconClock size={9} />}
                          styles={{ indicator: { padding: 0 } }}
                        >
                          <Avatar
                            radius="xl"
                            size={28}
                            color={c.status === "pending" ? "gray" : "accent"}
                            variant={c.status === "pending" ? "light" : "filled"}
                          >
                            {c.email.slice(0, 2).toUpperCase()}
                          </Avatar>
                        </Indicator>
                      </Tooltip>
                    ))}
                    {others.length > 4 && (
                      <Avatar radius="xl" size={28}>
                        +{others.length - 4}
                      </Avatar>
                    )}
                  </Group>
                );
              },
              enableSorting: false,
            }),
      columnHelper.accessor("updatedAt", {
        header: "Last Modified",
        cell: (info) => (
          <Text ff="monospace" fz={12} c="dimmed">
            {formatDate(info.getValue())}
          </Text>
        ),
      }),
      columnHelper.accessor((row) => (row.pdfUrl ? "compiled" : "draft"), {
        id: "status",
        header: "Status",
        cell: (info) =>
          info.getValue() === "compiled" ? (
            <Badge variant="outline" color="accent" radius="sm" ff="monospace">
              Compiled
            </Badge>
          ) : (
            <Badge variant="outline" color="gray" radius="sm" ff="monospace">
              Draft
            </Badge>
          ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (info) => {
          const doc = info.row.original;
          return (
            <Box className={classes.actionsCell} h="100%" mih={40}>
              <div className={classes.overlay}>
                {doc.role === "owner" && (
                  <Tooltip label="Share">
                    <ActionIcon
                      variant="subtle"
                      color="accent"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCollaboratorsTarget(doc);
                      }}
                    >
                      <IconUsers size={16} />
                    </ActionIcon>
                  </Tooltip>
                )}
                <Tooltip label="Duplicate">
                  <ActionIcon
                    variant="subtle"
                    color="accent"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDuplicateTarget(doc);
                    }}
                  >
                    <IconCopy size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label={doc.pdfUrl ? "Download PDF" : "Compile first"}>
                  <ActionIcon
                    variant="subtle"
                    color="accent"
                    disabled={!doc.pdfUrl}
                    component="a"
                    href={doc.pdfUrl ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconDownload size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Delete">
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(doc);
                    }}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              </div>
            </Box>
          );
        },
        enableSorting: false,
      }),
    ],
    []
  );

  const table = useReactTable({
    data: documents ?? [],
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });

  const rows = table.getRowModel().rows;
  const pageCount = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;
  const total = documents?.length ?? 0;
  const from = total === 0 ? 0 : pageIndex * table.getState().pagination.pageSize + 1;
  const to = Math.min(from + table.getState().pagination.pageSize - 1, total);

  return (
    <Stack p="xl" gap="lg">
      <Group justify="space-between" align="flex-end">
        <Stack gap={2}>
          <Text ff="monospace" fz={11} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.2em" }}>
            System Storage
          </Text>
          <Title order={2} c="accent">
            Your Library
          </Title>
        </Stack>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setDialogOpened(true)}>
          New document
        </Button>
      </Group>

      <TextInput
        placeholder="Search documents…"
        leftSection={<IconSearch size={16} />}
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.currentTarget.value)}
        maw={360}
      />

      <Box
        style={{
          border: "1px solid var(--mantine-color-gray-3)",
          borderRadius: "var(--mantine-radius-md)",
          overflow: "hidden",
        }}
      >
        <Table withColumnBorders highlightOnHover verticalSpacing="md" horizontalSpacing="lg">
          <Table.Thead bg="gray.0">
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ cursor: header.column.getCanSort() ? "pointer" : "default" }}
                  >
                    <Group gap={4} wrap="nowrap">
                      <Text
                        ff="monospace"
                        fz={11}
                        fw={700}
                        tt="uppercase"
                        c="dimmed"
                        style={{ letterSpacing: "0.08em" }}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </Text>
                      {header.column.getIsSorted() === "asc" && <IconChevronUp size={12} />}
                      {header.column.getIsSorted() === "desc" && <IconChevronDown size={12} />}
                    </Group>
                  </Table.Th>
                ))}
              </Table.Tr>
            ))}
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr
                key={row.id}
                className={classes.row}
                onClick={() =>
                  navigate({ to: "/redaction/$documentId", params: { documentId: row.original.id } })
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <Table.Td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Table.Td>
                ))}
              </Table.Tr>
            ))}
            {rows.length === 0 && !isLoading && (
              <Table.Tr>
                <Table.Td colSpan={columns.length}>
                  <Text c="dimmed" ta="center" py="lg">
                    {globalFilter ? "No documents match your search." : "No documents yet — create one to get started."}
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>

        <Group justify="space-between" p="md" bg="gray.0" style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}>
          <Text ff="monospace" fz={11} c="dimmed">
            {total === 0 ? "NO RESULTS" : `SHOWING ${from} TO ${to} OF ${total} RESULTS`}
          </Text>
          {pageCount > 1 && (
            <Pagination
              size="sm"
              total={pageCount}
              value={pageIndex + 1}
              onChange={(p) => table.setPageIndex(p - 1)}
            />
          )}
        </Group>
      </Box>

      <CreateDocumentDialog
        opened={dialogOpened}
        onClose={() => setDialogOpened(false)}
        onCreate={(title, template) => createNew({ title, template })}
        isCreating={isCreating}
      />

      <DuplicateDocumentDialog
        opened={!!duplicateTarget}
        onClose={() => setDuplicateTarget(null)}
        onDuplicate={(opts) => duplicate(opts)}
        isDuplicating={isDuplicating}
        sourceTitle={duplicateTarget?.title ?? ""}
        sourceTemplate={duplicateTarget?.template ?? "default"}
      />

      {/* NEW */}
      <CollaboratorsDialog
        opened={!!collaboratorsTarget}
        onClose={() => setCollaboratorsTarget(null)}
        documentId={collaboratorsTarget?.id ?? ""}
        collaborators={collaboratorsTarget?.collaborators ?? []}
      />

      <Modal opened={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete document" centered>
        <Stack>
          <Text size="sm">
            Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This can't be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button color="red" loading={isDeleting} onClick={() => deleteTarget && remove(deleteTarget.id)}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

```


## redaction/components/duplicateDocumentDialog.tsx

```tsx
import { useState } from "react";
import { Button, Modal, Stack, TextInput, SegmentedControl, Text } from "@mantine/core";

const TEMPLATES = [
  { value: "default", label: "Default", description: "Plain article, minimal starter" },
  { value: "arxiv", label: "arXiv", description: "Preprint style with abstract" },
  { value: "ieee", label: "IEEE", description: "Conference paper (IEEEtran)" },
  { value: "acl", label: "ACL", description: "ACL conference/workshop style" },
];

interface DuplicateDocumentDialogProps {
  opened: boolean;
  onClose: () => void;
  onDuplicate: (opts: { template: string; title: string }) => void;
  isDuplicating: boolean;
  sourceTitle: string;
  sourceTemplate: string;
}

export function DuplicateDocumentDialog({
  opened, onClose, onDuplicate, isDuplicating, sourceTitle, sourceTemplate,
}: DuplicateDocumentDialogProps) {
  const [title, setTitle] = useState(`${sourceTitle} (copy)`);
  const [template, setTemplate] = useState(sourceTemplate);

  return (
    <Modal opened={opened} onClose={onClose} title="Duplicate document" centered>
      <Stack gap="md">
        <TextInput label="Title" value={title} onChange={(e) => setTitle(e.currentTarget.value)} data-autofocus />
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
        <Button onClick={() => onDuplicate({ template, title: title.trim() || sourceTitle })} loading={isDuplicating} fullWidth>
          Duplicate
        </Button>
      </Stack>
    </Modal>
  );
}

```


## redaction/components/editor.tsx

```tsx
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { useEffect, useRef } from "react";
import { blameExtension, setLineAuthors } from "./blameExtension";
import type { LineAuthor } from "../types/redaction";

interface EditorProps {
  value: string;
  language: "latex" | "bibtex" | "log";
  onChange: (value: string) => void;
  lineAuthors?: LineAuthor[];
}

export function Editor({ value, onChange, lineAuthors }: EditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  useEffect(() => {
    editorRef.current?.view?.dispatch({ effects: setLineAuthors.of(lineAuthors ?? []) });
  }, [lineAuthors]);

  return (
    <CodeMirror
      ref={editorRef}
      value={value}
      height="100%"
      extensions={[StreamLanguage.define(stex), blameExtension]}
      onChange={onChange}
      style={{ height: "100%" }}
    />
  );
}

```


## redaction/components/fileTabs.tsx

```tsx
import { Tabs, Group, Avatar, Tooltip } from "@mantine/core";  // CHANGED: added Avatar, Tooltip
import { IconFileText, IconAlertTriangle } from "@tabler/icons-react";
import type { ProjectFile } from "../types/redaction";

export const PREVIEW_TAB_ID = "__preview__";
export const LOG_TAB_ID = "__log__";

interface FileTabsProps {
  files: ProjectFile[];
  activeTabId: string;
  onSelect: (id: string) => void;
  hasLog?: boolean;
  presenceByFile?: Record<string, { connectionId: number; name?: string; email?: string }[]>; // NEW
}

// NEW
const AVATAR_COLORS = ["blue", "grape", "teal", "orange", "pink", "indigo"];
function colorFor(key: string) {
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}
function initials(label: string) {
  return label.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

// NEW
function PresenceStack({ users }: { users?: { connectionId: number; name?: string; email?: string }[] }) {
  if (!users?.length) return null;
  return (
    <Avatar.Group spacing={4} ml={6}>
      {users.slice(0, 3).map((u) => {
        const label = u.name ?? u.email ?? "?";
        return (
          <Tooltip key={u.connectionId} label={label}>
            <Avatar size={18} radius="xl" color={colorFor(u.email ?? label)}>
              {initials(label)}
            </Avatar>
          </Tooltip>
        );
      })}
    </Avatar.Group>
  );
}

export function FileTabs({ files, activeTabId, onSelect, hasLog, presenceByFile }: FileTabsProps) {
  return (
    <Tabs value={activeTabId} onChange={(id) => id && onSelect(id)}>
      <Tabs.List>
        {files.map((f) => (
          <Tabs.Tab key={f.id} value={f.id}>
            <Group gap={0} wrap="nowrap">
              {f.name}
              <PresenceStack users={presenceByFile?.[f.id]} />
            </Group>
          </Tabs.Tab>
        ))}
        {hasLog && (
          <Tabs.Tab value={LOG_TAB_ID} color="red" leftSection={<IconAlertTriangle size={14} />}>
            Compile Log
          </Tabs.Tab>
        )}
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


## redaction/components/invitationsBell.tsx

```tsx
// redaction/components/invitationsBell.tsx
import { Popover, ActionIcon, Indicator, Stack, Group, Text, Button, Skeleton, Badge } from "@mantine/core";
import { IconBell } from "@tabler/icons-react";
import { usePendingInvitations, useAcceptInvitation, useDeclineInvitation } from "../hooks/useCollaborators";

export function InvitationsBell() {
  const { data: invitations, isLoading } = usePendingInvitations();
  const accept = useAcceptInvitation();
  const decline = useDeclineInvitation();

  const count = invitations?.length ?? 0;

  return (
    <Popover position="bottom-end" withArrow shadow="md" width={320}>
      <Popover.Target>
        <Indicator disabled={count === 0} label={count} size={16} color="red" offset={4}>
          <ActionIcon variant="subtle" size="lg" aria-label="Invitations">
            <IconBell size={20} />
          </ActionIcon>
        </Indicator>
      </Popover.Target>

      <Popover.Dropdown>
        <Stack gap="sm">
          <Text fw={600} size="sm">Invitations</Text>

          {isLoading && <Skeleton height={60} radius="sm" />}

          {!isLoading && count === 0 && (
            <Text size="sm" c="dimmed">No pending invitations.</Text>
          )}

          {invitations?.map((inv) => (
            <Group key={inv.id} justify="space-between" wrap="nowrap" align="flex-start">
              <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={500} truncate>{inv.documentTitle}</Text>
                <Group gap={4}>
                  <Text size="xs" c="dimmed">from {inv.invitedByEmail}</Text>
                  <Badge size="xs" variant="light">
                    {inv.role === "writer" ? "Can edit" : "Can view"}
                  </Badge>
                </Group>
              </Stack>
              <Group gap={4} wrap="nowrap">
                <Button size="xs" variant="light" loading={decline.isPending} onClick={() => decline.mutate(inv.id)}>
                  Decline
                </Button>
                <Button size="xs" loading={accept.isPending} onClick={() => accept.mutate(inv.id)}>
                  Accept
                </Button>
              </Group>
            </Group>
          ))}
        </Stack>
      </Popover.Dropdown>
    </Popover>
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
      key={pdfUrl}
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
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Editor } from "./editor";
import { PdfPreview } from "./pdfPreview";
import { FileTabs, LOG_TAB_ID, PREVIEW_TAB_ID } from "./fileTabs";
import { DocumentHeader } from "./documentHeader";
import { DuplicateDocumentDialog } from "./duplicateDocumentDialog";
import { CollaboratorsDialog } from "./collaboratorsDialog";
import { useCompileDocument } from "../hooks/useCompileDocument";
import { useUpdateDocumentTitle } from "../hooks/useUpdateDocumentTitle";
import { useDocumentSocket } from "../hooks/useDocumentSocket"; // CHANGED
import { documentQueryOptions, duplicateDocument } from "../api/redaction";
import type { ProjectFile } from "../types/redaction";

interface RedactionPageProps {
  documentId: string;
}

export function RedactionPage({ documentId }: RedactionPageProps) {
  const { data: document } = useQuery(documentQueryOptions(documentId));
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [files, setFiles] = useState<ProjectFile[]>(() => document!.files);
  const [activeFileId, setActiveFileId] = useState<string | null>(
    () => document!.files[0]?.id ?? null
  );

  console.log("activeTab", document)
  const [activeTabId, setActiveTabId] = useState<string>(
    () => document!.files[0]?.id ?? null
  );
  const [duplicateDialogOpened, setDuplicateDialogOpened] = useState(false);
  const [collaboratorsDialogOpened, setCollaboratorsDialogOpened] = useState(false);

  const [liveRefreshKey, setLiveRefreshKey] = useState(0);

  const {
    compile,
    phase: compilePhase,
    progress: compileProgress,
    message: compileMessage,
    pdfUrl,
    error: compileError,
    log: compileLog,
    isDone: isCompileSuccess,
  } = useCompileDocument(documentId, document?.pdfUrl ?? null, liveRefreshKey);

  const { mutate: saveTitle, isPending: isSavingTitle } = useUpdateDocumentTitle(documentId);

  const { mutate: duplicate, isPending: isDuplicating } = useMutation({
    mutationFn: (opts: { template: string; title: string }) =>
      duplicateDocument(documentId, opts),
    onSuccess: (newDoc) => {
      setDuplicateDialogOpened(false);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      navigate({ to: "/redaction/$documentId", params: { documentId: newDoc.id } });
    },
  });






  // NEW — replaces RoomProvider/useOthers/useEventListener
  const { presenceByFile, setActiveFile } = useDocumentSocket(documentId, (event) => {
    if (event.phase) {
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      setLiveRefreshKey((k) => k + 1);
    }
  });

  if (!document) return null;

  const dirtyCount = files.reduce((count, file) => {
    const serverFile = document.files.find((f) => f.id === file.id);
    return serverFile && file.content === serverFile.content ? count : count + 1;
  }, 0);

  const currentTabId = activeTabId || activeFileId || "";
  const activeFile = files.find((f) => f.id === currentTabId);

  const updateActiveFileContent = (content: string) => {
    setFiles((prev) => prev.map((f) => (f.id === activeFileId ? { ...f, content } : f)));
  };

  const handleSelectTab = (id: string) => {
    setActiveTabId(id);
    if (id !== PREVIEW_TAB_ID) {
      setActiveFileId(id);
      setActiveFile(id); // CHANGED — was updateMyPresence({ fileId: id })
    }
  };

  useEffect(() => {
    if (isCompileSuccess && pdfUrl) {
      setActiveTabId(PREVIEW_TAB_ID);
    }
  }, [isCompileSuccess, pdfUrl]);

  const hasLog = compilePhase === "error" && !!compileLog;

  useEffect(() => {
    if (compilePhase === "error" && compileLog) {
      setActiveTabId(LOG_TAB_ID);
    }
  }, [compilePhase, compileLog]);

  useEffect(() => {
    if (compilePhase === "queued" && activeTabId === LOG_TAB_ID) {
      setActiveTabId(activeFileId ?? "");
    }
  }, [compilePhase]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <DocumentHeader
        title={document.title}
        onTitleSave={saveTitle}
        isSavingTitle={isSavingTitle}
        onCompile={() => compile(files)}
        compilePhase={compilePhase}
        compileProgress={compileProgress}
        compileMessage={compileMessage}
        compileError={compileError}
        compileLog={compileLog}
        template={document.template}
        pdfUrl={pdfUrl}
        dirtyCount={dirtyCount}
        onDuplicateClick={() => setDuplicateDialogOpened(true)}
        onShareClick={() => setCollaboratorsDialogOpened(true)}
        role={document.role}
      />

      <FileTabs
        files={files}
        activeTabId={currentTabId}
        onSelect={handleSelectTab}
        hasLog={hasLog}
        presenceByFile={presenceByFile}
      />

      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {currentTabId === PREVIEW_TAB_ID ? (
          <PdfPreview pdfUrl={pdfUrl} />
        ) : currentTabId === LOG_TAB_ID && compileLog ? (
          <Editor value={compileLog} language="log" onChange={() => {}} readOnly />
        ) : activeFile ? (
          <Editor
            value={activeFile.content}
            language={activeFile.language}
            onChange={updateActiveFileContent}
            lineAuthors={activeFile.lineAuthors}
          />
        ) : null}
      </div>

      <DuplicateDocumentDialog
        opened={duplicateDialogOpened}
        onClose={() => setDuplicateDialogOpened(false)}
        onDuplicate={(opts) => duplicate(opts)}
        isDuplicating={isDuplicating}
        sourceTitle={document.title}
        sourceTemplate={document.template}
      />

      <CollaboratorsDialog
        opened={collaboratorsDialogOpened}
        onClose={() => setCollaboratorsDialogOpened(false)}
        documentId={documentId}
      />
    </div>
  );
}

```


## redaction/hooks/useCollaborators.ts

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  inviteCollaborator,
  updateCollaboratorRole,
  removeCollaborator,
  getPendingInvitations,
  acceptInvitation,
  declineInvitation,
} from "../api/redaction";
import type { CollaboratorRole, Collaborator, RedactionDocument } from "../types/redaction";

const docKey = (documentId: string) => ["document", documentId] as const;

export function useInviteCollaborator(documentId: string) {
  const queryClient = useQueryClient();
  const key = docKey(documentId);

  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: CollaboratorRole }) =>
      inviteCollaborator(documentId, email, role),

    onMutate: async ({ email, role }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<RedactionDocument>(key);

      const optimisticCollaborator: Collaborator = {
        id: `optimistic-${Date.now()}`,
        userId: "",
        email,
        role,
        status: "pending",
      };

      queryClient.setQueryData<RedactionDocument>(key, (old) =>
        old ? { ...old, collaborators: [...old.collaborators, optimisticCollaborator] } : old
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useUpdateCollaboratorRole(documentId: string) {
  const queryClient = useQueryClient();
  const key = docKey(documentId);

  return useMutation({
    mutationFn: ({ collaboratorId, role }: { collaboratorId: string; role: CollaboratorRole }) =>
      updateCollaboratorRole(documentId, collaboratorId, role),

    onMutate: async ({ collaboratorId, role }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<RedactionDocument>(key);

      queryClient.setQueryData<RedactionDocument>(key, (old) =>
        old
          ? {
              ...old,
              collaborators: old.collaborators.map((c) =>
                c.id === collaboratorId ? { ...c, role } : c
              ),
            }
          : old
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useRemoveCollaborator(documentId: string) {
  const queryClient = useQueryClient();
  const key = docKey(documentId);

  return useMutation({
    mutationFn: (collaboratorId: string) => removeCollaborator(documentId, collaboratorId),

    onMutate: async (collaboratorId) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<RedactionDocument>(key);

      queryClient.setQueryData<RedactionDocument>(key, (old) =>
        old
          ? { ...old, collaborators: old.collaborators.filter((c) => c.id !== collaboratorId) }
          : old
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function usePendingInvitations() {
  return useQuery({
    queryKey: ["invitations"],
    queryFn: getPendingInvitations,
    refetchInterval: 30_000,
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useDeclineInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: declineInvitation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invitations"] }),
  });
}

```


## redaction/hooks/useCompileDocument.ts

```ts
// redaction/hooks/useCompileDocument.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { startCompileJob, pollCompileStatus } from "../api/redaction";
import type { ProjectFile } from "../types/redaction";

export type CompilePhase = "idle" | "saving" | "queued" | "running" | "done" | "error";

export interface CompileState {
  phase: CompilePhase;
  progress: number;
  message: string;
  pdfUrl: string | null;
  error: string | null;
  log: string | null;
}

function toPublicUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${import.meta.env.VITE_API_URL ?? ""}${path}`;
}

function addCacheBuster(url: string, key: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${key}`;
}

export function useCompileDocument(documentId: string, initialPdfUrl: string | null, liveRefreshKey: number = 0) {
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);
  // Busts browser/iframe caching for the PDF URL. The mount-time key keeps the
  // initial preview fresh; each compile uses its job id so recompiles always
  // reload instead of showing a stale cached PDF.
  const [pdfCacheKey] = useState(() => `${Date.now()}`);

  const startMutation = useMutation({
    mutationFn: (files: ProjectFile[]) => startCompileJob(documentId, files),
    onSuccess: (data) => {
      setJobId(data.jobId);
      // Files were just saved; refresh the server snapshot so the dirty count
      // drops to zero after a successful recompile.
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
    },
  });

  const pollQuery = useQuery({
    queryKey: ["compile-job", jobId],
    queryFn: () => pollCompileStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "done" || data?.status === "error") {
        return false;
      }
      return 800;
    },
  });

  const getPhase = (): CompilePhase => {
    if (startMutation.isPending) return "saving";
    if (!pollQuery.data) {
      if (jobId) return "queued";
      return initialPdfUrl ? "done" : "idle"; // NEW
    }
    if (pollQuery.data.status === "done") return "done";
    if (pollQuery.data.status === "error") return "error";
    if (pollQuery.data.status === "running") return "running";
    return "queued";
  };

  const phase = getPhase();
  const progress = pollQuery.data?.percent ?? (startMutation.isPending ? 5 : 0);
  const message = pollQuery.data?.message ?? (startMutation.isPending ? "Saving files..." : "Ready");
  const pdfUrl = pollQuery.data?.result?.pdf_url
      ? addCacheBuster(toPublicUrl(pollQuery.data.result.pdf_url), jobId ?? pdfCacheKey)
      : !jobId && initialPdfUrl
        ? addCacheBuster(initialPdfUrl, `${pdfCacheKey}-${liveRefreshKey}`) // CHANGED
        : null;

  // DEBUG
  console.log("[compile] derived pdfUrl", { phase, jobId, pdfUrl });

  const error = pollQuery.data?.status === "error"
    ? (pollQuery.data.error ?? "Compilation failed")
    : startMutation.isError
    ? (startMutation.error as Error)?.message ?? "Failed to start compilation"
    : null;
  const log = pollQuery.data?.log ?? pollQuery.data?.result?.log ?? null;

  const isActive = phase === "saving" || phase === "queued" || phase === "running";
  const isDone = phase === "done";
  const isError = phase === "error";

  const compile = (files: ProjectFile[]) => {
    setJobId(null);
    queryClient.removeQueries({ queryKey: ["compile-job"] });
    startMutation.mutate(files);
  };

  return {
    compile,
    phase,
    progress,
    message,
    pdfUrl,
    error,
    log,
    isActive,
    isDone,
    isError,
    jobId,
    pollData: pollQuery.data,
  };
}

```


## redaction/hooks/useDocumentSocket.ts

```ts
import { useEffect, useRef, useState } from "react";

interface PresenceUser {
  fileId: string;
  name: string;
  email: string;
  lastSeen: number;
}

const PRESENCE_INTERVAL_MS = 4000;
const STALE_AFTER_MS = 12000;

function resolveWsBase(): string {
  const httpBase = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
  return httpBase.replace(/^http/, "ws");
}

function buildPresenceMap(users: Map<string, PresenceUser>) {
  const map: Record<string, { connectionId: string; name: string; email: string }[]> = {};
  for (const [userId, u] of users) {
    (map[u.fileId] ??= []).push({ connectionId: userId, name: u.name, email: u.email });
  }
  return map;
}

export function useDocumentSocket(documentId: string, onCompileUpdate: (event: any) => void) {
  const [presenceByFile, setPresenceByFile] = useState<Record<string, any[]>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const activeFileRef = useRef<string | null>(null);
  const usersRef = useRef<Map<string, PresenceUser>>(new Map());
  const onCompileUpdateRef = useRef(onCompileUpdate);
  onCompileUpdateRef.current = onCompileUpdate;

  useEffect(() => {
    const url = `${resolveWsBase()}/api/texademia/ws/documents/${documentId}`;
    console.log("[ws] connecting to", url);
    const socket = new WebSocket(url);
    wsRef.current = socket;

    socket.onopen = () => console.log("[ws] open");
    socket.onclose = (e) => console.log("[ws] closed", e.code, e.reason);
    socket.onerror = (e) => console.log("[ws] error", e);

    const heartbeat = setInterval(() => {
      console.log("[ws] readyState:", socket.readyState, "activeFile:", activeFileRef.current);
      if (socket.readyState === WebSocket.OPEN && activeFileRef.current) {
        socket.send(JSON.stringify({ type: "presence", fileId: activeFileRef.current }));
      }
    }, PRESENCE_INTERVAL_MS);

    const sweep = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [userId, u] of usersRef.current) {
        if (now - u.lastSeen > STALE_AFTER_MS) {
          usersRef.current.delete(userId);
          changed = true;
        }
      }
      if (changed) setPresenceByFile(buildPresenceMap(usersRef.current));
    }, 3000);

    socket.onmessage = (event) => {
      console.log("[ws] message received:", event.data);
      const payload = JSON.parse(event.data);
      if (payload.type === "presence") {
        usersRef.current.set(payload.userId, {
          fileId: payload.fileId,
          name: payload.name,
          email: payload.email,
          lastSeen: Date.now(),
        });
        setPresenceByFile(buildPresenceMap(usersRef.current));
      } else if (payload.type === "compile:update") {
        onCompileUpdateRef.current(payload);
      }
    };

    return () => {
      console.log("[ws] effect cleanup — closing socket, readyState was", socket.readyState);
      clearInterval(heartbeat);
      clearInterval(sweep);
      socket.close();
    };
  }, [documentId]);

  const setActiveFile = (fileId: string) => {
    activeFileRef.current = fileId;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "presence", fileId }));
    }
  };

  return { presenceByFile, setActiveFile };
}

```


## redaction/hooks/useDocuments.ts

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createDocument, deleteDocument, getDocument } from "../api/redaction";

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

// NEW
export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
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
// redaction/index.ts
export { RedactionPage } from "./components/redactionPage";
export { DocumentsListPage } from "./components/documentsListPage";
export { InvitationsBell } from "./components/invitationsBell"; // NEW
export {
  createDocument,
  deleteDocument,
  documentQueryOptions,
  documentsQueryOptions,
  startCompileJob,
  pollCompileStatus,
  type CompileJobResponse,
  type CompilePollResponse,
} from "./api/redaction";

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


## redaction/store/headerStore.ts

```ts
import { create } from "zustand";
import type { ProjectFile } from "../types/redaction";

interface HeaderState {
  documentId: string | null;
  files: ProjectFile[];
  activeFileId: string | null;
  loadDocument: (documentId: string, files: ProjectFile[]) => void;
  setActiveFileId: (id: string) => void;
  updateActiveFileContent: (content: string) => void;
}

export const useHeaderStore = create<HeaderState>((set, get) => ({
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
export interface LineAuthor {
  author: string;
  editedAt: string;
}


export interface ProjectFile {
  id: string;
  name: string;
  language: "latex" | "bibtex" | "log";
  content: string;
  lineAuthors?: LineAuthor[];
}

export interface RedactionDocument {
  id: string;
  title: string;
  template: string;
  files: ProjectFile[];
  pdfUrl: string | null;
  createdAt: string; // NEW
  updatedAt: string;
}

// CompileResponse is no longer used directly — kept for compatibility
export interface CompileResponse {
  pdfUrl: string;
}

export interface CompileError {
  message: string;
  log?: string;
}

export type CollaboratorRole = "reader" | "writer";

export interface Collaborator {
  id: string;
  userId: string;
  email: string;
  role: CollaboratorRole;
  status: "pending" | "accepted";
}

export interface RedactionDocument {
  id: string;
  title: string;
  template: string;
  files: ProjectFile[];
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
  role: "owner" | CollaboratorRole;
  collaborators: Collaborator[];
}

export interface Invitation {
  id: string;
  documentId: string;
  documentTitle: string;
  role: CollaboratorRole;
  invitedByEmail: string;
}

```

