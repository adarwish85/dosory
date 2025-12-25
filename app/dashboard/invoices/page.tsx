"use client";

import { useState, useMemo, useCallback, useRef, useEffect, KeyboardEvent } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Search, RefreshCw, Download, Trash2, ChevronDown, Columns, LayoutList,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Pencil, ExternalLink, Trash,
    DollarSign, FileText, Clock, CheckCircle2, AlertCircle
} from "lucide-react";
import { useInvoices } from "@/lib/hooks";
import type { InvoiceStatus } from "@/lib/types";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton-loaders";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem,
    DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { InvoiceHeader } from "@/components/dashboard/invoices/invoice-header";
import { InvoiceStats } from "@/components/dashboard/invoices/invoice-stats";
import { InvoiceActions } from "@/components/dashboard/invoices/invoice-actions";

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
    draft: "Draft", sent: "Sent", viewed: "Viewed", partial: "Partial",
    paid: "Paid", overdue: "Overdue", cancelled: "Cancelled",
};

type ColumnKey = "number" | "customer" | "date" | "dueDate" | "amount" | "status";
type RowDensity = "compact" | "comfortable" | "spacious";
type SelectionMode = "none" | "page" | "all";

interface ColumnDef { key: ColumnKey; label: string; defaultVisible: boolean; required?: boolean; }

const DEFAULT_COLUMNS: ColumnDef[] = [
    { key: "number", label: "Invoice #", defaultVisible: true, required: true },
    { key: "customer", label: "Customer", defaultVisible: true },
    { key: "date", label: "Date", defaultVisible: true },
    { key: "dueDate", label: "Due Date", defaultVisible: true },
    { key: "amount", label: "Amount", defaultVisible: true },
    { key: "status", label: "Status", defaultVisible: true },
];

const ROW_DENSITY_STYLES: Record<RowDensity, string> = {
    compact: "py-1 text-xs", comfortable: "py-2 text-sm", spacious: "py-4 text-sm"
};

function HighlightText({ text, search }: { text: string; search: string }) {
    if (!search.trim() || !text) return <>{text}</>;
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return <>{parts.map((part, i) => regex.test(part) ? <mark key={i} className="bg-yellow-200 px-0.5 rounded">{part}</mark> : <span key={i}>{part}</span>)}</>;
}

function QuickStatsBar({ invoices }: { invoices: any[] }) {
    const total = invoices.reduce((sum, i) => sum + (i.total || 0), 0);
    const paid = invoices.filter(i => i.status === "paid").reduce((sum, i) => sum + (i.total || 0), 0);
    const overdue = invoices.filter(i => i.status === "overdue").length;
    const draft = invoices.filter(i => i.status === "draft").length;
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-blue-600 mb-1"><FileText className="h-4 w-4" /><span className="text-xs font-medium uppercase">Total</span></div>
                <div className="text-2xl font-bold text-blue-900">{invoices.length}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-green-600 mb-1"><DollarSign className="h-4 w-4" /><span className="text-xs font-medium uppercase">Paid</span></div>
                <div className="text-2xl font-bold text-green-900">${paid.toLocaleString()}</div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-red-600 mb-1"><AlertCircle className="h-4 w-4" /><span className="text-xs font-medium uppercase">Overdue</span></div>
                <div className="text-2xl font-bold text-red-900">{overdue}</div>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-gray-600 mb-1"><Clock className="h-4 w-4" /><span className="text-xs font-medium uppercase">Draft</span></div>
                <div className="text-2xl font-bold text-gray-900">{draft}</div>
            </div>
        </div>
    );
}

