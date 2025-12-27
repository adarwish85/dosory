"use client";

import { useState, useMemo, useCallback, useRef, KeyboardEvent } from "react";
import { useCustomer } from "@/components/dashboard/customers/customer-context";
import { useEstimates } from "@/lib/hooks/use-sales";
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
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem,
    DropdownMenuRadioGroup, DropdownMenuRadioItem
} from "@/components/ui/dropdown-menu";
import { StatsGroup } from "@/components/dashboard/customers/stats-group";
import {
    Search, Plus, MoreVertical, ChevronDown, LayoutList, Download,
    ArrowUpDown, ArrowUp, ArrowDown, RotateCcw, Loader2, Eye, Pencil,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileDown
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// Types
type SortDirection = "asc" | "desc" | null;
type RowDensity = "compact" | "comfortable";
type ColumnKey = "number" | "amount" | "tax" | "date" | "expiryDate" | "status";

interface ColumnDef { key: ColumnKey; label: string; defaultVisible: boolean; sortable?: boolean; width?: number; }

const DEFAULT_COLUMNS: ColumnDef[] = [
    { key: "number", label: "Estimate #", defaultVisible: true, sortable: true, width: 140 },
    { key: "amount", label: "Amount", defaultVisible: true, sortable: true, width: 120 },
    { key: "tax", label: "Total Tax", defaultVisible: true, sortable: true, width: 120 },
    { key: "date", label: "Date", defaultVisible: true, sortable: true, width: 120 },
    { key: "expiryDate", label: "Expiry Date", defaultVisible: true, sortable: true, width: 120 },
    { key: "status", label: "Status", defaultVisible: true, sortable: true, width: 100 },
];

const ROW_DENSITY_STYLES: Record<RowDensity, string> = { compact: "py-1 text-xs", comfortable: "py-3 text-sm" };

// Highlight text component
function HighlightText({ text, search }: { text: string; search: string }) {
    if (!search.trim() || !text) return <>{text}</>;
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return <>{parts.map((part, i) => regex.test(part) ? <mark key={i} className="bg-yellow-200 px-0.5 rounded">{part}</mark> : <span key={i}>{part}</span>)}</>;
}

// Pagination component
function Pagination({ currentPage, totalPages, onPageChange, totalRecords, startRecord, endRecord }: {
    currentPage: number; totalPages: number; onPageChange: (page: number) => void;
    totalRecords: number; startRecord: number; endRecord: number;
}) {
    return (
        <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Showing {startRecord} to {endRecord} of {totalRecords}</span>
            <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(1)} disabled={currentPage === 1}><ChevronsLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="px-3 py-1 bg-gray-100 rounded text-sm font-medium">{currentPage} / {totalPages}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}><ChevronsRight className="h-4 w-4" /></Button>
            </div>
        </div>
    );
}

