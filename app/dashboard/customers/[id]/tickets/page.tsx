"use client";

import { useState, useMemo, useCallback, useRef, KeyboardEvent } from "react";
import { useCustomer } from "@/components/dashboard/customers/customer-context";
import { useTickets } from "@/lib/hooks/use-support";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuCheckboxItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
    Search,
    Plus,
    MoreVertical,
    ChevronDown,
    LayoutList,
    Download,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    RotateCcw,
    Loader2,
    Eye,
    Pencil,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Ticket,
    MessageCircle,
    CheckCircle2,
    RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";

// Types
type SortDirection = "asc" | "desc" | null;
type RowDensity = "compact" | "comfortable";
type ColumnKey = "id" | "subject" | "department" | "priority" | "lastReply" | "status";

interface ColumnDef {
    key: ColumnKey;
    label: string;
    defaultVisible: boolean;
    sortable?: boolean;
    width?: number;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
    { key: "id", label: "#", defaultVisible: true, sortable: true, width: 80 },
    { key: "subject", label: "Subject", defaultVisible: true, sortable: true, width: 250 },
    { key: "department", label: "Department", defaultVisible: true, sortable: true, width: 120 },
    { key: "priority", label: "Priority", defaultVisible: true, sortable: true, width: 100 },
    { key: "lastReply", label: "Last Reply", defaultVisible: true, sortable: true, width: 140 },
    { key: "status", label: "Status", defaultVisible: true, sortable: true, width: 100 },
];

const ROW_DENSITY_STYLES: Record<RowDensity, string> = { compact: "py-1 text-xs", comfortable: "py-3 text-sm" };

// Highlight text component
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

