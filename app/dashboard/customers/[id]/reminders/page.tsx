"use client";

import { useState, useMemo, useCallback, useRef, KeyboardEvent } from "react";
import { useCustomer } from "@/components/dashboard/customers/customer-context";
import { useReminders } from "@/lib/hooks/use-customer-data";
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
    Bell,
    BellOff,
    Trash2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Sparkles,
    Clock,
    CalendarClock,
    AlertTriangle,
    RefreshCw,
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { toast } from "sonner";

// Types
type SortDirection = "asc" | "desc" | null;
type RowDensity = "compact" | "comfortable";
type ColumnKey = "title" | "description" | "date" | "status";

interface ColumnDef {
    key: ColumnKey;
    label: string;
    defaultVisible: boolean;
    sortable?: boolean;
    width?: number;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
    { key: "status", label: "Status", defaultVisible: true, sortable: true, width: 100 },
    { key: "title", label: "Title", defaultVisible: true, sortable: true, width: 200 },
    { key: "description", label: "Description", defaultVisible: true, sortable: true, width: 300 },
    { key: "date", label: "Date", defaultVisible: true, sortable: true, width: 140 },
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
    return (
        <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
                Showing {startRecord} to {endRecord} of {totalRecords}
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

export default function RemindersPage() {
    const { customer, loading: customerLoading, customerId } = useCustomer();
    const {
        reminders,
        loading: remindersLoading,
        deleteReminder,
    } = useReminders({ customerId: customerId || undefined });
    const tableRef = useRef<HTMLDivElement>(null);

    // UI State
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage, setRecordsPerPage] = useState(25);
    const [columnVisibility, setColumnVisibility] = useState<Record<ColumnKey, boolean>>({
        status: true,
        title: true,
        description: true,
        date: true,
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

    const getDateStatus = (timestamp: any) => {
        if (!timestamp) return "upcoming";
        try {
            const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
            if (isPast(date) && !isToday(date)) return "overdue";
            if (isToday(date)) return "today";
            return "upcoming";
        } catch {
            return "upcoming";
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            overdue: "bg-red-50 text-red-600 border-red-100",
            today: "bg-orange-50 text-orange-600 border-orange-100",
            upcoming: "bg-blue-50 text-blue-600 border-blue-100",
        };
        return styles[status] || "bg-gray-50 text-gray-600 border-gray-100";
    };

    const formatStatus = (status: string) => status.charAt(0).toUpperCase() + status.slice(1);

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

    // Process reminders
    const processedReminders = useMemo(() => {
        let result = [...reminders];
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(
                (r) =>
                    r.title.toLowerCase().includes(lowerQuery) ||
                    (r.description || "").toLowerCase().includes(lowerQuery)
            );
        }
        if (sortKey && sortDirection) {
            result.sort((a, b) => {
                let aVal: any, bVal: any;
                switch (sortKey) {
                    case "title":
                        aVal = a.title || "";
                        bVal = b.title || "";
                        break;
                    case "description":
                        aVal = a.description || "";
                        bVal = b.description || "";
                        break;
                    case "date":
                        aVal = a.date?.toMillis?.() || 0;
                        bVal = b.date?.toMillis?.() || 0;
                        break;
                    case "status":
                        aVal = getDateStatus(a.date);
                        bVal = getDateStatus(b.date);
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
    }, [reminders, searchQuery, sortKey, sortDirection]);

    // Stats
    const stats = useMemo(() => {
        const total = reminders.length;
        const overdue = reminders.filter((r) => getDateStatus(r.date) === "overdue").length;
        const upcoming = reminders.filter((r) => getDateStatus(r.date) === "upcoming").length;
        const today = reminders.filter((r) => getDateStatus(r.date) === "today").length;
        return { total, overdue, upcoming, today };
    }, [reminders]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(processedReminders.length / recordsPerPage));
    const startIndex = (currentPage - 1) * recordsPerPage;
    const paginatedReminders = processedReminders.slice(startIndex, startIndex + recordsPerPage);
    const startRecord = processedReminders.length === 0 ? 0 : startIndex + 1;
    const endRecord = Math.min(startIndex + recordsPerPage, processedReminders.length);

    // Selection handlers
    const handleSelectAll = () => setSelectedIds(processedReminders.map((r) => r.id));
    const handleClearSelection = () => setSelectedIds([]);
    const handleSelectPage = () => setSelectedIds(paginatedReminders.map((r) => r.id));
    const toggleSelect = (id: string) =>
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    const isAllSelected = paginatedReminders.length > 0 && paginatedReminders.every((r) => selectedIds.includes(r.id));
    const isSomeSelected = paginatedReminders.some((r) => selectedIds.includes(r.id)) && !isAllSelected;

    // Export
    const handleExport = () => {
        const dataToExport =
            selectedIds.length > 0 ? reminders.filter((r) => selectedIds.includes(r.id)) : processedReminders;
        const csv = [
            "Title,Description,Date,Status,Is Notified",
            ...dataToExport.map(
                (r) =>
                    `"${r.title}","${r.description || ""}","${formatDate(r.date)}","${formatStatus(getDateStatus(r.date))}","${r.isNotified}"`
            ),
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "reminders-export.csv";
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Exported successfully");
    };

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLDivElement>) => {
            if (focusedRowIndex === null || paginatedReminders.length === 0) return;
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setFocusedRowIndex(Math.min(focusedRowIndex + 1, paginatedReminders.length - 1));
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setFocusedRowIndex(Math.max(focusedRowIndex - 1, 0));
                    break;
                case " ":
                    e.preventDefault();
                    toggleSelect(paginatedReminders[focusedRowIndex].id);
                    break;
            }
        },
        [focusedRowIndex, paginatedReminders]
    );

    const visibleColumns = DEFAULT_COLUMNS.filter((c) => columnVisibility[c.key]);

    if (customerLoading || remindersLoading) {
        return (
            <div className="p-8 flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading reminders...
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="space-y-4" onKeyDown={handleKeyDown} tabIndex={0} ref={tableRef}>
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Reminders</h1>
                    <Button className="bg-gray-900 text-white hover:bg-gray-800">
                        <Plus className="mr-2 h-4 w-4" />
                        Set Reminder
                    </Button>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2 text-blue-600 mb-1">
                            <Sparkles className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase">Total</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2 text-orange-600 mb-1">
                            <Clock className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase">Today</span>
                        </div>
                        <div className="text-2xl font-bold text-orange-900">{stats.today}</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2 text-purple-600 mb-1">
                            <CalendarClock className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase">Upcoming</span>
                        </div>
                        <div className="text-2xl font-bold text-purple-900">{stats.upcoming}</div>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2 text-red-600 mb-1">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase">Overdue</span>
                        </div>
                        <div className="text-2xl font-bold text-red-900">{stats.overdue}</div>
                    </div>
                </div>

                {/* Compact Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Actions Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <MoreVertical className="h-4 w-4 mr-1" />
                                Actions
                                <ChevronDown className="ml-1 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={handleExport}>
                                <Download className="h-4 w-4 mr-2" />
                                Export {selectedIds.length > 0 ? `(${selectedIds.length})` : "All"}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Display Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <LayoutList className="h-4 w-4 mr-1" />
                                Display
                                <ChevronDown className="ml-1 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48">
                            <DropdownMenuLabel>Row Density</DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                                value={rowDensity}
                                onValueChange={(v) => setRowDensity(v as RowDensity)}
                            >
                                <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Columns</DropdownMenuLabel>
                            {DEFAULT_COLUMNS.map((col) => (
                                <DropdownMenuCheckboxItem
                                    key={col.key}
                                    checked={columnVisibility[col.key]}
                                    onCheckedChange={() => toggleColumn(col.key)}
                                >
                                    {col.label}
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
                        <TooltipContent>Reset filters</TooltipContent>
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
                            placeholder="Search reminders..."
                            className="pl-9"
                            autoComplete="new-password"
                            name="reminders-search-nofill"
                            data-lpignore="true"
                            data-1p-ignore="true"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Top Pagination */}
                {processedReminders.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalRecords={processedReminders.length}
                        startRecord={startRecord}
                        endRecord={endRecord}
                    />
                )}

                {/* Selection Banner */}
                {selectedIds.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center justify-between">
                        <span className="text-blue-800 text-sm font-medium">
                            {selectedIds.length} reminder{selectedIds.length > 1 ? "s" : ""} selected
                        </span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleSelectAll}>
                                Select All ({processedReminders.length})
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleClearSelection}>
                                Clear
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
                                                {col.label}
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
                                            col.label
                                        )}
                                    </TableHead>
                                ))}
                                <TableHead className="w-20 font-semibold text-gray-900 bg-gray-100/50">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedReminders.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={visibleColumns.length + 2}
                                        className="text-center py-8 text-gray-500"
                                    >
                                        {searchQuery
                                            ? "No reminders match your search."
                                            : `No reminders found for ${customer?.company || "this customer"}.`}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedReminders.map((reminder, index) => {
                                    const dateStatus = getDateStatus(reminder.date);
                                    return (
                                        <TableRow
                                            key={reminder.id}
                                            className={`group hover:bg-gray-50 ${focusedRowIndex === index ? "bg-blue-50" : ""} ${selectedIds.includes(reminder.id) ? "bg-blue-50/50" : ""}`}
                                            onClick={() => setFocusedRowIndex(index)}
                                        >
                                            <TableCell className={ROW_DENSITY_STYLES[rowDensity]}>
                                                <Checkbox
                                                    checked={selectedIds.includes(reminder.id)}
                                                    onCheckedChange={() => toggleSelect(reminder.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </TableCell>
                                            {visibleColumns.map((col) => (
                                                <TableCell key={col.key} className={ROW_DENSITY_STYLES[rowDensity]}>
                                                    {col.key === "status" && (
                                                        <Badge className={`${getStatusBadge(dateStatus)} font-normal`}>
                                                            <HighlightText
                                                                text={formatStatus(dateStatus)}
                                                                search={searchQuery}
                                                            />
                                                        </Badge>
                                                    )}
                                                    {col.key === "title" && (
                                                        <div className="flex items-center gap-2">
                                                            {reminder.isNotified ? (
                                                                <BellOff className="h-3 w-3 text-gray-400" />
                                                            ) : (
                                                                <Bell className="h-3 w-3 text-blue-500" />
                                                            )}
                                                            <span className="font-medium text-gray-900">
                                                                <HighlightText
                                                                    text={reminder.title}
                                                                    search={searchQuery}
                                                                />
                                                            </span>
                                                        </div>
                                                    )}
                                                    {col.key === "description" && (
                                                        <span className="text-gray-500 truncate max-w-xs block">
                                                            <HighlightText
                                                                text={reminder.description || "-"}
                                                                search={searchQuery}
                                                            />
                                                        </span>
                                                    )}
                                                    {col.key === "date" && <span>{formatDate(reminder.date)}</span>}
                                                </TableCell>
                                            ))}
                                            <TableCell className={`${ROW_DENSITY_STYLES[rowDensity]} overflow-visible`}>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7"
                                                                onClick={() => deleteReminder(reminder.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4 text-red-500" />
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

                {/* Bottom Pagination */}
                {processedReminders.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalRecords={processedReminders.length}
                        startRecord={startRecord}
                        endRecord={endRecord}
                    />
                )}
            </div>
        </TooltipProvider>
    );
}
