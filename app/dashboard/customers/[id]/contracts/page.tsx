"use client";

import { useState, useMemo, useCallback, useRef, KeyboardEvent } from "react";
import { useCustomer } from "@/components/dashboard/customers/customer-context";
import { useContracts } from "@/lib/hooks/use-contracts";
import { useFormatters } from "@/lib/hooks/use-formatters";
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
    FileSignature,
    DollarSign,
    CheckCircle2,
    RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// Types
type SortDirection = "asc" | "desc" | null;
type RowDensity = "compact" | "comfortable";
type ColumnKey = "subject" | "value" | "type" | "startDate" | "endDate" | "status";

interface ColumnDef {
    key: ColumnKey;
    label: string;
    defaultVisible: boolean;
    sortable?: boolean;
    width?: number;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
    { key: "subject", label: "Subject", defaultVisible: true, sortable: true, width: 200 },
    { key: "value", label: "Contract Value", defaultVisible: true, sortable: true, width: 140 },
    { key: "type", label: "Contract Type", defaultVisible: true, sortable: true, width: 140 },
    { key: "startDate", label: "Start Date", defaultVisible: true, sortable: true, width: 120 },
    { key: "endDate", label: "End Date", defaultVisible: true, sortable: true, width: 120 },
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

export default function ContractsPage() {
    const { customer, loading: customerLoading, customerId } = useCustomer();
    const {
        contracts,
        loading: contractsLoading,
        contractStats,
    } = useContracts({ customerId: customerId || undefined });
    const { formatDate, formatCurrency } = useFormatters();
    const { t } = useTranslation();
    const tableRef = useRef<HTMLDivElement>(null);

    // UI State
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage, setRecordsPerPage] = useState(25);
    const [columnVisibility, setColumnVisibility] = useState<Record<ColumnKey, boolean>>({
        subject: true,
        value: true,
        type: true,
        startDate: true,
        endDate: true,
        status: true,
    });
    const [sortKey, setSortKey] = useState<ColumnKey | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [rowDensity, setRowDensity] = useState<RowDensity>("comfortable");
    const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);

    // Currency formatter helper that uses customer currency
    const formatContractCurrency = (amount: number = 0) => {
        const currency = customer?.currency || "USD";
        return formatCurrency(amount, currency);
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            draft: "bg-gray-50 text-gray-500 border-gray-100",
            active: "bg-green-50 text-green-600 border-green-100",
            expired: "bg-red-50 text-red-600 border-red-100",
            pending: "bg-orange-50 text-orange-600 border-orange-100",
            cancelled: "bg-gray-50 text-gray-400 border-gray-100",
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

    // Process contracts
    const processedContracts = useMemo(() => {
        let result = [...contracts];
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(
                (c) =>
                    c.subject.toLowerCase().includes(lowerQuery) ||
                    (c.contractType || "").toLowerCase().includes(lowerQuery) ||
                    c.status.toLowerCase().includes(lowerQuery)
            );
        }
        if (sortKey && sortDirection) {
            result.sort((a, b) => {
                let aVal: any, bVal: any;
                switch (sortKey) {
                    case "subject":
                        aVal = a.subject || "";
                        bVal = b.subject || "";
                        break;
                    case "value":
                        aVal = a.contractValue || 0;
                        bVal = b.contractValue || 0;
                        break;
                    case "type":
                        aVal = a.contractType || "";
                        bVal = b.contractType || "";
                        break;
                    case "startDate":
                        aVal = a.startDate?.toMillis?.() || 0;
                        bVal = b.startDate?.toMillis?.() || 0;
                        break;
                    case "endDate":
                        aVal = a.endDate?.toMillis?.() || 0;
                        bVal = b.endDate?.toMillis?.() || 0;
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
    }, [contracts, searchQuery, sortKey, sortDirection]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(processedContracts.length / recordsPerPage));
    const startIndex = (currentPage - 1) * recordsPerPage;
    const paginatedContracts = processedContracts.slice(startIndex, startIndex + recordsPerPage);
    const startRecord = processedContracts.length === 0 ? 0 : startIndex + 1;
    const endRecord = Math.min(startIndex + recordsPerPage, processedContracts.length);

    // Selection handlers
    const handleSelectAll = () => setSelectedIds(processedContracts.map((c) => c.id));
    const handleClearSelection = () => setSelectedIds([]);
    const handleSelectPage = () => setSelectedIds(paginatedContracts.map((c) => c.id));
    const toggleSelect = (id: string) =>
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    const isAllSelected = paginatedContracts.length > 0 && paginatedContracts.every((c) => selectedIds.includes(c.id));
    const isSomeSelected = paginatedContracts.some((c) => selectedIds.includes(c.id)) && !isAllSelected;

    // Export
    const handleExport = () => {
        const dataToExport =
            selectedIds.length > 0 ? contracts.filter((c) => selectedIds.includes(c.id)) : processedContracts;
        const csv = [
            "Subject,Type,Value,Start Date,End Date,Status",
            ...dataToExport.map(
                (c) =>
                    `"${c.subject}","${c.contractType || ""}","${c.contractValue || 0}","${formatDate(c.startDate)}","${formatDate(c.endDate)}","${c.status}"`
            ),
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "contracts-export.csv";
        a.click();
        URL.revokeObjectURL(url);
        toast.success(t("customers.toast.exported"));
    };

    const columnLabel = (key: ColumnKey) => t(`customers.contracts.columns.${key}`);

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLDivElement>) => {
            if (focusedRowIndex === null || paginatedContracts.length === 0) return;
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setFocusedRowIndex(Math.min(focusedRowIndex + 1, paginatedContracts.length - 1));
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setFocusedRowIndex(Math.max(focusedRowIndex - 1, 0));
                    break;
                case " ":
                    e.preventDefault();
                    toggleSelect(paginatedContracts[focusedRowIndex].id);
                    break;
            }
        },
        [focusedRowIndex, paginatedContracts]
    );

    const visibleColumns = DEFAULT_COLUMNS.filter((c) => columnVisibility[c.key]);

    if (customerLoading || contractsLoading) {
        return (
            <div className="p-8 flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                {t("customers.contracts.loading")}
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="space-y-4" onKeyDown={handleKeyDown} tabIndex={0} ref={tableRef}>
                {/* Header Toolbar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/dashboard/contracts/new?customerId=${customerId}`}>
                            <Button className="bg-gray-900 text-white hover:bg-gray-800">
                                <Plus className="mr-2 h-4 w-4" />
                                {t("customers.contracts.new")}
                            </Button>
                        </Link>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={handleExport}>
                                    <Download className="h-4 w-4 mr-2" />
                                    {t("common.export")}{" "}
                                    {selectedIds.length > 0 ? `(${selectedIds.length})` : t("common.all")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {selectedIds.length > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-1.5 flex items-center gap-2">
                                <span className="text-blue-800 text-sm font-medium">
                                    {t("customers.selection.count", { count: selectedIds.length })}
                                </span>
                                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleSelectAll}>
                                    {t("customers.selection.all", { count: processedContracts.length })}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs"
                                    onClick={handleClearSelection}
                                >
                                    {t("customers.selection.clear")}
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 flex-1 w-full max-w-md mx-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder={t("customers.contracts.searchPlaceholder")}
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
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
                            <TooltipContent>{t("customers.toolbar.reset")}</TooltipContent>
                        </Tooltip>
                    </div>
                </div>

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
                            {paginatedContracts.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={visibleColumns.length + 2}
                                        className="text-center py-8 text-gray-500"
                                    >
                                        {searchQuery
                                            ? t("customers.contracts.emptySearch")
                                            : t("customers.contracts.empty", {
                                                  customer: customer?.company || t("customers.thisCustomer"),
                                              })}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedContracts.map((contract, index) => (
                                    <TableRow
                                        key={contract.id}
                                        className={`group hover:bg-gray-50 ${focusedRowIndex === index ? "bg-blue-50" : ""} ${selectedIds.includes(contract.id) ? "bg-blue-50/50" : ""}`}
                                        onClick={() => setFocusedRowIndex(index)}
                                    >
                                        <TableCell className={ROW_DENSITY_STYLES[rowDensity]}>
                                            <Checkbox
                                                checked={selectedIds.includes(contract.id)}
                                                onCheckedChange={() => toggleSelect(contract.id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </TableCell>
                                        {visibleColumns.map((col) => (
                                            <TableCell key={col.key} className={ROW_DENSITY_STYLES[rowDensity]}>
                                                {col.key === "subject" && (
                                                    <span className="font-medium text-blue-600">
                                                        <HighlightText text={contract.subject} search={searchQuery} />
                                                    </span>
                                                )}
                                                {col.key === "value" && (
                                                    <span className="font-medium">
                                                        {formatCurrency(contract.contractValue)}
                                                    </span>
                                                )}
                                                {col.key === "type" && (
                                                    <span className="text-gray-600">
                                                        {contract.contractType || "-"}
                                                    </span>
                                                )}
                                                {col.key === "startDate" && (
                                                    <span>{formatDate(contract.startDate)}</span>
                                                )}
                                                {col.key === "endDate" && <span>{formatDate(contract.endDate)}</span>}
                                                {col.key === "status" && (
                                                    <Badge className={`${getStatusBadge(contract.status)} font-normal`}>
                                                        <HighlightText
                                                            text={formatStatus(contract.status)}
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
                                                        <Link href={`/dashboard/contracts/${contract.id}`}>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                                                <Eye className="h-4 w-4 text-gray-500" />
                                                            </Button>
                                                        </Link>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{t("common.view")}</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Link href={`/dashboard/contracts/${contract.id}/edit`}>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                                                <Pencil className="h-4 w-4 text-gray-500" />
                                                            </Button>
                                                        </Link>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{t("common.edit")}</TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600 font-medium">
                            {t("customers.footer.total", { count: processedContracts.length })}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{t("customers.footer.rows")}</span>
                            <Select
                                value={recordsPerPage.toString()}
                                onValueChange={(v) => {
                                    setRecordsPerPage(parseInt(v));
                                    setCurrentPage(1);
                                }}
                            >
                                <SelectTrigger className="w-[65px] h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalRecords={processedContracts.length}
                        startRecord={startRecord}
                        endRecord={endRecord}
                    />
                </div>
            </div>
        </TooltipProvider>
    );
}
