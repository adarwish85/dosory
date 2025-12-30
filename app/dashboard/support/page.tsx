"use client";

import { useState, useMemo, useCallback, useRef, useEffect, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Plus,
    Search,
    RefreshCw,
    Loader2,
    Download,
    Trash2,
    ChevronDown,
    Columns,
    LayoutList,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    ExternalLink,
    Trash,
    Ticket,
    MessageCircle,
    Clock,
    AlertCircle,
    CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTickets } from "@/lib/hooks";
import type { TicketStatus, TicketPriority } from "@/lib/types";
import { format } from "date-fns";
import Link from "next/link";
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

const statusColors: Record<TicketStatus, { bg: string; text: string; border: string }> = {
    open: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
    in_progress: { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
    answered: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
    on_hold: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
    closed: { bg: "bg-sky-50", text: "text-sky-600", border: "border-sky-200" },
};

const statusLabels: Record<TicketStatus, string> = {
    open: "Open",
    in_progress: "In Progress",
    answered: "Answered",
    on_hold: "On Hold",
    closed: "Closed",
};

const priorityColors: Record<TicketPriority, { bg: string; text: string }> = {
    low: { bg: "bg-gray-100", text: "text-gray-600" },
    medium: { bg: "bg-blue-100", text: "text-blue-600" },
    high: { bg: "bg-red-100", text: "text-red-600" },
};

type ColumnKey = "id" | "subject" | "status" | "priority" | "lastReply" | "createdAt" | "customer";
type RowDensity = "compact" | "comfortable" | "spacious";
type SelectionMode = "none" | "page" | "all";

interface ColumnDef {
    key: ColumnKey;
    label: string;
    defaultVisible: boolean;
    required?: boolean;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
    { key: "id", label: "#", defaultVisible: true },
    { key: "subject", label: "Subject", defaultVisible: true, required: true },
    { key: "status", label: "Status", defaultVisible: true },
    { key: "priority", label: "Priority", defaultVisible: true },
    { key: "customer", label: "Customer", defaultVisible: false },
    { key: "lastReply", label: "Last Reply", defaultVisible: true },
    { key: "createdAt", label: "Created", defaultVisible: true },
];

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

function QuickStatsBar({ tickets, stats }: { tickets: any[]; stats: Record<string, number> }) {
    const highPriorityCount = tickets.filter((t) => t.priority === "high").length;
    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <Ticket className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Total</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">{tickets.length}</div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-red-600 mb-1">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Open</span>
                </div>
                <div className="text-2xl font-bold text-red-900">{stats.open || 0}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">In Progress</span>
                </div>
                <div className="text-2xl font-bold text-green-900">{stats.in_progress || 0}</div>
            </div>
            <div className="bg-gradient-to-br from-sky-50 to-sky-100 border border-sky-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-sky-600 mb-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Closed</span>
                </div>
                <div className="text-2xl font-bold text-sky-900">{stats.closed || 0}</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-orange-600 mb-1">
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">High Priority</span>
                </div>
                <div className="text-2xl font-bold text-orange-900">{highPriorityCount}</div>
            </div>
        </div>
    );
}

function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    totalRecords,
    startRecord,
    endRecord,
    compact = false,
}: {
    currentPage: number;
    totalPages: number;
    onPageChange: (p: number) => void;
    totalRecords: number;
    startRecord: number;
    endRecord: number;
    compact?: boolean;
}) {
    const canPrev = currentPage > 1,
        canNext = currentPage < totalPages;
    return (
        <div className={`flex items-center ${compact ? "gap-1" : "justify-between gap-4"}`}>
            {!compact && (
                <div className="text-sm text-gray-500">
                    Showing {startRecord} to {endRecord} of {totalRecords}
                </div>
            )}
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(1)}
                    disabled={!canPrev}
                >
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={!canPrev}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1 px-2 text-sm">
                    <span className="font-medium">{currentPage}</span>
                    <span className="text-gray-700">of {totalPages}</span>
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={!canNext}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(totalPages)}
                    disabled={!canNext}
                >
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

function SelectionBanner({
    selectionMode,
    selectedCount,
    totalCount,
    onSelectAll,
    onClearSelection,
}: {
    selectionMode: SelectionMode;
    selectedCount: number;
    totalCount: number;
    onSelectAll: () => void;
    onClearSelection: () => void;
}) {
    if (selectionMode === "none" || selectedCount === 0) return null;
    return (
        <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-2 flex items-center justify-center gap-2 text-sm mb-2">
            <span className="text-blue-800">
                <strong>{selectedCount}</strong> selected.
            </span>
            {selectionMode === "page" && selectedCount < totalCount && (
                <button onClick={onSelectAll} className="text-blue-600 font-medium hover:underline">
                    Select all {totalCount}
                </button>
            )}
            <button onClick={onClearSelection} className="text-blue-600 font-medium hover:underline ml-2">
                Clear
            </button>
        </div>
    );
}

