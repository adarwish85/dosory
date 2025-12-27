"use client";

import { useState, useMemo, useCallback, useRef, KeyboardEvent } from "react";
import { useCustomer } from "@/components/dashboard/customers/customer-context";
import { usePayments } from "@/lib/hooks/use-customer-data";
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
import {
    Search, Plus, MoreVertical, ChevronDown, LayoutList, Download,
    ArrowUpDown, ArrowUp, ArrowDown, RotateCcw, Loader2, Eye, Pencil, Trash2,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from "lucide-react";
import Link from "next/link";
import { RecordPaymentDialog } from "@/components/dashboard/customers/payments/record-payment-dialog";
import { toast } from "sonner";

// Types
type SortDirection = "asc" | "desc" | null;
type RowDensity = "compact" | "comfortable";
type ColumnKey = "date" | "invoice" | "amount" | "paymentMode" | "transactionId";

interface ColumnDef { key: ColumnKey; label: string; defaultVisible: boolean; sortable?: boolean; width?: number; }

const DEFAULT_COLUMNS: ColumnDef[] = [
    { key: "date", label: "Date", defaultVisible: true, sortable: true, width: 120 },
    { key: "invoice", label: "Invoice", defaultVisible: true, sortable: true, width: 140 },
    { key: "amount", label: "Amount", defaultVisible: true, sortable: true, width: 120 },
    { key: "paymentMode", label: "Payment Mode", defaultVisible: true, sortable: true, width: 140 },
    { key: "transactionId", label: "Transaction ID", defaultVisible: true, sortable: false, width: 160 },
];

const ROW_DENSITY_STYLES: Record<RowDensity, string> = { compact: "py-1 text-xs", comfortable: "py-3 text-sm" };

// Highlight text component
function HighlightText({ text, search }: { text: string; search: string }) {
    if (!search.trim() || !text) return <>{text}</>;
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return <>{parts.map((part, i) => regex.test(part) ? <mark key={i} className="bg-yellow-200 px-0.5 rounded">{part}</mark> : <span key={i}>{part}</span>)}</>;
}

// Pagination component - Leads Layout Standard
function Pagination({ currentPage, totalPages, onPageChange, totalRecords, recordsPerPage, onRecordsPerPageChange }: {
    currentPage: number; totalPages: number; onPageChange: (page: number) => void;
    totalRecords: number; recordsPerPage: number; onRecordsPerPageChange: (value: number) => void;
}) {
    return (
        <div className="flex items-center justify-between text-sm text-gray-600 border-t pt-4">
            {/* LEFT: Total */}
            <div className="flex items-center gap-2">
                <span className="font-medium">Total</span>
                <Badge variant="secondary">{totalRecords}</Badge>
            </div>

            {/* CENTER: Rows per page */}
            <div className="flex items-center gap-2">
                <span className="text-gray-500">Rows</span>
                <Select value={String(recordsPerPage)} onValueChange={(v) => onRecordsPerPageChange(Number(v))}>
                    <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* RIGHT: Compact Pagination */}
            <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="px-3 py-1 bg-gray-100 rounded text-sm font-medium">{currentPage} / {totalPages}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
            </div>
        </div>
    );
}

