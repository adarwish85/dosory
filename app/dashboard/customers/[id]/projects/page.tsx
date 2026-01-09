"use client";

import { useState, useMemo, useCallback, useRef, KeyboardEvent } from "react";
import { useCustomer } from "@/components/dashboard/customers/customer-context";
import { useProjects } from "@/lib/hooks/use-projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
    FolderKanban,
    PlayCircle,
    CheckCircle2,
    RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";

// Types
type SortDirection = "asc" | "desc" | null;
type RowDensity = "compact" | "comfortable";
type ColumnKey = "name" | "progress" | "startDate" | "deadline" | "status";

interface ColumnDef {
    key: ColumnKey;
    label: string;
    defaultVisible: boolean;
    sortable?: boolean;
    width?: number;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
    { key: "name", label: "Name", defaultVisible: true, sortable: true, width: 200 },
    { key: "progress", label: "Progress", defaultVisible: true, sortable: true, width: 150 },
    { key: "startDate", label: "Start Date", defaultVisible: true, sortable: true, width: 120 },
    { key: "deadline", label: "Deadline", defaultVisible: true, sortable: true, width: 120 },
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

export default function ProjectsPage() {
    const { customer, loading: customerLoading, customerId } = useCustomer();
    const { projects, loading: projectsLoading, projectStats } = useProjects({ customerId: customerId || undefined });
    const tableRef = useRef<HTMLDivElement>(null);

    // UI State
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage, setRecordsPerPage] = useState(25);
    const [columnVisibility, setColumnVisibility] = useState<Record<ColumnKey, boolean>>({
        name: true,
        progress: true,
        startDate: true,
        deadline: true,
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
            return format(date, "dd/MM/yyyy");
        } catch {
            return "-";
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            to_do: "bg-gray-50 text-gray-600 border-gray-100",
            in_progress: "bg-blue-50 text-blue-600 border-blue-100",
            on_hold: "bg-orange-50 text-orange-600 border-orange-100",
            cancelled: "bg-red-50 text-red-600 border-red-100",
            finished: "bg-green-50 text-green-600 border-green-100",
        };
        return styles[status] || "bg-gray-50 text-gray-600 border-gray-100";
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

    // Process projects
    const processedProjects = useMemo(() => {
        let result = [...projects];
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(
                (p) => p.name.toLowerCase().includes(lowerQuery) || p.status.toLowerCase().includes(lowerQuery)
            );
        }
        if (sortKey && sortDirection) {
            result.sort((a, b) => {
                let aVal: any, bVal: any;
                switch (sortKey) {
                    case "name":
                        aVal = a.name || "";
                        bVal = b.name || "";
                        break;
                    case "progress":
                        aVal = a.progress || 0;
                        bVal = b.progress || 0;
                        break;
                    case "startDate":
                        aVal = a.startDate?.toMillis?.() || 0;
                        bVal = b.startDate?.toMillis?.() || 0;
                        break;
                    case "deadline":
                        aVal = a.deadline?.toMillis?.() || 0;
                        bVal = b.deadline?.toMillis?.() || 0;
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
    }, [projects, searchQuery, sortKey, sortDirection]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(processedProjects.length / recordsPerPage));
    const startIndex = (currentPage - 1) * recordsPerPage;
    const paginatedProjects = processedProjects.slice(startIndex, startIndex + recordsPerPage);
    const startRecord = processedProjects.length === 0 ? 0 : startIndex + 1;
    const endRecord = Math.min(startIndex + recordsPerPage, processedProjects.length);

    // Selection handlers
    const handleSelectAll = () => setSelectedIds(processedProjects.map((p) => p.id));
    const handleClearSelection = () => setSelectedIds([]);
    const handleSelectPage = () => setSelectedIds(paginatedProjects.map((p) => p.id));
    const toggleSelect = (id: string) =>
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    const isAllSelected = paginatedProjects.length > 0 && paginatedProjects.every((p) => selectedIds.includes(p.id));
    const isSomeSelected = paginatedProjects.some((p) => selectedIds.includes(p.id)) && !isAllSelected;

    // Export
    const handleExport = () => {
        const dataToExport =
            selectedIds.length > 0 ? projects.filter((p) => selectedIds.includes(p.id)) : processedProjects;
        const csv = [
            "Name,Progress,Start Date,Deadline,Status",
            ...dataToExport.map(
                (p) =>
                    `"${p.name}","${p.progress || 0}%","${formatDate(p.startDate)}","${formatDate(p.deadline)}","${p.status}"`
            ),
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "projects-export.csv";
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Exported successfully");
    };

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLDivElement>) => {
            if (focusedRowIndex === null || paginatedProjects.length === 0) return;
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setFocusedRowIndex(Math.min(focusedRowIndex + 1, paginatedProjects.length - 1));
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setFocusedRowIndex(Math.max(focusedRowIndex - 1, 0));
                    break;
                case " ":
                    e.preventDefault();
                    toggleSelect(paginatedProjects[focusedRowIndex].id);
                    break;
            }
        },
        [focusedRowIndex, paginatedProjects]
    );

    const visibleColumns = DEFAULT_COLUMNS.filter((c) => columnVisibility[c.key]);

    if (customerLoading || projectsLoading) {
        return (
            <div className="p-8 flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading projects...
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="space-y-4" onKeyDown={handleKeyDown} tabIndex={0} ref={tableRef}>
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Projects</h1>
                    <Link href={`/dashboard/projects/new?customerId=${customerId}`}>
                        <Button className="bg-gray-900 text-white hover:bg-gray-800">
                            <Plus className="mr-2 h-4 w-4" />
                            New Project
                        </Button>
                    </Link>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2 text-blue-600 mb-1">
                            <FolderKanban className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase">Total</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-900">{projectStats.total}</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2 text-orange-600 mb-1">
                            <PlayCircle className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase">In Progress</span>
                        </div>
                        <div className="text-2xl font-bold text-orange-900">{projectStats["in_progress"] || 0}</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2 text-green-600 mb-1">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase">Completed</span>
                        </div>
                        <div className="text-2xl font-bold text-green-900">{projectStats["completed"] || 0}</div>
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

                    {/* Refresh */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" onClick={() => window.location.reload()}>
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Refresh</TooltipContent>
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
                            placeholder="Search..."
                            className="pl-9"
                            autoComplete="new-password"
                            name="projects-search-nofill"
                            data-lpignore="true"
                            data-1p-ignore="true"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Top Pagination */}
                {processedProjects.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalRecords={processedProjects.length}
                        startRecord={startRecord}
                        endRecord={endRecord}
                    />
                )}

                {/* Selection Banner */}
                {selectedIds.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center justify-between">
                        <span className="text-blue-800 text-sm font-medium">
                            {selectedIds.length} project{selectedIds.length > 1 ? "s" : ""} selected
                        </span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleSelectAll}>
                                Select All ({processedProjects.length})
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
                            {paginatedProjects.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={visibleColumns.length + 2}
                                        className="text-center py-8 text-gray-500"
                                    >
                                        {searchQuery
                                            ? "No projects match your search."
                                            : `No projects found for ${customer?.company || "this customer"}.`}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedProjects.map((project, index) => (
                                    <TableRow
                                        key={project.id}
                                        className={`group hover:bg-gray-50 ${focusedRowIndex === index ? "bg-blue-50" : ""} ${selectedIds.includes(project.id) ? "bg-blue-50/50" : ""}`}
                                        onClick={() => setFocusedRowIndex(index)}
                                    >
                                        <TableCell className={ROW_DENSITY_STYLES[rowDensity]}>
                                            <Checkbox
                                                checked={selectedIds.includes(project.id)}
                                                onCheckedChange={() => toggleSelect(project.id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </TableCell>
                                        {visibleColumns.map((col) => (
                                            <TableCell key={col.key} className={ROW_DENSITY_STYLES[rowDensity]}>
                                                {col.key === "name" && (
                                                    <span className="font-medium text-blue-600">
                                                        <HighlightText text={project.name} search={searchQuery} />
                                                    </span>
                                                )}
                                                {col.key === "progress" && (
                                                    <div className="flex items-center gap-2">
                                                        <Progress value={project.progress || 0} className="h-2 w-20" />
                                                        <span className="text-xs text-gray-500">
                                                            {project.progress || 0}%
                                                        </span>
                                                    </div>
                                                )}
                                                {col.key === "startDate" && (
                                                    <span>{formatDate(project.startDate)}</span>
                                                )}
                                                {col.key === "deadline" && <span>{formatDate(project.deadline)}</span>}
                                                {col.key === "status" && (
                                                    <Badge className={`${getStatusBadge(project.status)} font-normal`}>
                                                        <HighlightText
                                                            text={formatStatus(project.status)}
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
                                                        <Link href={`/dashboard/projects/${project.id}`}>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                                                <Eye className="h-4 w-4 text-gray-500" />
                                                            </Button>
                                                        </Link>
                                                    </TooltipTrigger>
                                                    <TooltipContent>View</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Link href={`/dashboard/projects/${project.id}/edit`}>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                                                <Pencil className="h-4 w-4 text-gray-500" />
                                                            </Button>
                                                        </Link>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Edit</TooltipContent>
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
                {processedProjects.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalRecords={processedProjects.length}
                        startRecord={startRecord}
                        endRecord={endRecord}
                    />
                )}
            </div>
        </TooltipProvider>
    );
}