export default function SupportPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
    const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
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
    const [rowDensity, setRowDensity] = useState<RowDensity>("comfortable");
    const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
    const tableRef = useRef<HTMLDivElement>(null);

    const { tickets, loading, ticketStats, deleteTicket } = useTickets({ status: statusFilter });

    const filteredTickets = useMemo(() => {
        return tickets.filter((ticket) => ticket.subject?.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [tickets, searchQuery]);

    const totalRecords = filteredTickets.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + recordsPerPage, totalRecords);
    const paginatedTickets = filteredTickets.slice(startIndex, endIndex);
    const currentPageIds = paginatedTickets.map((t) => t.id);
    const allFilteredIds = filteredTickets.map((t) => t.id);
    const visibleColumns = DEFAULT_COLUMNS.filter((col) => columnVisibility[col.key]);
    const visibleColumnsCount = visibleColumns.length;

    const formatDate = (timestamp: { toDate: () => Date } | null | undefined) => {
        if (!timestamp) return "-";
        try {
            return format(timestamp.toDate(), "dd/MM/yyyy HH:mm");
        } catch {
            return "-";
        }
    };

    const handleDelete = useCallback(
        async (id: string) => {
            if (window.confirm("Delete this ticket?")) await deleteTicket(id);
        },
        [deleteTicket]
    );

    const handleBulkDelete = useCallback(async () => {
        if (selectedTickets.length === 0) return;
        if (window.confirm(`Delete ${selectedTickets.length} tickets?`)) {
            for (const id of selectedTickets) await deleteTicket(id);
            setSelectedTickets([]);
            setSelectionMode("none");
        }
    }, [selectedTickets, deleteTicket]);

    const handleSelectAllOnPage = useCallback(() => {
        setSelectedTickets(currentPageIds);
        setSelectionMode("page");
    }, [currentPageIds]);
    const handleSelectAllRecords = useCallback(() => {
        setSelectedTickets(allFilteredIds);
        setSelectionMode("all");
    }, [allFilteredIds]);
    const handleClearSelection = useCallback(() => {
        setSelectedTickets([]);
        setSelectionMode("none");
    }, []);
    const handleSelectTicket = useCallback((id: string, checked: boolean) => {
        if (checked) setSelectedTickets((prev) => [...prev, id]);
        else setSelectedTickets((prev) => prev.filter((i) => i !== id));
    }, []);

    const isAllPageSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedTickets.includes(id));
    const isSomeSelected = selectedTickets.length > 0 && !isAllPageSelected;

    const toggleColumn = useCallback((key: ColumnKey) => {
        const col = DEFAULT_COLUMNS.find((c) => c.key === key);
        if (col?.required) return;
        setColumnVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const exportTickets = useCallback(() => {
        const headers = ["ID", "Subject", "Status", "Priority", "Last Reply", "Created"];
        const rows = filteredTickets.map((t) => [
            t.id,
            t.subject,
            t.status,
            t.priority,
            formatDate(t.lastReply),
            formatDate(t.createdAt),
        ]);
        const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `tickets_export_${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
    }, [filteredTickets]);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLDivElement>) => {
            if (paginatedTickets.length === 0) return;
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setFocusedRowIndex((prev) => (prev === null ? 0 : Math.min(prev + 1, paginatedTickets.length - 1)));
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setFocusedRowIndex((prev) => (prev === null ? 0 : Math.max(prev - 1, 0)));
                    break;
                case " ":
                    e.preventDefault();
                    if (focusedRowIndex !== null) {
                        const t = paginatedTickets[focusedRowIndex];
                        handleSelectTicket(t.id, !selectedTickets.includes(t.id));
                    }
                    break;
            }
        },
        [paginatedTickets, focusedRowIndex, handleSelectTicket, selectedTickets]
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter]);

    if (loading)
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );

    return (
        <TooltipProvider>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">Support Tickets</h2>
                    <Button className="bg-gray-900 text-white hover:bg-gray-800">
                        <Plus className="mr-2 h-4 w-4" /> New Ticket
                    </Button>
                </div>

                <QuickStatsBar tickets={tickets} stats={ticketStats} />

                {/* Status Tabs */}
                <div className="flex flex-wrap gap-2">
                    {(["open", "in_progress", "answered", "on_hold", "closed"] as TicketStatus[]).map((status) => {
                        const colors = statusColors[status];
                        const count = ticketStats[status] || 0;
                        const isActive = statusFilter === status;
                        return (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(isActive ? "all" : status)}
                                className={`border rounded-full px-3 py-1 text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors ${isActive ? `${colors.bg} ${colors.text} ${colors.border}` : "bg-white text-gray-500 hover:bg-gray-50"}`}
                            >
                                <span className="font-bold text-gray-900">{count}</span> {statusLabels[status]}
                            </button>
                        );
                    })}
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-2">
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
                        <Button variant="outline" onClick={exportTickets}>
                            <Download className="mr-2 h-4 w-4" />
                            Export
                        </Button>
                        {selectedTickets.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                                        <Badge className="mr-2 bg-blue-600">{selectedTickets.length}</Badge>Bulk{" "}
                                        <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuLabel>With {selectedTickets.length} selected</DropdownMenuLabel>
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
                    selectedCount={selectedTickets.length}
                    totalCount={totalRecords}
                    onSelectAll={handleSelectAllRecords}
                    onClearSelection={handleClearSelection}
                />
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalRecords={totalRecords}
                    startRecord={totalRecords === 0 ? 0 : startIndex + 1}
                    endRecord={endIndex}
                />

                {/* Table */}
                <div
                    ref={tableRef}
                    tabIndex={0}
                    onKeyDown={handleKeyDown}
                    className="border rounded-md bg-white overflow-x-auto focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                <TableHead className="w-[40px]">
                                    <Checkbox
                                        checked={isAllPageSelected}
                                        ref={(el) => {
                                            if (el) (el as any).indeterminate = isSomeSelected;
                                        }}
                                        onCheckedChange={(c) => (c ? handleSelectAllOnPage() : handleClearSelection())}
                                    />
                                </TableHead>
                                {columnVisibility.id && <TableHead className="w-10">#</TableHead>}
                                {columnVisibility.subject && (
                                    <TableHead className="font-semibold text-gray-900">Subject</TableHead>
                                )}
                                {columnVisibility.status && <TableHead>Status</TableHead>}
                                {columnVisibility.priority && <TableHead>Priority</TableHead>}
                                {columnVisibility.customer && <TableHead>Customer</TableHead>}
                                {columnVisibility.lastReply && <TableHead>Last Reply</TableHead>}
                                {columnVisibility.createdAt && <TableHead>Created</TableHead>}
                                <TableHead className="w-24 text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedTickets.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={visibleColumnsCount + 2}
                                        className="text-center py-10 text-muted-foreground"
                                    >
                                        {searchQuery ? "No matches" : "No tickets"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedTickets.map((ticket, index) => {
                                    const statusColor = statusColors[ticket.status];
                                    const priorityColor = priorityColors[ticket.priority];
                                    return (
                                        <TableRow
                                            key={ticket.id}
                                            className={`group hover:bg-gray-50 ${selectedTickets.includes(ticket.id) ? "bg-blue-50/50" : ""} ${focusedRowIndex === index ? "ring-2 ring-inset ring-blue-500" : ""} ${ROW_DENSITY_STYLES[rowDensity]}`}
                                        >
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedTickets.includes(ticket.id)}
                                                    onCheckedChange={(c) => handleSelectTicket(ticket.id, !!c)}
                                                />
                                            </TableCell>
                                            {columnVisibility.id && (
                                                <TableCell className="text-gray-500">
                                                    {startIndex + index + 1}
                                                </TableCell>
                                            )}
                                            {columnVisibility.subject && (
                                                <TableCell className="font-medium">
                                                    <Link
                                                        href={`/dashboard/support/${ticket.id}`}
                                                        className="text-blue-600 hover:underline"
                                                    >
                                                        <HighlightText
                                                            text={ticket.subject || "-"}
                                                            search={searchQuery}
                                                        />
                                                    </Link>
                                                </TableCell>
                                            )}
                                            {columnVisibility.status && (
                                                <TableCell>
                                                    <Badge
                                                        className={`${statusColor.bg} ${statusColor.text} ${statusColor.border} border`}
                                                    >
                                                        {statusLabels[ticket.status]}
                                                    </Badge>
                                                </TableCell>
                                            )}
                                            {columnVisibility.priority && (
                                                <TableCell>
                                                    <Badge
                                                        className={`${priorityColor.bg} ${priorityColor.text} border-0`}
                                                    >
                                                        {ticket.priority.charAt(0).toUpperCase() +
                                                            ticket.priority.slice(1)}
                                                    </Badge>
                                                </TableCell>
                                            )}
                                            {columnVisibility.customer && (
                                                <TableCell className="text-gray-500">
                                                    {ticket.customerName || "-"}
                                                </TableCell>
                                            )}
                                            {columnVisibility.lastReply && (
                                                <TableCell className="text-gray-500">
                                                    {formatDate(ticket.lastReply)}
                                                </TableCell>
                                            )}
                                            {columnVisibility.createdAt && (
                                                <TableCell className="text-gray-500">
                                                    {formatDate(ticket.createdAt)}
                                                </TableCell>
                                            )}
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Link href={`/dashboard/support/${ticket.id}`}>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </Link>
                                                        </TooltipTrigger>
                                                        <TooltipContent>View</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                                onClick={() => handleDelete(ticket.id)}
                                                            >
                                                                <Trash className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Delete</TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 font-medium">Total: {totalRecords}</div>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalRecords={totalRecords}
                        startRecord={totalRecords === 0 ? 0 : startIndex + 1}
                        endRecord={endIndex}
                        compact
                    />
                </div>
                <div className="text-xs text-gray-400 text-center">↑↓ Navigate • Space Select • Click to view</div>
            </div>
        </TooltipProvider>
    );
}