// Pagination component
function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    totalRecords,
    startRecord,
    endRecord,
}: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalRecords: number;
    startRecord: number;
    endRecord: number;
}) {
    const { t } = useTranslation();
    return (
        <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
                {t("customers.pagination.showing", { start: startRecord, end: endRecord, total: totalRecords })}
            </span>
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                >
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 py-1 bg-gray-100 rounded text-sm font-medium">
                    {currentPage} / {totalPages}
                </span>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                >
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

export default function TicketsPage() {
    const { customer, loading: customerLoading, customerId } = useCustomer();
    const { tickets, loading: ticketsLoading, ticketStats } = useTickets({ customerId: customerId || undefined });
    const { t } = useTranslation();
    const tableRef = useRef<HTMLDivElement>(null);

    // UI State
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage, setRecordsPerPage] = useState(25);
    const [columnVisibility, setColumnVisibility] = useState<Record<ColumnKey, boolean>>({
        id: true,
        subject: true,
        department: true,
        priority: true,
        lastReply: true,
        status: true,
    });
    const [sortKey, setSortKey] = useState<ColumnKey | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [rowDensity, setRowDensity] = useState<RowDensity>("comfortable");
    const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);

    // Helpers
    const formatDate = (timestamp: any) => {
        if (!timestamp) return "-";
        try {
            const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
            return format(date, "dd/MM/yyyy HH:mm");
        } catch {
            return "-";
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            open: "bg-blue-50 text-blue-600 border-blue-100",
            in_progress: "bg-orange-50 text-orange-600 border-orange-100",
            answered: "bg-green-50 text-green-600 border-green-100",
            on_hold: "bg-yellow-50 text-yellow-600 border-yellow-100",
            closed: "bg-gray-50 text-gray-500 border-gray-100",
        };
        return styles[status] || "bg-gray-50 text-gray-600 border-gray-100";
    };

    const getPriorityBadge = (priority: string) => {
        const styles: Record<string, string> = {
            low: "bg-gray-50 text-gray-600 border-gray-100",
            medium: "bg-blue-50 text-blue-600 border-blue-100",
            high: "bg-orange-50 text-orange-600 border-orange-100",
            urgent: "bg-red-50 text-red-600 border-red-100",
        };
        return styles[priority] || "bg-gray-50 text-gray-600 border-gray-100";
    };

    const formatStatus = (status: string) => status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

    // Sort handler
    const handleSort = (key: ColumnKey) => {
        if (sortKey === key) {
            setSortDirection((prev) => (prev === "asc" ? "desc" : prev === "desc" ? null : "asc"));
            if (sortDirection === "desc") setSortKey(null);
        } else {
            setSortKey(key);
            setSortDirection("asc");
        }
    };

    // Toggle column
    const toggleColumn = (key: ColumnKey) => setColumnVisibility((prev) => ({ ...prev, [key]: !prev[key] }));

    // Process tickets
    const processedTickets = useMemo(() => {
        let result = [...tickets];
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(
                (t) =>
                    t.subject.toLowerCase().includes(lowerQuery) ||
                    t.status.toLowerCase().includes(lowerQuery) ||
                    (t.departmentId || "").toLowerCase().includes(lowerQuery) ||
                    t.priority.toLowerCase().includes(lowerQuery)
            );
        }
        if (sortKey && sortDirection) {
            result.sort((a, b) => {
                let aVal: any, bVal: any;
                switch (sortKey) {
                    case "id":
                        aVal = a.id || "";
                        bVal = b.id || "";
                        break;
                    case "subject":
                        aVal = a.subject || "";
                        bVal = b.subject || "";
                        break;
                    case "department":
                        aVal = a.departmentId || "";
                        bVal = b.departmentId || "";
                        break;
                    case "priority":
                        aVal = a.priority || "";
                        bVal = b.priority || "";
                        break;
                    case "lastReply":
                        aVal = a.lastReply?.toMillis?.() || 0;
                        bVal = b.lastReply?.toMillis?.() || 0;
                        break;
                    case "status":
                        aVal = a.status || "";
                        bVal = b.status || "";
                        break;
                    default:
                        return 0;
                }
                if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
                if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [tickets, searchQuery, sortKey, sortDirection]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(processedTickets.length / recordsPerPage));
    const startIndex = (currentPage - 1) * recordsPerPage;
    const paginatedTickets = processedTickets.slice(startIndex, startIndex + recordsPerPage);
    const startRecord = processedTickets.length === 0 ? 0 : startIndex + 1;
    const endRecord = Math.min(startIndex + recordsPerPage, processedTickets.length);

    // Selection handlers
    const handleSelectAll = () => setSelectedIds(processedTickets.map((t) => t.id));
    const handleClearSelection = () => setSelectedIds([]);
    const handleSelectPage = () => setSelectedIds(paginatedTickets.map((t) => t.id));
    const toggleSelect = (id: string) =>
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    const isAllSelected = paginatedTickets.length > 0 && paginatedTickets.every((t) => selectedIds.includes(t.id));
    const isSomeSelected = paginatedTickets.some((t) => selectedIds.includes(t.id)) && !isAllSelected;

    // Export
    const handleExport = () => {
        const dataToExport =
            selectedIds.length > 0 ? tickets.filter((t) => selectedIds.includes(t.id)) : processedTickets;
        const csv = [
            "ID,Subject,Department,Priority,Last Reply,Status",
            ...dataToExport.map(
                (t) =>
                    `"${t.id}","${t.subject}","${t.departmentId || "-"}","${t.priority}","${formatDate(t.lastReply)}","${t.status}"`
            ),
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "tickets-export.csv";
        a.click();
        URL.revokeObjectURL(url);
        toast.success(t("customers.toast.exported"));
    };

    const columnLabel = (key: ColumnKey) => t(`customers.tickets.columns.${key}`);

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLDivElement>) => {
            if (focusedRowIndex === null || paginatedTickets.length === 0) return;
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setFocusedRowIndex(Math.min(focusedRowIndex + 1, paginatedTickets.length - 1));
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setFocusedRowIndex(Math.max(focusedRowIndex - 1, 0));
                    break;
                case " ":
                    e.preventDefault();
                    toggleSelect(paginatedTickets[focusedRowIndex].id);
                    break;
            }
        },
        [focusedRowIndex, paginatedTickets]
    );

    const visibleColumns = DEFAULT_COLUMNS.filter((c) => columnVisibility[c.key]);

    if (customerLoading || ticketsLoading) {
        return (
            <div className="p-8 flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                {t("customers.tickets.loading")}
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="space-y-4" onKeyDown={handleKeyDown} tabIndex={0} ref={tableRef}>
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">{t("customers.tickets.title")}</h1>
                    <Link href={`/dashboard/support/new?customerId=${customerId}`}>
                        <Button className="bg-gray-900 text-white hover:bg-gray-800">
                            <Plus className="mr-2 h-4 w-4" />
                            {t("customers.tickets.new")}
                        </Button>
                    </Link>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2 text-blue-600 mb-1">
                            <Ticket className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase">{t("customers.stats.total")}</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-900">{ticketStats.total}</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2 text-orange-600 mb-1">
                            <MessageCircle className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase">{t("customers.tickets.open")}</span>
                        </div>
                        <div className="text-2xl font-bold text-orange-900">{ticketStats["open"] || 0}</div>
                    </div>
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase">{t("customers.tickets.closed")}</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{ticketStats["closed"] || 0}</div>
                    </div>
                </div>

                {/* Compact Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Actions Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <MoreVertical className="h-4 w-4 mr-1" />
                                {t("common.actions")}
                                <ChevronDown className="ml-1 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={handleExport}>
                                <Download className="h-4 w-4 mr-2" />
                                {t("common.export")}{" "}
                                {selectedIds.length > 0 ? `(${selectedIds.length})` : t("common.all")}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Display Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <LayoutList className="h-4 w-4 mr-1" />
                                {t("customers.toolbar.display")}
                                <ChevronDown className="ml-1 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48">
                            <DropdownMenuLabel>{t("customers.toolbar.rowDensity")}</DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                                value={rowDensity}
                                onValueChange={(v) => setRowDensity(v as RowDensity)}
                            >
                                <DropdownMenuRadioItem value="compact">
                                    {t("customers.toolbar.compact")}
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="comfortable">
                                    {t("customers.toolbar.comfortable")}
                                </DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>{t("customers.toolbar.columns")}</DropdownMenuLabel>
                            {DEFAULT_COLUMNS.map((col) => (
                                <DropdownMenuCheckboxItem
                                    key={col.key}
                                    checked={columnVisibility[col.key]}
                                    onCheckedChange={() => toggleColumn(col.key)}
                                >
                                    {columnLabel(col.key)}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Reset */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                    setSearchQuery("");
                                    setSortKey(null);
                                    setSortDirection(null);
                                    setSelectedIds([]);
                                }}
                            >
                                <RotateCcw className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t("customers.toolbar.resetFilters")}</TooltipContent>
                    </Tooltip>

                    <div className="flex-1" />

                    {/* Records Per Page */}
                    <Select
                        value={String(recordsPerPage)}
                        onValueChange={(v) => {
                            setRecordsPerPage(Number(v));
                            setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[70px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Search */}
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder={t("common.search")}
                            className="pl-9"
                            autoComplete="new-password"
                            name="tickets-search-nofill"
                            data-lpignore="true"
                            data-1p-ignore="true"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Top Pagination */}
                {processedTickets.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalRecords={processedTickets.length}
                        startRecord={startRecord}
                        endRecord={endRecord}
                    />
                )}

                {/* Selection Banner */}
                {selectedIds.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center justify-between">
                        <span className="text-blue-800 text-sm font-medium">
                            {t("customers.tickets.selected", { count: selectedIds.length })}
                        </span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleSelectAll}>
                                {t("customers.selection.selectAll", { count: processedTickets.length })}
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleClearSelection}>
                                {t("customers.selection.clear")}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/80">
                                <TableHead className="w-12 bg-gray-100/50">
                                    <Checkbox
                                        checked={isAllSelected}
                                        ref={(el) => {
                                            if (el) (el as any).indeterminate = isSomeSelected;
                                        }}
                                        onCheckedChange={(checked) => {
                                            if (checked) handleSelectPage();
                                            else handleClearSelection();
                                        }}
                                    />
                                </TableHead>
                                {visibleColumns.map((col) => (
                                    <TableHead
                                        key={col.key}
                                        className="font-semibold text-gray-900 bg-gray-100/50"
                                        style={{ minWidth: col.width }}
                                    >
                                        {col.sortable ? (
                                            <Button
                                                variant="ghost"
                                                className="h-8 px-2 -ml-2 font-semibold hover:bg-gray-200"
                                                onClick={() => handleSort(col.key)}
                                            >
                                                {columnLabel(col.key)}
                                                {sortKey === col.key ? (
                                                    sortDirection === "asc" ? (
                                                        <ArrowUp className="ml-1 h-4 w-4" />
                                                    ) : (
                                                        <ArrowDown className="ml-1 h-4 w-4" />
                                                    )
                                                ) : (
                                                    <ArrowUpDown className="ml-1 h-4 w-4 opacity-40" />
                                                )}
                                            </Button>
                                        ) : (
                                            columnLabel(col.key)
                                        )}
                                    </TableHead>
                                ))}
                                <TableHead className="w-20 font-semibold text-gray-900 bg-gray-100/50">
                                    {t("common.actions")}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedTickets.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={visibleColumns.length + 2}
                                        className="text-center py-8 text-gray-500"
                                    >
                                        {searchQuery
                                            ? t("customers.tickets.emptySearch")
                                            : t("customers.tickets.empty", {
                                                  customer: customer?.company || t("customers.thisCustomer"),
                                              })}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedTickets.map((ticket, index) => (
                                    <TableRow
                                        key={ticket.id}
                                        className={`group hover:bg-gray-50 ${focusedRowIndex === index ? "bg-blue-50" : ""} ${selectedIds.includes(ticket.id) ? "bg-blue-50/50" : ""}`}
                                        onClick={() => setFocusedRowIndex(index)}
                                    >
                                        <TableCell className={ROW_DENSITY_STYLES[rowDensity]}>
                                            <Checkbox
                                                checked={selectedIds.includes(ticket.id)}
                                                onCheckedChange={() => toggleSelect(ticket.id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </TableCell>
                                        {visibleColumns.map((col) => (
                                            <TableCell key={col.key} className={ROW_DENSITY_STYLES[rowDensity]}>
                                                {col.key === "id" && (
                                                    <span className="text-gray-500">
                                                        #{ticket.id.slice(-6).toUpperCase()}
                                                    </span>
                                                )}
                                                {col.key === "subject" && (
                                                    <span className="font-medium text-blue-600">
                                                        <HighlightText text={ticket.subject} search={searchQuery} />
                                                    </span>
                                                )}
                                                {col.key === "department" && (
                                                    <span className="text-gray-600">{ticket.departmentId || "-"}</span>
                                                )}
                                                {col.key === "priority" && (
                                                    <Badge
                                                        className={`${getPriorityBadge(ticket.priority)} font-normal`}
                                                    >
                                                        <HighlightText
                                                            text={formatStatus(ticket.priority)}
                                                            search={searchQuery}
                                                        />
                                                    </Badge>
                                                )}
                                                {col.key === "lastReply" && <span>{formatDate(ticket.lastReply)}</span>}
                                                {col.key === "status" && (
                                                    <Badge className={`${getStatusBadge(ticket.status)} font-normal`}>
                                                        <HighlightText
                                                            text={formatStatus(ticket.status)}
                                                            search={searchQuery}
                                                        />
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        ))}
                                        <TableCell className={`${ROW_DENSITY_STYLES[rowDensity]} overflow-visible`}>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Link href={`/dashboard/support/${ticket.id}`}>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                                                <Eye className="h-4 w-4 text-gray-500" />
                                                            </Button>
                                                        </Link>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{t("common.view")}</TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Bottom Pagination */}
                {processedTickets.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalRecords={processedTickets.length}
                        startRecord={startRecord}
                        endRecord={endRecord}
                    />
                )}
            </div>
        </TooltipProvider>
    );
}
