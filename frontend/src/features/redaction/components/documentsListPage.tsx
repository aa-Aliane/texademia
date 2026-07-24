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
  IconDownload,
  IconFileText,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { createDocument, deleteDocument, documentsQueryOptions, duplicateDocument } from "../api/redaction";
import { CreateDocumentDialog } from "./createDocumentDialog";
import { DuplicateDocumentDialog } from "./duplicateDocumentDialog";
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
                <Text fw={600} c="blue.9" size="sm">
                  {doc.title}
                </Text>
                <Text ff="monospace" fz={11} c="dimmed">
                  {TEMPLATE_LABELS[doc.template] ?? doc.template} · {doc.files.length}{" "}
                  {doc.files.length === 1 ? "file" : "files"}
                </Text>
              </Stack>
            </Group>
          );
        },
      }),
      columnHelper.accessor("id", {
        header: "Template",
        cell: (info) => (
          <Text ta="center" ff="monospace" fz={12} c="dimmed">
            #{info.getValue().slice(0, 8).toUpperCase()}
          </Text>
        ),
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
            <Badge variant="outline" color="blue" radius="sm" ff="monospace">
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
                <Tooltip label="Duplicate">
                  <ActionIcon
                    variant="subtle"
                    color="blue"
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
                    color="blue"
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
          <Title order={2} c="blue.9">
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

      <Box style={{ border: "1px solid var(--mantine-color-gray-3)", borderRadius: "var(--mantine-radius-md)" }}>
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

      {duplicateTarget && (
        <DuplicateDocumentDialog
          opened={!!duplicateTarget}
          onClose={() => setDuplicateTarget(null)}
          onDuplicate={(opts) => duplicate(opts)}
          isDuplicating={isDuplicating}
          sourceTitle={duplicateTarget.title}
          sourceTemplate={duplicateTarget.template}
        />
      )}

      <Modal opened={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete document" centered>
        <Stack gap="md">
          <Text size="sm">
            Delete <b>{deleteTarget?.title}</b>? This can't be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button color="red" loading={isDeleting} onClick={() => remove(deleteTarget!.id)}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
