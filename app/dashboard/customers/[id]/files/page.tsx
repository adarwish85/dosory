"use client";

import { useState, useMemo, useCallback, useRef, KeyboardEvent } from "react";
import { useCustomer } from "@/components/dashboard/customers/customer-context";
import { useCustomerFiles } from "@/lib/hooks/use-customer-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
    Upload,
    MoreVertical,
    ChevronDown,
    LayoutList,
    Download,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    RotateCcw,
    Loader2,
    FileText,
    FileImage,
    FileVideo,
    File,
    Trash2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Files,
    HardDrive,
    RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

// Types
type SortDirection = "asc" | "desc" | null;
type RowDensity = "compact" | "comfortable";
type ColumnKey = "name" | "size" | "type" | "createdAt";

interface ColumnDef {
    key: ColumnKey;
    label: string;
    defaultVisible: boolean;
    sortable?: boolean;
    width?: number;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
    { key: "name", label: "Name", defaultVisible: true, sortable: true, width: 250 },
    { key: "size", label: "Size", defaultVisible: true, sortable: true, width: 100 },
    { key: "type", label: "Type", defaultVisible: true, sortable: true, width: 100 },
    { key: "createdAt", label: "Uploaded", defaultVisible: true, sortable: true, width: 140 },
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
                {t("customers.files.pagination.showing", {
                    start: startRecord,
                    end: endRecord,
                    total: totalRecords,
                })}
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

import { UploadFileDialog } from "@/components/dashboard/customers/files/upload-file-dialog";

// ... existing imports

export default function FilesPage() {
    const { customer, loading: customerLoading, customerId } = useCustomer();
    const { files, loading: filesLoading, deleteFile } = useCustomerFiles({ customerId: customerId || undefined });
    const tableRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();

    // Translated label per column key
    const columnLabel = (key: ColumnKey) => t(`customers.files.col.${key}`);

    // UI State
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage, setRecordsPerPage] = useState(25);
    const [columnVisibility, setColumnVisibility] = useState<Record<ColumnKey, boolean>>({
        name: true,
        size: true,
        type: true,
        createdAt: true,
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

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith("image/")) return <FileImage className="h-4 w-4 text-blue-500" />;
        if (type.startsWith("video/")) return <FileVideo className="h-4 w-4 text-purple-500" />;
        if (type.includes("pdf")) return <FileText className="h-4 w-4 text-red-500" />;
        return <File className="h-4 w-4 text-gray-500" />;
    };

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

