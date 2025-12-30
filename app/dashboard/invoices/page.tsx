"use client";

import { useState, useMemo, useCallback, useRef, useEffect, KeyboardEvent } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Search,
    RefreshCw,
    Download,
    Trash2,
    ChevronDown,
    Columns,
    LayoutList,
    Pencil,
    ExternalLink,
    Trash,
    DollarSign,
    FileText,
    Clock,
    AlertCircle,
} from "lucide-react";
import { useInvoices, useSettings } from "@/lib/hooks";
import type { InvoiceStatus } from "@/lib/types";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { TableSkeleton, StatCardSkeleton } from "@/components/ui/skeleton-loaders";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Shared Data Table Components
import { DraggableColumnHeader, DataTableColumnDef } from "@/components/ui/data-table/draggable-column-header";
import { DataTablePagination } from "@/components/ui/data-table/pagination";
import { SelectionBanner, SelectionMode } from "@/components/ui/data-table/selection-banner";

// DND Kit imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
} from "@dnd-kit/sortable";

import { InvoiceHeader } from "@/components/dashboard/invoices/invoice-header";

const statusColors: Record<InvoiceStatus, { bg: string; text: string; border: string }> = {
    draft: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
    sent: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
    viewed: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" },
    partial: { bg: "bg-yellow-50", text: "text-yellow-600", border: "border-yellow-200" },
    paid: { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
    overdue: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
    cancelled: { bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-200" },
};

const statusLabels: Record<InvoiceStatus, string> = {
    draft: "Draft",
    sent: "Sent",
    viewed: "Viewed",
    partial: "Partial",
    paid: "Paid",
    overdue: "Overdue",
    cancelled: "Cancelled",
};

type ColumnKey = "number" | "customer" | "date" | "dueDate" | "amount" | "status";
type RowDensity = "compact" | "comfortable" | "spacious";
type SortDirection = "asc" | "desc" | null;

// Extend DataTableColumnDef to simulate specific key type
interface InvoiceColumnDef extends Omit<DataTableColumnDef, "key"> {
    key: ColumnKey;
}

const DEFAULT_COLUMNS: InvoiceColumnDef[] = [
    { key: "number", label: "Invoice #", defaultVisible: true, required: true, sortable: true },
    { key: "customer", label: "Customer", defaultVisible: true, sortable: true },
    { key: "date", label: "Date", defaultVisible: true, sortable: true },
    { key: "dueDate", label: "Due Date", defaultVisible: true, sortable: true },
    { key: "amount", label: "Amount", defaultVisible: true, sortable: true },
    { key: "status", label: "Status", defaultVisible: true, sortable: true },
];

const DEFAULT_COLUMN_WIDTHS: Record<ColumnKey, number> = {
    number: 180,
    customer: 250,
    date: 150,
    dueDate: 150,
    amount: 150,
    status: 150,
};

const ROW_DENSITY_STYLES: Record<RowDensity, string> = {
    compact: "py-1 text-xs",
    comfortable: "py-2 text-sm",
    spacious: "py-4 text-sm",
};

function HighlightText({ text, search }: { text: string; search: string }) {
    if (!search.trim() || !text) return <>{text}</>;
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return (
        <>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <mark key={i} className="bg-yellow-200 px-0.5 rounded">
                        {part}
                    </mark>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </>
    );
}

function QuickStatsBar({ invoices, currency, totalCount }: { invoices: any[]; currency: string; totalCount?: number }) {
    const total = totalCount ?? invoices.length;
    const paid = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + (i.total || 0), 0);
    const overdue = invoices.filter((i) => i.status === "overdue").length;
    const draft = invoices.filter((i) => i.status === "draft").length;
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <FileText className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Total</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">{total}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Paid</span>
                </div>
                <div className="text-2xl font-bold text-green-900">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency }).format(paid)}
                </div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-red-600 mb-1">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Overdue</span>
                </div>
                <div className="text-2xl font-bold text-red-900">{overdue}</div>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Draft</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{draft}</div>
            </div>
        </div>
    );
}

