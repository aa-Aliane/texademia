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
import { useMediaQuery } from "@mantine/hooks";
import {
  ActionIcon,
  Indicator,
  Avatar,
  Badge,
  Box,
  Button,
  Group,
  Menu,
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
  IconDotsVertical,
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
import { CollaboratorsDialog } from "./collaboratorsDialog";
import { useDocumentsPresence } from "../hooks/useDocumentsPresence";
import { useDocumentsUIStore, type DocumentsUIStoreState } from "../store/documentsStore";
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
  const viewersByDocument = useDocumentsPresence();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // dialog opened state
  const dialogOpened = useDocumentsUIStore((state:DocumentsUIStoreState) => state.dialogOpened);
  const setDialogOpened = useDocumentsUIStore((state: DocumentsUIStoreState) => state.setDialogOpened)

  // duplicate target state
  const duplicateTarget = useDocumentsUIStore((state: DocumentsUIStoreState) => state.duplicateTarget);
  const setDuplicateTarget = useDocumentsUIStore((state: DocumentsUIStoreState) => state.setDuplicateTarget);

  // delete target state
  const deleteTarget = useDocumentsUIStore((state: DocumentsUIStoreState) => state.deleteTarget);
  const setDeleteTarget = useDocumentsUIStore((state: DocumentsUIStoreState) => state.setDeleteTarget);

  // collaborators target state
  const collaboratorsTarget = useDocumentsUIStore((state: DocumentsUIStoreState) => state.collaboratorsTarget);
  const setCollaboratorsTarget = useDocumentsUIStore((state: DocumentsUIStoreState) => state.setCollaboratorsTarget)



  // global filter state
  const globalFilter = useDocumentsUIStore((state: DocumentsUIStoreState) => state.globalFilter);
  const setGlobalFilter = useDocumentsUIStore((state: DocumentsUIStoreState) => state.setGlobalFilter);

  // sorting state
  const sorting = useDocumentsUIStore((state: DocumentsUIStoreState) => state.sorting);
  const setSorting = useDocumentsUIStore((state: DocumentsUIStoreState) => state.setSorting);

  // Collapse the per-row action icons into a single "⋮" menu once the
  // viewport gets tight (matches the mantine-breakpoint-md var: 62em).
  const isCompact = useMediaQuery("(max-width: 62em)");

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

          const liveViewers = viewersByDocument[doc.id] ?? []; // NEW

          return (
            <Group gap={6} wrap="nowrap">
              {others.slice(0, 4).map((c) => {
                const isViewing = liveViewers.some((v) => v.email === c.email); // NEW
                return (
                  <Tooltip
                    key={c.id}
                    label={`${c.email} · ${c.role === "writer" ? "Can edit" : "Can view"}${
                      c.status === "pending" ? " (invitation pending)" : isViewing ? " · Viewing now" : ""
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
                      <Indicator
                        disabled={!isViewing}
                        size={10}
                        color="teal"
                        offset={2}
                        position="top-end"
                        processing
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
                    </Indicator>
                  </Tooltip>
                );
              })}
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

          // Narrow screens: collapse everything into a single menu button
          // so the column never has to squeeze 3-4 icons into a tiny cell.
          if (isCompact) {
            return (
              <Box
                h="100%"
                mih={40}
                style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <Menu shadow="md" width={190} position="bottom-end" withinPortal>
                  <Menu.Target>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconDotsVertical size={15} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
                    {doc.role === "owner" && (
                      <Menu.Item
                        leftSection={<IconUsers size={14} />}
                        onClick={() => setCollaboratorsTarget(doc)}
                      >
                        Share
                      </Menu.Item>
                    )}
                    <Menu.Item
                      leftSection={<IconCopy size={14} />}
                      onClick={() => setDuplicateTarget(doc)}
                    >
                      Duplicate
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconDownload size={14} />}
                      disabled={!doc.pdfUrl}
                      component="a"
                      href={doc.pdfUrl ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {doc.pdfUrl ? "Download PDF" : "Compile first"}
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                      leftSection={<IconTrash size={14} />}
                      color="red"
                      onClick={() => setDeleteTarget(doc)}
                    >
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Box>
            );
          }

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
                      <IconUsers size={15} />
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
                    <IconCopy size={15} />
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
                    styles={{
                      root: {
                        backgroundColor: "transparent",
                        "&[data-disabled]": {
                          backgroundColor: "transparent",
                          color: "var(--color-text-muted)",
                          opacity: 0.5,
                        },
                      },
                    }}
                  >
                    <IconDownload size={15} />
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
                    <IconTrash size={15} />
                  </ActionIcon>
                </Tooltip>
              </div>
            </Box>
          );
        },
        enableSorting: false,
      }),
    ],
    [isCompact, viewersByDocument]
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
    <Stack p={{ base: "md", sm: "xl" }} gap="lg">
      <Group justify="space-between" align="flex-end">
        <Stack gap={2}>
          <Text ff="monospace" fz={11} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.2em" }}>
            System Storage
          </Text>
          <Title order={2} c="accent">
            Your Library {String(dialogOpened)}
          </Title>
        </Stack>
        <Button leftSection={<IconPlus size={15} />} onClick={() => { setDialogOpened(true); console.log("dliag opened", dialogOpened)}}>
          New document
        </Button>
      </Group>

      <TextInput
        placeholder="Search documents…"
        leftSection={<IconSearch size={15} />}
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
        {/* Only the table itself scrolls horizontally — the footer below
            stays put so the pagination controls are always visible. */}
        <Box style={{ overflowX: "auto" }}>
          <Table
            withColumnBorders
            highlightOnHover
            verticalSpacing="md"
            horizontalSpacing="lg"
            miw={720}
            style={{ tableLayout: "fixed" }}
          >
            <Table.Thead bg="gray.0">
              {table.getHeaderGroups().map((headerGroup) => (
                <Table.Tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <Table.Th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      style={{
                        cursor: header.column.getCanSort() ? "pointer" : "default",
                        ...(header.id === "actions"
                          ? { width: isCompact ? 56 : 150, textAlign: "center" }
                          : {}),
                      }}
                    >
                      <Group gap={4} wrap="nowrap" justify={header.id === "actions" ? "center" : "flex-start"}>
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
                    <Table.Td
                      key={cell.id}
                      style={
                        cell.column.id === "actions" ? { width: isCompact ? 56 : 150 } : undefined
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Table.Td>
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
        </Box>

        <Group
          justify="space-between"
          p="md"
          bg="gray.0"
          wrap="wrap"
          gap="sm"
          style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}
        >
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