export default function EstimatesPage() {
    const { customer, loading: customerLoading, customerId } = useCustomer();
    const { estimates, loading: estimatesLoading, estimateStats } = useEstimates({ customerId: customerId || undefined });
    const { formatDate, formatCurrency } = useFormatters();
    const { t } = useTranslation();
    const tableRef = useRef<HTMLDivElement>(null);

    // UI State
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage, setRecordsPerPage] = useState(25);
    const [columnVisibility, setColumnVisibility] = useState<Record<ColumnKey, boolean>>({
        number: true, amount: true, tax: true, date: true, expiryDate: true, status: true
    });
    const [sortKey, setSortKey] = useState<ColumnKey | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [rowDensity, setRowDensity] = useState<RowDensity>("comfortable");
    const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);

    // Currency formatter helper that uses customer currency
    const formatEstimateCurrency = (amount: number = 0) => {
        const currency = customer?.currency || "USD";
        return formatCurrency(amount, currency);
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            draft: "bg-gray-50 text-gray-500 border-gray-100",
            sent: "bg-blue-50 text-blue-600 border-blue-100",
            expired: "bg-orange-50 text-orange-600 border-orange-100",
            declined: "bg-red-50 text-red-600 border-red-100",
            accepted: "bg-green-50 text-green-600 border-green-100",
        };
        return styles[status] || "bg-gray-50 text-gray-600 border-gray-100";
    };

    const formatStatus = (status: string) => status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

    // Sort handler
    const handleSort = (key: ColumnKey) => {
        if (sortKey === key) {
            setSortDirection(prev => prev === "asc" ? "desc" : prev === "desc" ? null : "asc");
            if (sortDirection === "desc") setSortKey(null);
        } else {
            setSortKey(key);
            setSortDirection("asc");
        }
    };

    // Toggle column
    const toggleColumn = (key: ColumnKey) => setColumnVisibility(prev => ({ ...prev, [key]: !prev[key] }));

    // Process estimates
    const processedEstimates = useMemo(() => {
        let result = [...estimates];
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(est =>
                String(est.number).includes(searchQuery) ||
                est.status?.toLowerCase().includes(lowerQuery)
            );
        }
        if (sortKey && sortDirection) {
            result.sort((a, b) => {
                let aVal: any, bVal: any;
                switch (sortKey) {
                    case "number": aVal = a.number || ""; bVal = b.number || ""; break;
                    case "amount": aVal = a.total || 0; bVal = b.total || 0; break;
                    case "tax": aVal = a.taxTotal || 0; bVal = b.taxTotal || 0; break;
                    case "date": aVal = a.date?.toMillis?.() || 0; bVal = b.date?.toMillis?.() || 0; break;
                    case "expiryDate": aVal = a.expiryDate?.toMillis?.() || 0; bVal = b.expiryDate?.toMillis?.() || 0; break;
                    case "status": aVal = a.status || ""; bVal = b.status || ""; break;
                    default: return 0;
                }
                if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
                if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [estimates, searchQuery, sortKey, sortDirection]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(processedEstimates.length / recordsPerPage));
    const startIndex = (currentPage - 1) * recordsPerPage;
    const paginatedEstimates = processedEstimates.slice(startIndex, startIndex + recordsPerPage);
    const startRecord = processedEstimates.length === 0 ? 0 : startIndex + 1;
    const endRecord = Math.min(startIndex + recordsPerPage, processedEstimates.length);

    // Selection handlers
    const handleSelectAll = () => setSelectedIds(processedEstimates.map(est => est.id));
    const handleClearSelection = () => setSelectedIds([]);
    const handleSelectPage = () => setSelectedIds(paginatedEstimates.map(est => est.id));
    const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    const isAllSelected = paginatedEstimates.length > 0 && paginatedEstimates.every(est => selectedIds.includes(est.id));
    const isSomeSelected = paginatedEstimates.some(est => selectedIds.includes(est.id)) && !isAllSelected;

    // Export
    const handleExport = () => {
        const dataToExport = selectedIds.length > 0 ? estimates.filter(est => selectedIds.includes(est.id)) : processedEstimates;
        const csv = ["Estimate #,Amount,Tax,Date,Expiry,Status", ...dataToExport.map(est => `"EST-${est.number}","${est.total}","${est.taxTotal || 0}","${formatDate(est.date)}","${formatDate(est.expiryDate)}","${est.status}"`)].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "estimates-export.csv"; a.click();
        URL.revokeObjectURL(url);
        toast.success("Exported successfully");
    };

    // Keyboard navigation
    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
        if (focusedRowIndex === null || paginatedEstimates.length === 0) return;
        switch (e.key) {
            case "ArrowDown": e.preventDefault(); setFocusedRowIndex(Math.min(focusedRowIndex + 1, paginatedEstimates.length - 1)); break;
            case "ArrowUp": e.preventDefault(); setFocusedRowIndex(Math.max(focusedRowIndex - 1, 0)); break;
            case " ": e.preventDefault(); toggleSelect(paginatedEstimates[focusedRowIndex].id); break;
        }
    }, [focusedRowIndex, paginatedEstimates]);

    const visibleColumns = DEFAULT_COLUMNS.filter(c => columnVisibility[c.key]);

    if (customerLoading || estimatesLoading) {
        return <div className="p-8 flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />Loading estimates...</div>;
    }

    return (
        <TooltipProvider>
            <div className="space-y-4" onKeyDown={handleKeyDown} tabIndex={0} ref={tableRef}>
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Estimates</h1>
                    <div className="flex gap-2">
                        <Link href={`/dashboard/sales/estimates/new?customerId=${customerId}`}>
                            <Button className="bg-gray-900 text-white hover:bg-gray-800">
                                <Plus className="mr-2 h-4 w-4" />Create New Estimate
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Stats Group */}
                <StatsGroup
                    items={[
                        { label: "Draft", amount: formatCurrency(estimateStats?.draft || 0), color: "default" },
                        { label: "Sent", amount: formatCurrency(estimateStats?.sent || 0), color: "blue" },
                        { label: "Expired", amount: formatCurrency(estimateStats?.expired || 0), color: "orange" },
                        { label: "Declined", amount: formatCurrency(estimateStats?.declined || 0), color: "red" },
                        { label: "Accepted", amount: formatCurrency(estimateStats?.accepted || 0), color: "green" },
                    ]}
                />

                {/* Compact Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Actions Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline"><MoreVertical className="h-4 w-4 mr-1" />Actions<ChevronDown className="ml-1 h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={handleExport}><Download className="h-4 w-4 mr-2" />Export {selectedIds.length > 0 ? `(${selectedIds.length})` : "All"}</DropdownMenuItem>
                            <DropdownMenuItem><FileDown className="h-4 w-4 mr-2" />Zip Estimates</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Display Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline"><LayoutList className="h-4 w-4 mr-1" />Display<ChevronDown className="ml-1 h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48">
                            <DropdownMenuLabel>Row Density</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={rowDensity} onValueChange={(v) => setRowDensity(v as RowDensity)}>
                                <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Columns</DropdownMenuLabel>
                            {DEFAULT_COLUMNS.map(col => (
                                <DropdownMenuCheckboxItem key={col.key} checked={columnVisibility[col.key]} onCheckedChange={() => toggleColumn(col.key)}>{col.label}</DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Reset */}
                    <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => { setSearchQuery(""); setSortKey(null); setSortDirection(null); setSelectedIds([]); }}><RotateCcw className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Reset filters</TooltipContent></Tooltip>

                    <div className="flex-1" />

                    {/* Records Per Page */}
                    <Select value={String(recordsPerPage)} onValueChange={(v) => { setRecordsPerPage(Number(v)); setCurrentPage(1); }}>
                        <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
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
                        <Input placeholder="Search..." className="pl-9" autoComplete="new-password" name="estimates-search-nofill" data-lpignore="true" data-1p-ignore="true" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                </div>

                {/* Top Pagination */}
                {processedEstimates.length > 0 && (
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalRecords={processedEstimates.length} startRecord={startRecord} endRecord={endRecord} />
                )}

                {/* Selection Banner */}
                {selectedIds.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center justify-between">
                        <span className="text-blue-800 text-sm font-medium">{selectedIds.length} estimate{selectedIds.length > 1 ? "s" : ""} selected</span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleSelectAll}>Select All ({processedEstimates.length})</Button>
                            <Button variant="outline" size="sm" onClick={handleClearSelection}>Clear</Button>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/80">
                                <TableHead className="w-12 bg-gray-100/50">
                                    <Checkbox checked={isAllSelected} ref={(el) => { if (el) (el as any).indeterminate = isSomeSelected; }} onCheckedChange={(checked) => { if (checked) handleSelectPage(); else handleClearSelection(); }} />
                                </TableHead>
                                {visibleColumns.map(col => (
                                    <TableHead key={col.key} className="font-semibold text-gray-900 bg-gray-100/50" style={{ minWidth: col.width }}>
                                        {col.sortable ? (
                                            <Button variant="ghost" className="h-8 px-2 -ml-2 font-semibold hover:bg-gray-200" onClick={() => handleSort(col.key)}>
                                                {col.label}
                                                {sortKey === col.key ? (sortDirection === "asc" ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />) : <ArrowUpDown className="ml-1 h-4 w-4 opacity-40" />}
                                            </Button>
                                        ) : col.label}
                                    </TableHead>
                                ))}
                                <TableHead className="w-20 font-semibold text-gray-900 bg-gray-100/50">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedEstimates.length === 0 ? (
                                <TableRow><TableCell colSpan={visibleColumns.length + 2} className="text-center py-8 text-gray-500">{searchQuery ? "No estimates match your search." : `No estimates found for ${customer?.company || "this customer"}.`}</TableCell></TableRow>
                            ) : (
                                paginatedEstimates.map((estimate, index) => (
                                    <TableRow key={estimate.id} className={`group hover:bg-gray-50 ${focusedRowIndex === index ? "bg-blue-50" : ""} ${selectedIds.includes(estimate.id) ? "bg-blue-50/50" : ""}`} onClick={() => setFocusedRowIndex(index)}>
                                        <TableCell className={ROW_DENSITY_STYLES[rowDensity]}>
                                            <Checkbox checked={selectedIds.includes(estimate.id)} onCheckedChange={() => toggleSelect(estimate.id)} onClick={(e) => e.stopPropagation()} />
                                        </TableCell>
                                        {visibleColumns.map(col => (
                                            <TableCell key={col.key} className={ROW_DENSITY_STYLES[rowDensity]}>
                                                {col.key === "number" && (
                                                    <span className="text-blue-600 font-medium">
                                                        <HighlightText text={`EST-${String(estimate.number).padStart(6, "0")}`} search={searchQuery} />
                                                    </span>
                                                )}
                                                {col.key === "amount" && <span className="font-medium">{formatCurrency(estimate.total)}</span>}
                                                {col.key === "tax" && <span className="text-gray-600">{formatCurrency(estimate.taxTotal || 0)}</span>}
                                                {col.key === "date" && <span>{formatDate(estimate.date)}</span>}
                                                {col.key === "expiryDate" && <span>{formatDate(estimate.expiryDate)}</span>}
                                                {col.key === "status" && (
                                                    <Badge className={`${getStatusBadge(estimate.status)} font-normal`}>
                                                        <HighlightText text={formatStatus(estimate.status)} search={searchQuery} />
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        ))}
                                        <TableCell className={`${ROW_DENSITY_STYLES[rowDensity]} overflow-visible`}>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Tooltip><TooltipTrigger asChild><Link href={`/dashboard/sales/estimates/${estimate.id}`}><Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-4 w-4 text-gray-500" /></Button></Link></TooltipTrigger><TooltipContent>View</TooltipContent></Tooltip>
                                                <Tooltip><TooltipTrigger asChild><Link href={`/dashboard/sales/estimates/${estimate.id}/edit`}><Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-4 w-4 text-gray-500" /></Button></Link></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Bottom Pagination */}
                {processedEstimates.length > 0 && (
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalRecords={processedEstimates.length} startRecord={startRecord} endRecord={endRecord} />
                )}
            </div>
        </TooltipProvider>
    );
}
