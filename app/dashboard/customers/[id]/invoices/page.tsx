"use client";

import { useState, useMemo, useCallback, useRef, KeyboardEvent } from "react";
import { useCustomer } from "@/components/dashboard/customers/customer-context";
import { useInvoices } from "@/lib/hooks/use-invoices";
import { useFormatters } from "@/lib/hooks/use-formatters";
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
    Search, Plus, MoreVertical, ChevronDown, LayoutList, Download, FileDown,
    ArrowUpDown, ArrowUp, ArrowDown, RotateCcw, Loader2, Eye, Pencil, Trash2,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from "lucide-react";
import { StatsGroup } from "@/components/dashboard/customers/stats-group";
import Link from "next/link";
import { InvoiceWizard } from "@/components/dashboard/customers/invoices/invoice-sheet";
import { toast } from "sonner";

// Types
type SortDirection = "asc" | "desc" | null;
type RowDensity = "compact" | "comfortable";
type ColumnKey = "number" | "amount" | "tax" | "date" | "dueDate" | "status";

interface ColumnDef { key: ColumnKey; label: string; defaultVisible: boolean; sortable?: boolean; width?: number; }

const DEFAULT_COLUMNS: ColumnDef[] = [
    { key: "number", label: "Invoice #", defaultVisible: true, sortable: true, width: 140 },
    { key: "amount", label: "Amount", defaultVisible: true, sortable: true, width: 120 },
    { key: "tax", label: "Total Tax", defaultVisible: true, sortable: true, width: 100 },
    { key: "date", label: "Date", defaultVisible: true, sortable: true, width: 120 },
    { key: "dueDate", label: "Due Date", defaultVisible: true, sortable: true, width: 120 },
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

export default function InvoicesPage() {
    const { customer, loading: customerLoading, customerId } = useCustomer();
    const { invoices, loading: invoicesLoading, invoiceStats } = useInvoices({ customerId: customerId || undefined });
    const { formatDate, formatCurrency } = useFormatters();
    const tableRef = useRef<HTMLDivElement>(null);

    // UI State
    const [wizardOpen, setWizardOpen] = useState(false);
    const [wizardMode, setWizardMode] = useState<"create" | "view" | "edit">("create");
    const [wizardInvoiceId, setWizardInvoiceId] = useState<string | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage, setRecordsPerPage] = useState(25);
    const [columnVisibility, setColumnVisibility] = useState<Record<ColumnKey, boolean>>({ number: true, amount: true, tax: true, date: true, dueDate: true, status: true });
    const [sortKey, setSortKey] = useState<ColumnKey | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [rowDensity, setRowDensity] = useState<RowDensity>("comfortable");
    const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);

    // Wizard handlers
    const openCreateWizard = () => { setWizardMode("create"); setWizardInvoiceId(undefined); setWizardOpen(true); };
    const openViewWizard = (id: string) => { setWizardMode("view"); setWizardInvoiceId(id); setWizardOpen(true); };
    const openEditWizard = (id: string) => { setWizardMode("edit"); setWizardInvoiceId(id); setWizardOpen(true); };

    // Currency formatter helper that uses customer currency
    const formatInvoiceCurrency = (amount: number = 0) => {
        const currency = customer?.currency || "USD";
        return formatCurrency(amount, currency);
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            paid: "bg-green-50 text-green-600 border-green-100",
            unpaid: "bg-red-50 text-red-600 border-red-100",
            partially_paid: "bg-orange-50 text-orange-600 border-orange-100",
            overdue: "bg-red-50 text-red-700 border-red-200",
            cancelled: "bg-gray-50 text-gray-600 border-gray-100",
            draft: "bg-gray-50 text-gray-500 border-gray-100",
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

    // Process invoices
    const processedInvoices = useMemo(() => {
        let result = [...invoices];
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(inv =>
                String(inv.number).includes(searchQuery) ||
                inv.status?.toLowerCase().includes(lowerQuery)
            );
        }
        if (sortKey && sortDirection) {
            result.sort((a, b) => {
                let aVal: any, bVal: any;
                switch (sortKey) {
                    case "number": aVal = a.number || 0; bVal = b.number || 0; break;
                    case "amount": aVal = a.total || 0; bVal = b.total || 0; break;
                    case "tax": aVal = a.taxTotal || 0; bVal = b.taxTotal || 0; break;
                    case "date": aVal = a.date?.toMillis?.() || 0; bVal = b.date?.toMillis?.() || 0; break;
                    case "dueDate": aVal = a.dueDate?.toMillis?.() || 0; bVal = b.dueDate?.toMillis?.() || 0; break;
                    case "status": aVal = a.status || ""; bVal = b.status || ""; break;
                    default: return 0;
                }
                if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
                if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [invoices, searchQuery, sortKey, sortDirection]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(processedInvoices.length / recordsPerPage));
    const startIndex = (currentPage - 1) * recordsPerPage;
    const paginatedInvoices = processedInvoices.slice(startIndex, startIndex + recordsPerPage);
    const startRecord = processedInvoices.length === 0 ? 0 : startIndex + 1;
    const endRecord = Math.min(startIndex + recordsPerPage, processedInvoices.length);

    // Selection handlers
    const handleSelectAll = () => setSelectedIds(processedInvoices.map(i => i.id));
    const handleClearSelection = () => setSelectedIds([]);
    const handleSelectPage = () => setSelectedIds(paginatedInvoices.map(i => i.id));
    const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    const isAllSelected = paginatedInvoices.length > 0 && paginatedInvoices.every(i => selectedIds.includes(i.id));
    const isSomeSelected = paginatedInvoices.some(i => selectedIds.includes(i.id)) && !isAllSelected;

    // Export
    const handleExport = () => {
        const dataToExport = selectedIds.length > 0 ? invoices.filter(i => selectedIds.includes(i.id)) : processedInvoices;
        const csv = ["Invoice #,Amount,Tax,Date,Due Date,Status", ...dataToExport.map(i => `"INV-${String(i.number).padStart(6, "0")}","${i.total}","${i.taxTotal || 0}","${formatDate(i.date)}","${formatDate(i.dueDate)}","${i.status}"`)].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "invoices-export.csv"; a.click();
        URL.revokeObjectURL(url);
        toast.success("Exported successfully");
    };

    // Keyboard navigation
    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
        if (focusedRowIndex === null || paginatedInvoices.length === 0) return;
        switch (e.key) {
            case "ArrowDown": e.preventDefault(); setFocusedRowIndex(Math.min(focusedRowIndex + 1, paginatedInvoices.length - 1)); break;
            case "ArrowUp": e.preventDefault(); setFocusedRowIndex(Math.max(focusedRowIndex - 1, 0)); break;
            case " ": e.preventDefault(); toggleSelect(paginatedInvoices[focusedRowIndex].id); break;
            case "Enter": e.preventDefault(); window.location.href = `/dashboard/invoices/${paginatedInvoices[focusedRowIndex].id}`; break;
        }
    }, [focusedRowIndex, paginatedInvoices]);

    const visibleColumns = DEFAULT_COLUMNS.filter(c => columnVisibility[c.key]);

    if (customerLoading || invoicesLoading) {
        return <div className="p-8 flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />Loading invoices...</div>;
    }

    return (
        <TooltipProvider>
            <div className="space-y-4" onKeyDown={handleKeyDown} tabIndex={0} ref={tableRef}>
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Invoices</h1>
                    <Button className="bg-gray-900 text-white hover:bg-gray-800" onClick={openCreateWizard}>
                        <Plus className="mr-2 h-4 w-4" />New Invoice
                    </Button>
                </div>

                {/* Stats */}
                <StatsGroup items={[
                    { label: "Outstanding", amount: formatInvoiceCurrency(invoiceStats?.totalDue || 0), color: "orange" },
                    { label: "Past Due", amount: formatInvoiceCurrency(invoiceStats?.amountsByStatus?.overdue || 0), color: "default" },
                    { label: "Paid", amount: formatInvoiceCurrency(invoiceStats?.totalPaid || 0), color: "green" },
                ]} />

                {/* Compact Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Actions Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline"><MoreVertical className="h-4 w-4 mr-1" />Actions<ChevronDown className="ml-1 h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={handleExport}><Download className="h-4 w-4 mr-2" />Export {selectedIds.length > 0 ? `(${selectedIds.length})` : "All"}</DropdownMenuItem>
                            <DropdownMenuItem><FileDown className="h-4 w-4 mr-2" />Zip Invoices</DropdownMenuItem>
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
                        <Input placeholder="Search..." className="pl-9" autoComplete="new-password" name="invoices-search-nofill" data-lpignore="true" data-1p-ignore="true" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                </div>

                {/* Top Pagination */}
                {processedInvoices.length > 0 && (
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalRecords={processedInvoices.length} startRecord={startRecord} endRecord={endRecord} />
                )}

                {/* Selection Banner */}
                {selectedIds.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center justify-between">
                        <span className="text-blue-800 text-sm font-medium">{selectedIds.length} invoice{selectedIds.length > 1 ? "s" : ""} selected</span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleSelectAll}>Select All ({processedInvoices.length})</Button>
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
                            {paginatedInvoices.length === 0 ? (
                                <TableRow><TableCell colSpan={visibleColumns.length + 2} className="text-center py-8 text-gray-500">{searchQuery ? "No invoices match your search." : `No invoices found for ${customer?.company || "this customer"}.`}</TableCell></TableRow>
                            ) : (
                                paginatedInvoices.map((invoice, index) => (
                                    <TableRow key={invoice.id} className={`group hover:bg-gray-50 ${focusedRowIndex === index ? "bg-blue-50" : ""} ${selectedIds.includes(invoice.id) ? "bg-blue-50/50" : ""}`} onClick={() => setFocusedRowIndex(index)}>
                                        <TableCell className={ROW_DENSITY_STYLES[rowDensity]}>
                                            <Checkbox checked={selectedIds.includes(invoice.id)} onCheckedChange={() => toggleSelect(invoice.id)} onClick={(e) => e.stopPropagation()} />
                                        </TableCell>
                                        {visibleColumns.map(col => (
                                            <TableCell key={col.key} className={ROW_DENSITY_STYLES[rowDensity]}>
                                                {col.key === "number" && (
                                                    <Link href={`/dashboard/invoices/${invoice.id}`} className="text-blue-600 hover:underline font-medium">
                                                        <HighlightText text={`INV-${String(invoice.number).padStart(6, "0")}`} search={searchQuery} />
                                                    </Link>
                                                )}
                                                {col.key === "amount" && <span className="font-medium">{formatInvoiceCurrency(invoice.total)}</span>}
                                                {col.key === "tax" && <span>{formatInvoiceCurrency(invoice.taxTotal || 0)}</span>}
                                                {col.key === "date" && <span>{formatDate(invoice.date)}</span>}
                                                {col.key === "dueDate" && <span>{formatDate(invoice.dueDate)}</span>}
                                                {col.key === "status" && (
                                                    <Badge className={`${getStatusBadge(invoice.status)} font-normal`}>
                                                        <HighlightText text={formatStatus(invoice.status)} search={searchQuery} />
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        ))}
                                        <TableCell className={`${ROW_DENSITY_STYLES[rowDensity]} overflow-visible`}>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openViewWizard(invoice.id)}><Eye className="h-4 w-4 text-gray-500" /></Button></TooltipTrigger><TooltipContent>View</TooltipContent></Tooltip>
                                                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditWizard(invoice.id)}><Pencil className="h-4 w-4 text-gray-500" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Bottom Pagination */}
                {processedInvoices.length > 0 && (
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalRecords={processedInvoices.length} startRecord={startRecord} endRecord={endRecord} />
                )}

                {/* Invoice Wizard */}
                <InvoiceWizard
                    open={wizardOpen}
                    onOpenChange={setWizardOpen}
                    customerId={customerId || ""}
                    customerName={customer?.company}
                    invoiceId={wizardInvoiceId}
                    mode={wizardMode}
                    onSuccess={() => { }}
                />
            </div>
        </TooltipProvider>
    );
}