function Pagination({ currentPage, totalPages, onPageChange, totalRecords, startRecord, endRecord, compact = false }: { currentPage: number; totalPages: number; onPageChange: (p: number) => void; totalRecords: number; startRecord: number; endRecord: number; compact?: boolean }) {
    const canPrev = currentPage > 1, canNext = currentPage < totalPages;
    return (
        <div className={`flex items-center ${compact ? 'gap-1' : 'justify-between gap-4'}`}>
            {!compact && <div className="text-sm text-gray-500">Showing {startRecord} to {endRecord} of {totalRecords}</div>}
            <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(1)} disabled={!canPrev}><ChevronsLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(currentPage - 1)} disabled={!canPrev}><ChevronLeft className="h-4 w-4" /></Button>
                <div className="flex items-center gap-1 px-2 text-sm"><span className="text-gray-700">Page</span><span className="font-medium">{currentPage}</span><span className="text-gray-700">of {totalPages}</span></div>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(currentPage + 1)} disabled={!canNext}><ChevronRight className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(totalPages)} disabled={!canNext}><ChevronsRight className="h-4 w-4" /></Button>
            </div>
        </div>
    );
}

function SelectionBanner({ selectionMode, selectedCount, totalCount, onSelectAll, onClearSelection }: { selectionMode: SelectionMode; selectedCount: number; totalCount: number; onSelectAll: () => void; onClearSelection: () => void }) {
    if (selectionMode === "none" || selectedCount === 0) return null;
    return (
        <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-2 flex items-center justify-center gap-2 text-sm mb-2">
            <span className="text-blue-800"><strong>{selectedCount}</strong> selected.</span>
            {selectionMode === "page" && selectedCount < totalCount && <button onClick={onSelectAll} className="text-blue-600 font-medium hover:underline">Select all {totalCount}</button>}
            <button onClick={onClearSelection} className="text-blue-600 font-medium hover:underline ml-2">Clear</button>
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
        DEFAULT_COLUMNS.forEach(col => { v[col.key] = col.defaultVisible; });
        return v as Record<ColumnKey, boolean>;
    });
    const [rowDensity, setRowDensity] = useState<RowDensity>("comfortable");
    const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
    const tableRef = useRef<HTMLDivElement>(null);

    const { invoices, loading, deleteInvoice } = useInvoices({ status: statusFilter });

    const filteredInvoices = useMemo(() => {
        return invoices.filter(invoice =>
            invoice.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            invoice.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [invoices, searchQuery]);

    const totalRecords = filteredInvoices.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + recordsPerPage, totalRecords);
    const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);
    const currentPageIds = paginatedInvoices.map(i => i.id);
    const allFilteredIds = filteredInvoices.map(i => i.id);
    const visibleColumns = DEFAULT_COLUMNS.filter(col => columnVisibility[col.key]);
    const visibleColumnsCount = visibleColumns.length;

    const formatDate = (timestamp: { toDate: () => Date } | null | undefined) => {
        if (!timestamp) return "-";
        try { return format(timestamp.toDate(), "dd/MM/yyyy"); } catch { return "-"; }
    };

    const formatCurrency = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

    const handleDelete = useCallback(async (id: string) => {
        if (window.confirm("Delete this invoice?")) await deleteInvoice(id);
    }, [deleteInvoice]);

    const handleBulkDelete = useCallback(async () => {
        if (selectedInvoices.length === 0) return;
        if (window.confirm(`Delete ${selectedInvoices.length} invoices?`)) {
            for (const id of selectedInvoices) await deleteInvoice(id);
            setSelectedInvoices([]); setSelectionMode("none");
        }
    }, [selectedInvoices, deleteInvoice]);

    const handleSelectAllOnPage = useCallback(() => { setSelectedInvoices(currentPageIds); setSelectionMode("page"); }, [currentPageIds]);
    const handleSelectAllRecords = useCallback(() => { setSelectedInvoices(allFilteredIds); setSelectionMode("all"); }, [allFilteredIds]);
    const handleClearSelection = useCallback(() => { setSelectedInvoices([]); setSelectionMode("none"); }, []);
    const handleSelectInvoice = useCallback((id: string, checked: boolean) => {
        if (checked) setSelectedInvoices(prev => [...prev, id]);
        else setSelectedInvoices(prev => prev.filter(i => i !== id));
    }, []);

    const isAllPageSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedInvoices.includes(id));
    const isSomeSelected = selectedInvoices.length > 0 && !isAllPageSelected;

    const toggleColumn = useCallback((key: ColumnKey) => {
        const col = DEFAULT_COLUMNS.find(c => c.key === key);
        if (col?.required) return;
        setColumnVisibility(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const exportInvoices = useCallback(() => {
        const headers = ["ID", "Number", "Customer", "Date", "Due Date", "Amount", "Status"];
        const rows = filteredInvoices.map(i => [i.id, i.number || "", i.customerName || "", formatDate(i.date), formatDate(i.dueDate), i.total || 0, i.status]);
        const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob); link.download = `invoices_export_${new Date().toISOString().split('T')[0]}.csv`; link.click();
    }, [filteredInvoices]);

    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
        if (paginatedInvoices.length === 0) return;
        switch (e.key) {
            case "ArrowDown": e.preventDefault(); setFocusedRowIndex(prev => prev === null ? 0 : Math.min(prev + 1, paginatedInvoices.length - 1)); break;
            case "ArrowUp": e.preventDefault(); setFocusedRowIndex(prev => prev === null ? 0 : Math.max(prev - 1, 0)); break;
            case " ": e.preventDefault(); if (focusedRowIndex !== null) { const i = paginatedInvoices[focusedRowIndex]; handleSelectInvoice(i.id, !selectedInvoices.includes(i.id)); } break;
        }
    }, [paginatedInvoices, focusedRowIndex, handleSelectInvoice, selectedInvoices]);

    useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter]);

    if (loading) return <div className="space-y-6"><h1 className="text-2xl font-bold">Invoices</h1><TableSkeleton rows={10} columns={7} /></div>;

    return (
        <TooltipProvider>
            <div className="space-y-6">
                <InvoiceHeader invoices={invoices} />
                <QuickStatsBar invoices={invoices} />

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Show</span>
                        <Select value={recordsPerPage.toString()} onValueChange={(v) => { setRecordsPerPage(parseInt(v)); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[70px] h-9"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem><SelectItem value="100">100</SelectItem></SelectContent>
                        </Select>
                        <Button variant="outline" onClick={exportInvoices}><Download className="mr-2 h-4 w-4" />Export</Button>
                        {selectedInvoices.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="outline" className="border-blue-200 bg-blue-50 text-blue-700"><Badge className="mr-2 bg-blue-600">{selectedInvoices.length}</Badge>Bulk <ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent><DropdownMenuLabel>With {selectedInvoices.length} selected</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem className="text-red-600" onClick={handleBulkDelete}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem></DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <Button variant="outline" size="icon" onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4" /></Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative w-full sm:w-64"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" /><Input placeholder="Search..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
                        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon"><LayoutList className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Density</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuRadioGroup value={rowDensity} onValueChange={(v) => setRowDensity(v as RowDensity)}><DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem><DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem><DropdownMenuRadioItem value="spacious">Spacious</DropdownMenuRadioItem></DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
                        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon"><Columns className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuLabel>Columns ({visibleColumnsCount}/{DEFAULT_COLUMNS.length})</DropdownMenuLabel><DropdownMenuSeparator />{DEFAULT_COLUMNS.map((col) => <DropdownMenuCheckboxItem key={col.key} checked={columnVisibility[col.key]} onCheckedChange={() => toggleColumn(col.key)} disabled={col.required}>{col.label}</DropdownMenuCheckboxItem>)}</DropdownMenuContent></DropdownMenu>
                    </div>
                </div>

                <SelectionBanner selectionMode={selectionMode} selectedCount={selectedInvoices.length} totalCount={totalRecords} onSelectAll={handleSelectAllRecords} onClearSelection={handleClearSelection} />
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalRecords={totalRecords} startRecord={totalRecords === 0 ? 0 : startIndex + 1} endRecord={endIndex} />

                {/* Table */}
                <div ref={tableRef} tabIndex={0} onKeyDown={handleKeyDown} className="border rounded-md bg-white overflow-x-auto focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                <TableHead className="w-[40px]"><Checkbox checked={isAllPageSelected} ref={(el) => { if (el) (el as any).indeterminate = isSomeSelected; }} onCheckedChange={(c) => c ? handleSelectAllOnPage() : handleClearSelection()} /></TableHead>
                                {columnVisibility.number && <TableHead className="font-semibold text-gray-900">Invoice #</TableHead>}
                                {columnVisibility.customer && <TableHead className="font-semibold text-gray-900">Customer</TableHead>}
                                {columnVisibility.date && <TableHead>Date</TableHead>}
                                {columnVisibility.dueDate && <TableHead>Due Date</TableHead>}
                                {columnVisibility.amount && <TableHead>Amount</TableHead>}
                                {columnVisibility.status && <TableHead>Status</TableHead>}
                                <TableHead className="w-24 text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedInvoices.length === 0 ? (
                                <TableRow><TableCell colSpan={visibleColumnsCount + 2} className="text-center py-10 text-muted-foreground">{searchQuery ? "No matches" : "No invoices"}</TableCell></TableRow>
                            ) : (
                                paginatedInvoices.map((invoice, index) => {
                                    const colors = statusColors[invoice.status];
                                    return (
                                        <TableRow key={invoice.id} className={`group hover:bg-gray-50 ${selectedInvoices.includes(invoice.id) ? 'bg-blue-50/50' : ''} ${focusedRowIndex === index ? 'ring-2 ring-inset ring-blue-500' : ''} ${ROW_DENSITY_STYLES[rowDensity]}`}>
                                            <TableCell><Checkbox checked={selectedInvoices.includes(invoice.id)} onCheckedChange={(c) => handleSelectInvoice(invoice.id, !!c)} /></TableCell>
                                            {columnVisibility.number && <TableCell className="font-medium"><Link href={`/dashboard/invoices/${invoice.id}`} className="text-blue-600 hover:underline"><HighlightText text={invoice.number || "-"} search={searchQuery} /></Link></TableCell>}
                                            {columnVisibility.customer && <TableCell className="text-gray-700"><HighlightText text={invoice.customerName || "-"} search={searchQuery} /></TableCell>}
                                            {columnVisibility.date && <TableCell className="text-gray-500">{formatDate(invoice.date)}</TableCell>}
                                            {columnVisibility.dueDate && <TableCell className="text-gray-500">{formatDate(invoice.dueDate)}</TableCell>}
                                            {columnVisibility.amount && <TableCell className="font-medium text-gray-900">{formatCurrency(invoice.total || 0)}</TableCell>}
                                            {columnVisibility.status && <TableCell><Badge className={`${colors.bg} ${colors.text} ${colors.border} border shadow-none font-medium`}>{statusLabels[invoice.status]}</Badge></TableCell>}
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Tooltip><TooltipTrigger asChild><Link href={`/dashboard/invoices/${invoice.id}`}><Button variant="ghost" size="icon" className="h-7 w-7"><ExternalLink className="h-3.5 w-3.5" /></Button></Link></TooltipTrigger><TooltipContent>View</TooltipContent></Tooltip>
                                                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(invoice.id)}><Trash className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex items-center justify-between"><div className="text-sm text-gray-600 font-medium">Total: {totalRecords}</div><Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalRecords={totalRecords} startRecord={totalRecords === 0 ? 0 : startIndex + 1} endRecord={endIndex} compact /></div>
                <div className="text-xs text-gray-400 text-center">↑↓ Navigate • Space Select • Click to view</div>
            </div>
        </TooltipProvider>
    );
}