    // Process files
    const processedFiles = useMemo(() => {
        let result = [...files];
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(
                (f) => f.name.toLowerCase().includes(lowerQuery) || f.type.toLowerCase().includes(lowerQuery)
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
                    case "size":
                        aVal = a.size || 0;
                        bVal = b.size || 0;
                        break;
                    case "type":
                        aVal = a.type || "";
                        bVal = b.type || "";
                        break;
                    case "createdAt":
                        aVal = a.createdAt?.toMillis?.() || 0;
                        bVal = b.createdAt?.toMillis?.() || 0;
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
    }, [files, searchQuery, sortKey, sortDirection]);

    // Stats
    const stats = useMemo(() => {
        const totalFiles = files.length;
        const totalSize = files.reduce((acc, curr) => acc + curr.size, 0);
        return { totalFiles, totalSize };
    }, [files]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(processedFiles.length / recordsPerPage));
    const startIndex = (currentPage - 1) * recordsPerPage;
    const paginatedFiles = processedFiles.slice(startIndex, startIndex + recordsPerPage);
    const startRecord = processedFiles.length === 0 ? 0 : startIndex + 1;
    const endRecord = Math.min(startIndex + recordsPerPage, processedFiles.length);

    // Selection handlers
    const handleSelectAll = () => setSelectedIds(processedFiles.map((f) => f.id));
    const handleClearSelection = () => setSelectedIds([]);
    const handleSelectPage = () => setSelectedIds(paginatedFiles.map((f) => f.id));
    const toggleSelect = (id: string) =>
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    const isAllSelected = paginatedFiles.length > 0 && paginatedFiles.every((f) => selectedIds.includes(f.id));
    const isSomeSelected = paginatedFiles.some((f) => selectedIds.includes(f.id)) && !isAllSelected;

    // Export
    const handleExport = () => {
        const dataToExport = selectedIds.length > 0 ? files.filter((f) => selectedIds.includes(f.id)) : processedFiles;
        const csv = [
            "Name,Size,Type,Uploaded At,URL",
            ...dataToExport.map((f) => `"${f.name}","${f.size}","${f.type}","${formatDate(f.createdAt)}","${f.url}"`),
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "files-export.csv";
        a.click();
        URL.revokeObjectURL(url);
        toast.success(t("customers.files.exportSuccess"));
    };

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLDivElement>) => {
            if (focusedRowIndex === null || paginatedFiles.length === 0) return;
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setFocusedRowIndex(Math.min(focusedRowIndex + 1, paginatedFiles.length - 1));
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setFocusedRowIndex(Math.max(focusedRowIndex - 1, 0));
                    break;
                case " ":
                    e.preventDefault();
                    toggleSelect(paginatedFiles[focusedRowIndex].id);
                    break;
            }
        },
        [focusedRowIndex, paginatedFiles]
    );

    const visibleColumns = DEFAULT_COLUMNS.filter((c) => columnVisibility[c.key]);

    if (customerLoading || filesLoading) {
        return (
            <div className="p-8 flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                {t("customers.files.loading")}
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="space-y-4" onKeyDown={handleKeyDown} tabIndex={0} ref={tableRef}>
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">{t("customers.files.title")}</h1>
                    <Button className="bg-gray-900 text-white hover:bg-gray-800" onClick={() => setShowUploadDialog(true)}>
                        <Upload className="mr-2 h-4 w-4" />
                        {t("customers.files.upload")}
                    </Button>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2 text-blue-600 mb-1">
                            <Files className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase">{t("customers.files.stats.totalFiles")}</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-900">{stats.totalFiles}</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2 text-purple-600 mb-1">
                            <HardDrive className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase">{t("customers.files.stats.totalSize")}</span>
                        </div>
                        <div className="text-2xl font-bold text-purple-900">{formatFileSize(stats.totalSize)}</div>
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
                                {t("customers.files.export")}{" "}
                                {selectedIds.length > 0 ? `(${selectedIds.length})` : t("customers.files.exportAll")}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Display Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <LayoutList className="h-4 w-4 mr-1" />
                                {t("customers.files.display")}
                                <ChevronDown className="ml-1 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48">
                            <DropdownMenuLabel>{t("customers.files.rowDensity")}</DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                                value={rowDensity}
                                onValueChange={(v) => setRowDensity(v as RowDensity)}
                            >
                                <DropdownMenuRadioItem value="compact">{t("customers.files.density.compact")}</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="comfortable">{t("customers.files.density.comfortable")}</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>{t("customers.files.columns")}</DropdownMenuLabel>
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
                        <TooltipContent>{t("customers.files.resetFilters")}</TooltipContent>
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
                            placeholder={t("customers.files.searchPlaceholder")}
                            className="pl-9"
                            autoComplete="new-password"
                            name="files-search-nofill"
                            data-lpignore="true"
                            data-1p-ignore="true"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Top Pagination */}
                {processedFiles.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalRecords={processedFiles.length}
                        startRecord={startRecord}
                        endRecord={endRecord}
                    />
                )}

                {/* Selection Banner */}
                {selectedIds.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center justify-between">
                        <span className="text-blue-800 text-sm font-medium">
                            {selectedIds.length > 1
                                ? t("customers.files.selectedPlural", { count: selectedIds.length })
                                : t("customers.files.selectedSingular", { count: selectedIds.length })}
                        </span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleSelectAll}>
                                {t("customers.files.selectAll", { count: processedFiles.length })}
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleClearSelection}>
                                {t("customers.files.clear")}
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
                            {paginatedFiles.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={visibleColumns.length + 2}
                                        className="text-center py-8 text-gray-500"
                                    >
                                        {searchQuery
                                            ? t("customers.files.empty.search")
                                            : t("customers.files.empty.none", {
                                                  company: customer?.company || t("customers.files.thisCustomer"),
                                              })}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedFiles.map((file, index) => (
                                    <TableRow
                                        key={file.id}
                                        className={`group hover:bg-gray-50 ${focusedRowIndex === index ? "bg-blue-50" : ""} ${selectedIds.includes(file.id) ? "bg-blue-50/50" : ""}`}
                                        onClick={() => setFocusedRowIndex(index)}
                                    >
                                        <TableCell className={ROW_DENSITY_STYLES[rowDensity]}>
                                            <Checkbox
                                                checked={selectedIds.includes(file.id)}
                                                onCheckedChange={() => toggleSelect(file.id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </TableCell>
                                        {visibleColumns.map((col) => (
                                            <TableCell key={col.key} className={ROW_DENSITY_STYLES[rowDensity]}>
                                                {col.key === "name" && (
                                                    <div className="flex items-center gap-2">
                                                        {getFileIcon(file.type)}
                                                        <a
                                                            href={file.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="font-medium text-blue-600 hover:underline"
                                                        >
                                                            <HighlightText text={file.name} search={searchQuery} />
                                                        </a>
                                                    </div>
                                                )}
                                                {col.key === "size" && (
                                                    <span className="text-gray-500">{formatFileSize(file.size)}</span>
                                                )}
                                                {col.key === "type" && (
                                                    <span className="text-gray-500">{file.type}</span>
                                                )}
                                                {col.key === "createdAt" && <span>{formatDate(file.createdAt)}</span>}
                                            </TableCell>
                                        ))}
                                        <TableCell className={`${ROW_DENSITY_STYLES[rowDensity]} overflow-visible`}>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <a href={file.url} download>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                                                <Download className="h-4 w-4 text-gray-500" />
                                                            </Button>
                                                        </a>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{t("customers.files.download")}</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => deleteFile(file.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{t("common.delete")}</TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Dialogs */}
                <UploadFileDialog open={showUploadDialog} onOpenChange={setShowUploadDialog} />

                {/* Bottom Pagination */}
                {processedFiles.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalRecords={processedFiles.length}
                        startRecord={startRecord}
                        endRecord={endRecord}
                    />
                )}
            </div>
        </TooltipProvider>
    );
}