export default function PaymentsPage() {
    const { customer, loading: customerLoading, customerId } = useCustomer();
    const { payments, loading: paymentsLoading } = usePayments({ customerId: customerId || undefined });
    const { formatDate, formatCurrency } = useFormatters();
    const { t } = useTranslation();
    const tableRef = useRef<HTMLDivElement>(null);

    // UI State
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage, setRecordsPerPage] = useState(25);
    const [columnVisibility, setColumnVisibility] = useState<Record<ColumnKey, boolean>>({ date: true, invoice: true, amount: true, paymentMode: true, transactionId: true });
    const [sortKey, setSortKey] = useState<ColumnKey | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [rowDensity, setRowDensity] = useState<RowDensity>("comfortable");
    const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);

    // Currency formatter helper that uses customer currency
    const formatPaymentCurrency = (amount: number = 0) => {
        const currency = customer?.currency || "USD";
        return formatCurrency(amount, currency);
    };

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

    // Process payments
    const processedPayments = useMemo(() => {
        let result = [...payments];
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.invoiceNumber?.toLowerCase().includes(lowerQuery) ||
                p.paymentMode?.toLowerCase().includes(lowerQuery) ||
                p.transactionId?.toLowerCase().includes(lowerQuery)
            );
        }
        if (sortKey && sortDirection) {
            result.sort((a, b) => {
                let aVal: any, bVal: any;
                switch (sortKey) {
                    case "date": aVal = a.date?.toMillis?.() || 0; bVal = b.date?.toMillis?.() || 0; break;
                    case "invoice": aVal = a.invoiceNumber || ""; bVal = b.invoiceNumber || ""; break;
                    case "amount": aVal = a.amount || 0; bVal = b.amount || 0; break;
                    case "paymentMode": aVal = a.paymentMode || ""; bVal = b.paymentMode || ""; break;
                    default: return 0;
                }
                if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
                if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [payments, searchQuery, sortKey, sortDirection]);

    // Totals
    const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(processedPayments.length / recordsPerPage));
    const startIndex = (currentPage - 1) * recordsPerPage;
    const paginatedPayments = processedPayments.slice(startIndex, startIndex + recordsPerPage);
    const startRecord = processedPayments.length === 0 ? 0 : startIndex + 1;
    const endRecord = Math.min(startIndex + recordsPerPage, processedPayments.length);

    // Selection handlers
    const handleSelectAll = () => setSelectedIds(processedPayments.map(p => p.id));
    const handleClearSelection = () => setSelectedIds([]);
    const handleSelectPage = () => setSelectedIds(paginatedPayments.map(p => p.id));
    const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    const isAllSelected = paginatedPayments.length > 0 && paginatedPayments.every(p => selectedIds.includes(p.id));
    const isSomeSelected = paginatedPayments.some(p => selectedIds.includes(p.id)) && !isAllSelected;

    // Export
    const handleExport = () => {
        const dataToExport = selectedIds.length > 0 ? payments.filter(p => selectedIds.includes(p.id)) : processedPayments;
        const csv = ["Date,Invoice,Amount,Payment Mode,Transaction ID", ...dataToExport.map(p => `"${formatDate(p.date)}","${p.invoiceNumber || '-'}","${p.amount}","${p.paymentMode || '-'}","${p.transactionId || '-'}"`)].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "payments-export.csv"; a.click();
        URL.revokeObjectURL(url);
        toast.success("Exported successfully");
    };

    // Keyboard navigation
    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
        if (focusedRowIndex === null || paginatedPayments.length === 0) return;
        switch (e.key) {
            case "ArrowDown": e.preventDefault(); setFocusedRowIndex(Math.min(focusedRowIndex + 1, paginatedPayments.length - 1)); break;
            case "ArrowUp": e.preventDefault(); setFocusedRowIndex(Math.max(focusedRowIndex - 1, 0)); break;
            case " ": e.preventDefault(); toggleSelect(paginatedPayments[focusedRowIndex].id); break;
        }
    }, [focusedRowIndex, paginatedPayments]);

    const visibleColumns = DEFAULT_COLUMNS.filter(c => columnVisibility[c.key]);

    if (customerLoading || paymentsLoading) {
        return <div className="p-8 flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />Loading payments...</div>;
    }

    return (
        <TooltipProvider>
            <div className="space-y-4" onKeyDown={handleKeyDown} tabIndex={0} ref={tableRef}>
                <RecordPaymentDialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog} customerId={customerId || ""} customerName={customer?.company || "Customer"} />

                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Payments</h1>
                </div>

                {/* Total Summary */}
                <div className="bg-white rounded-lg border p-4 inline-block">
                    <div className="text-sm text-gray-500">Total Payments Received</div>
                    <div className="text-2xl font-bold text-green-600">{formatPaymentCurrency(totalPayments)}</div>
                </div>

                {/* Toolbar - Leads Layout Standard */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    {/* LEFT: Primary Action + Dots Menu */}
                    <div className="flex items-center gap-2">
                        <Button className="bg-gray-900 text-white hover:bg-gray-800" onClick={() => setShowPaymentDialog(true)}>
                            <Plus className="mr-2 h-4 w-4" />Record Payment
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={handleExport}><Download className="h-4 w-4 mr-2" />Export {selectedIds.length > 0 ? `(${selectedIds.length})` : "All"}</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* CENTER: Search */}
                    <div className="flex items-center gap-2 flex-1 w-full max-w-md mx-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input placeholder="Search payments..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                    </div>

                    {/* RIGHT: Display + Refresh */}
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline"><LayoutList className="h-4 w-4 mr-2" />Display</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
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
                        <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => { setSearchQuery(""); setSortKey(null); setSortDirection(null); setSelectedIds([]); }}><RotateCcw className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Reset filters</TooltipContent></Tooltip>
                    </div>
                </div>

                {/* Selection Banner */}
                {selectedIds.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center justify-between">
                        <span className="text-blue-800 text-sm font-medium">{selectedIds.length} payment{selectedIds.length > 1 ? "s" : ""} selected</span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleSelectAll}>Select All ({processedPayments.length})</Button>
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
                            {paginatedPayments.length === 0 ? (
                                <TableRow><TableCell colSpan={visibleColumns.length + 2} className="text-center py-8 text-gray-500">{searchQuery ? "No payments match your search." : `No payments found for ${customer?.company || "this customer"}.`}</TableCell></TableRow>
                            ) : (
                                paginatedPayments.map((payment, index) => (
                                    <TableRow key={payment.id} className={`group hover:bg-gray-50 ${focusedRowIndex === index ? "bg-blue-50" : ""} ${selectedIds.includes(payment.id) ? "bg-blue-50/50" : ""}`} onClick={() => setFocusedRowIndex(index)}>
                                        <TableCell className={ROW_DENSITY_STYLES[rowDensity]}>
                                            <Checkbox checked={selectedIds.includes(payment.id)} onCheckedChange={() => toggleSelect(payment.id)} onClick={(e) => e.stopPropagation()} />
                                        </TableCell>
                                        {visibleColumns.map(col => (
                                            <TableCell key={col.key} className={ROW_DENSITY_STYLES[rowDensity]}>
                                                {col.key === "date" && <span className="font-medium">{formatDate(payment.date)}</span>}
                                                {col.key === "invoice" && (
                                                    payment.invoiceNumber ? (
                                                        <Link href={`/dashboard/invoices/${payment.invoiceId}`} className="text-blue-600 hover:underline font-medium">
                                                            <HighlightText text={payment.invoiceNumber} search={searchQuery} />
                                                        </Link>
                                                    ) : <span className="text-gray-400">-</span>
                                                )}
                                                {col.key === "amount" && <span className="font-medium text-green-600">{formatPaymentCurrency(payment.amount)}</span>}
                                                {col.key === "paymentMode" && <HighlightText text={payment.paymentMode || "-"} search={searchQuery} />}
                                                {col.key === "transactionId" && <span className="text-gray-500 text-xs"><HighlightText text={payment.transactionId || "-"} search={searchQuery} /></span>}
                                            </TableCell>
                                        ))}
                                        <TableCell className={`${ROW_DENSITY_STYLES[rowDensity]} overflow-visible`}>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-4 w-4 text-gray-500" /></Button></TooltipTrigger><TooltipContent>View</TooltipContent></Tooltip>
                                                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-4 w-4 text-gray-500" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Bottom Pagination */}
                {processedPayments.length > 0 && (
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalRecords={processedPayments.length} recordsPerPage={recordsPerPage} onRecordsPerPageChange={(v) => { setRecordsPerPage(v); setCurrentPage(1); }} />
                )}
            </div>
        </TooltipProvider >
    );
}