export default function InvoicesPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
    const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
    const [selectionMode, setSelectionMode] = useState<SelectionMode>("none");
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage, setRecordsPerPage] = useState(25);
    const [columnVisibility, setColumnVisibility] = useState<Record<ColumnKey, boolean>>(() => {
        const v: Record<string, boolean> = {};
        DEFAULT_COLUMNS.forEach((col) => {
            v[col.key] = col.defaultVisible;
        });
        return v as Record<ColumnKey, boolean>;
    });
    const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(DEFAULT_COLUMNS.map((c) => c.key));
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(DEFAULT_COLUMN_WIDTHS);
    const [sortKey, setSortKey] = useState<ColumnKey | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [rowDensity, setRowDensity] = useState<RowDensity>("comfortable");
    const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
    const tableRef = useRef<HTMLDivElement>(null);

    const isSearching = !!searchQuery.trim();
    const isClientMode = isSearching;

    const {
        invoices,
        loading,
        deleteInvoice,
        totalRecords: dbTotalRecords,
    } = useInvoices({
        status: statusFilter,
        limit: isClientMode ? 1000 : recordsPerPage,
        page: isClientMode ? 1 : currentPage,
        orderByField: (sortKey === "date"
            ? "date"
            : sortKey === "amount"
              ? "total"
              : sortKey === "status"
                ? "status"
                : "createdAt") as any,
        orderDirection: sortDirection || "desc",
    });
    const { settings } = useSettings();
    const currency = settings.currency || "USD";

    const filteredInvoices = useMemo(() => {
        if (!isClientMode) return invoices;
        return invoices.filter(
            (invoice) =>
                String(invoice.number || "")
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                String(invoice.customerName || "")
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase())
        );
    }, [invoices, searchQuery, isClientMode]);

    const totalRecords = isClientMode ? filteredInvoices.length : dbTotalRecords || 0;
    const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));

    // If client mode, slice. If server mode, invoices IS the slice.
    const paginatedInvoices = isClientMode
        ? filteredInvoices.slice(
              (currentPage - 1) * recordsPerPage,
              (currentPage - 1) * recordsPerPage + recordsPerPage
          )
        : filteredInvoices;

    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + paginatedInvoices.length, totalRecords);
    const currentPageIds = paginatedInvoices.map((i) => i.id);
    const allFilteredIds = filteredInvoices.map((i) => i.id);
    const orderedColumns = useMemo(
        () => columnOrder.map((key) => DEFAULT_COLUMNS.find((c) => c.key === key)!).filter(Boolean),
        [columnOrder]
    );
    const visibleColumnsCount = Object.values(columnVisibility).filter(Boolean).length;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id)
            setColumnOrder((items) =>
                arrayMove(items, items.indexOf(active.id as ColumnKey), items.indexOf(over.id as ColumnKey))
            );
    }, []);

    // Column Resizing Logic
    const handleColumnResize = useCallback(
        (e: React.MouseEvent, key: string) => {
            e.preventDefault();
            const startX = e.pageX;
            const startWidth = columnWidths[key] || 150;

            const onMouseMove = (moveEvent: MouseEvent) => {
                const diff = moveEvent.pageX - startX;
                setColumnWidths((prev) => ({
                    ...prev,
                    [key]: Math.max(50, startWidth + diff), // Min width 50px
                }));
            };

            const onMouseUp = () => {
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
            };

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        },
        [columnWidths]
    );

    const handleSort = useCallback(
        (key: string) => {
            const colKey = key as ColumnKey;
            if (sortKey === colKey) {
                if (sortDirection === "asc") setSortDirection("desc");
                else {
                    setSortKey(null);
                    setSortDirection(null);
                }
            } else {
                setSortKey(colKey);
                setSortDirection("asc");
            }
        },
        [sortKey, sortDirection]
    );

    const formatDate = (timestamp: { toDate: () => Date } | null | undefined) => {
        if (!timestamp) return "-";
        try {
            return format(timestamp.toDate(), "dd/MM/yyyy");
        } catch {
            return "-";
        }
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

    const handleDelete = useCallback(
        async (id: string) => {
            if (window.confirm("Delete this invoice?")) await deleteInvoice(id);
        },
        [deleteInvoice]
    );

    const handleBulkDelete = useCallback(async () => {
        if (selectedInvoices.length === 0) return;
        if (window.confirm(`Delete ${selectedInvoices.length} invoices?`)) {
            for (const id of selectedInvoices) await deleteInvoice(id);
            setSelectedInvoices([]);
            setSelectionMode("none");
        }
    }, [selectedInvoices, deleteInvoice]);

    const handleSelectAllOnPage = useCallback(() => {
        setSelectedInvoices(currentPageIds);
        setSelectionMode("page");
    }, [currentPageIds]);
    const handleSelectAllRecords = useCallback(() => {
        setSelectedInvoices(allFilteredIds);
        setSelectionMode("all");
    }, [allFilteredIds]);
    const handleClearSelection = useCallback(() => {
        setSelectedInvoices([]);
        setSelectionMode("none");
    }, []);
    const handleSelectInvoice = useCallback((id: string, checked: boolean) => {
        if (checked) setSelectedInvoices((prev) => [...prev, id]);
        else setSelectedInvoices((prev) => prev.filter((i) => i !== id));
    }, []);

    const toggleColumn = useCallback((key: ColumnKey) => {
        const col = DEFAULT_COLUMNS.find((c) => c.key === key);
        if (col?.required) return;
        setColumnVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const exportInvoices = useCallback(() => {
        const headers = ["ID", "Number", "Customer", "Date", "Due Date", "Amount", "Status"];
        const rows = filteredInvoices.map((i) => [
            i.id,
            i.number || "",
            i.customerName || "",
            formatDate(i.date),
            formatDate(i.dueDate),
            i.total || 0,
            i.status,
        ]);
        const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `invoices_export_${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
    }, [filteredInvoices]);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLDivElement>) => {
            if (paginatedInvoices.length === 0) return;
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setFocusedRowIndex((prev) =>
                        prev === null ? 0 : Math.min(prev + 1, paginatedInvoices.length - 1)
                    );
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setFocusedRowIndex((prev) => (prev === null ? 0 : Math.max(prev - 1, 0)));
                    break;
                case " ":
                    e.preventDefault();
                    if (focusedRowIndex !== null) {
                        const i = paginatedInvoices[focusedRowIndex];
                        handleSelectInvoice(i.id, !selectedInvoices.includes(i.id));
                    }
                    break;
                case "Enter":
                case "ArrowRight":
                    if (focusedRowIndex !== null) {
                        /* Navigate to view */
                    }
                    break;
            }
        },
        [paginatedInvoices, focusedRowIndex, handleSelectInvoice, selectedInvoices]
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter]);

    const isAllPageSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedInvoices.includes(id));
    const isSomeSelected = selectedInvoices.length > 0 && !isAllPageSelected;

    const renderCell = (invoice: any, column: InvoiceColumnDef) => {
        switch (column.key) {
            case "number":
                return (
                    <div className="flex flex-col gap-0.5">
                        <Link
                            href={`/dashboard/invoices/${invoice.id}`}
                            className="font-medium text-blue-600 hover:underline block truncate w-fit"
                        >
                            <HighlightText text={invoice.number || "-"} search={searchQuery} />
                        </Link>
                        {/* Hover Actions Menu */}
                        <div className="flex items-center gap-2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity h-4 -ml-0.5">
                            <Link
                                href={`/dashboard/invoices/${invoice.id}`}
                                className="hover:text-blue-600 hover:underline px-0.5"
                            >
                                View
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                href={`/dashboard/invoices/${invoice.id}/edit`}
                                className="hover:text-blue-600 hover:underline px-0.5"
                            >
                                Edit
                            </Link>
                            <span className="text-gray-300">|</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(invoice.id);
                                }}
                                className="hover:text-red-600 hover:underline px-0.5"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                );
            case "customer":
                return (
                    <span className="text-gray-700">
                        <HighlightText text={invoice.customerName || "-"} search={searchQuery} />
                    </span>
                );
            case "date":
                return <span className="text-gray-500">{formatDate(invoice.date)}</span>;
            case "dueDate":
                return <span className="text-gray-500">{formatDate(invoice.dueDate)}</span>;
            case "amount":
                return <span className="font-medium text-gray-900">{formatCurrency(invoice.total || 0)}</span>;
            case "status": {
                const colors = statusColors[invoice.status as InvoiceStatus] || statusColors.draft;
                return (
                    <Badge className={`${colors.bg} ${colors.text} ${colors.border} border shadow-none font-medium`}>
                        {statusLabels[invoice.status as InvoiceStatus] || invoice.status}
                    </Badge>
                );
            }
            default:
                return null;
        }
    };

    return (
        <TooltipProvider>
            <div className="space-y-6">
                <InvoiceHeader invoices={invoices} />
                {loading ? (
                    <StatCardSkeleton count={4} />
                ) : (
                    <QuickStatsBar invoices={invoices} currency={currency} totalCount={totalRecords} />
                )}

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link href="/dashboard/invoices/new">
                            <Button className="bg-gray-900 text-white hover:bg-gray-800">
                                <span className="hidden sm:inline">
                                    <span className="mr-2">+</span>Create New Invoice
                                </span>
                                <span className="sm:hidden">+ Invoice</span>
                            </Button>
                        </Link>
                        <span className="text-sm text-gray-500">Show</span>
                        <Select
                            value={recordsPerPage.toString()}
                            onValueChange={(v) => {
                                setRecordsPerPage(parseInt(v));
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[70px] h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={exportInvoices}>
                            <Download className="mr-2 h-4 w-4" />
                            Export
                        </Button>
                        {selectedInvoices.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                                        <Badge className="mr-2 bg-blue-600">{selectedInvoices.length}</Badge>Bulk{" "}
                                        <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuLabel>With {selectedInvoices.length} selected</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-red-600" onClick={handleBulkDelete}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <Button variant="outline" size="icon" onClick={() => window.location.reload()}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon">
                                    <LayoutList className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Density</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuRadioGroup
                                    value={rowDensity}
                                    onValueChange={(v) => setRowDensity(v as RowDensity)}
                                >
                                    <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="spacious">Spacious</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon">
                                    <Columns className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>
                                    Columns ({visibleColumnsCount}/{DEFAULT_COLUMNS.length})
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {DEFAULT_COLUMNS.map((col) => (
                                    <DropdownMenuCheckboxItem
                                        key={col.key}
                                        checked={columnVisibility[col.key]}
                                        onCheckedChange={() => toggleColumn(col.key)}
                                        disabled={col.required}
                                    >
                                        {col.label}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <SelectionBanner
                    selectionMode={selectionMode}
                    selectedCount={selectedInvoices.length}
                    totalCount={totalRecords}
                    onSelectAll={handleSelectAllRecords}
                    onClearSelection={handleClearSelection}
                />

                {/* Table */}
                <div
                    ref={tableRef}
                    tabIndex={0}
                    onKeyDown={handleKeyDown}
                    className="border rounded-md bg-white overflow-x-auto focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <Table className="table-fixed">
                            <TableHeader>
                                <TableRow className="bg-gray-50 hover:bg-gray-50">
                                    <TableHead className="w-[48px] min-w-[48px] max-w-[48px] text-center bg-gray-100 sticky left-0 z-30 p-0">
                                        <div className="flex items-center justify-center w-full h-full">
                                            <Checkbox
                                                checked={isAllPageSelected}
                                                ref={(el) => {
                                                    if (el) (el as any).indeterminate = isSomeSelected;
                                                }}
                                                onCheckedChange={(c) =>
                                                    c ? handleSelectAllOnPage() : handleClearSelection()
                                                }
                                            />
                                        </div>
                                    </TableHead>
                                    <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                                        {orderedColumns.map((col) => (
                                            <DraggableColumnHeader
                                                key={col.key}
                                                column={col}
                                                sortKey={sortKey}
                                                sortDirection={sortDirection}
                                                onSort={handleSort}
                                                isVisible={columnVisibility[col.key]}
                                                width={columnWidths[col.key] || 150}
                                                onResize={handleColumnResize}
                                            />
                                        ))}
                                    </SortableContext>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={visibleColumnsCount + 1} className="p-0">
                                            <TableSkeleton columns={visibleColumnsCount + 1} rows={10} />
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedInvoices.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={visibleColumnsCount + 1}
                                            className="text-center py-10 text-muted-foreground"
                                        >
                                            {searchQuery ? "No matches" : "No invoices"}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedInvoices.map((invoice, index) => (
                                        <TableRow
                                            key={invoice.id}
                                            className={`group hover:bg-gray-50 ${selectedInvoices.includes(invoice.id) ? "bg-blue-50/50" : ""} ${focusedRowIndex === index ? "ring-2 ring-inset ring-blue-500" : ""} ${ROW_DENSITY_STYLES[rowDensity]}`}
                                        >
                                            <TableCell
                                                className={`text-center sticky left-0 z-30 p-0 w-[48px] min-w-[48px] max-w-[48px] border-r ${selectedInvoices.includes(invoice.id) ? "bg-blue-50" : "bg-white"} group-hover:bg-gray-50`}
                                            >
                                                <div className="flex items-center justify-center w-full h-full">
                                                    <Checkbox
                                                        checked={selectedInvoices.includes(invoice.id)}
                                                        onCheckedChange={(c) => handleSelectInvoice(invoice.id, !!c)}
                                                    />
                                                </div>
                                            </TableCell>
                                            {orderedColumns.map(
                                                (col) =>
                                                    columnVisibility[col.key] && (
                                                        <TableCell
                                                            key={col.key}
                                                            style={{
                                                                width: columnWidths[col.key] || 150,
                                                                minWidth: columnWidths[col.key] || 150,
                                                            }}
                                                            className={`overflow-hidden text-ellipsis whitespace-nowrap ${col.key === "number" ? `sticky left-[48px] z-30 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${selectedInvoices.includes(invoice.id) ? "bg-blue-50" : "bg-white"} group-hover:bg-gray-50` : ""}`}
                                                        >
                                                            {renderCell(invoice, col)}
                                                        </TableCell>
                                                    )
                                            )}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </DndContext>
                </div>

                <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600 font-medium">Total: {totalRecords}</span>
                        <DataTablePagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            totalRecords={totalRecords}
                            startRecord={totalRecords === 0 ? 0 : startIndex + 1}
                            endRecord={endIndex}
                            compact
                        />
                    </div>
                </div>
                <div className="text-xs text-gray-400 text-center">↑↓ Navigate • Drag headers • Fix columns</div>
            </div>
        </TooltipProvider>
    );
}
