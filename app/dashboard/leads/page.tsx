"use client";

import { useState, useMemo, useCallback, useRef, useEffect, KeyboardEvent } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
    Plus, Search, Filter, RefreshCw, Upload, Download, Trash2, ChevronDown, X,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CheckSquare, Columns,
    Eye, EyeOff, ArrowUpDown, ArrowUp, ArrowDown, Pencil, Trash, ExternalLink,
    LayoutList, AlignJustify, Menu, DollarSign, Users, TrendingUp
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useLeads } from "@/lib/hooks";
import type { Lead, LeadStatus } from "@/lib/types";
import Link from "next/link";
import { TableSkeleton } from "@/components/ui/skeleton-loaders";
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// Dynamic imports for better code splitting
const ImportWizard = dynamic(() => import("@/components/import/ImportWizard"), {
    loading: () => <div className="text-sm text-gray-500">Loading...</div>,
    ssr: false,
});

const LeadDetailsDialog = dynamic(
    () => import("@/components/dashboard/leads/lead-details-dialog").then(mod => ({ default: mod.LeadDetailsSheet })),
    { ssr: false }
);

const LeadEditDialog = dynamic(
    () => import("@/components/dashboard/leads/lead-edit-dialog").then(mod => ({ default: mod.LeadEditSheet })),
    { ssr: false }
);

import { LEAD_STATUSES, STATUS_COLORS } from "@/lib/constants";

// Types
type SelectionMode = "none" | "page" | "all";
type SortDirection = "asc" | "desc" | null;
type RowDensity = "compact" | "comfortable" | "spacious";
type ColumnKey = "id" | "name" | "company" | "email" | "phone" | "value" | "status" | "source";

interface ColumnDef {
    key: ColumnKey;
    label: string;
    defaultVisible: boolean;
    required?: boolean;
    sortable?: boolean;
    width?: string;
}

interface FilterCondition {
    field: ColumnKey | "status";
    operator: "contains" | "equals" | "startsWith" | "isEmpty" | "isNotEmpty";
    value: string;
}

const COLUMNS: ColumnDef[] = [
    { key: "id", label: "#", defaultVisible: true, width: "w-16" },
    { key: "name", label: "Name", defaultVisible: true, required: true, sortable: true },
    { key: "company", label: "Company", defaultVisible: true, sortable: true },
    { key: "email", label: "Email", defaultVisible: true, sortable: true },
    { key: "phone", label: "Phone", defaultVisible: true },
    { key: "value", label: "Value", defaultVisible: true, sortable: true },
    { key: "status", label: "Status", defaultVisible: true, sortable: true },
    { key: "source", label: "Source", defaultVisible: true, sortable: true },
];

const ROW_DENSITY_STYLES: Record<RowDensity, string> = {
    compact: "py-1 text-xs",
    comfortable: "py-2 text-sm",
    spacious: "py-4 text-sm",
};

const getDefaultVisibleColumns = (): Record<ColumnKey, boolean> => {
    const visibility: Record<string, boolean> = {};
    COLUMNS.forEach(col => { visibility[col.key] = col.defaultVisible; });
    return visibility as Record<ColumnKey, boolean>;
};

// Highlight search matches
function HighlightText({ text, search }: { text: string; search: string }) {
    if (!search.trim() || !text) return <>{text}</>;
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
        <>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <mark key={i} className="bg-yellow-200 px-0.5 rounded">{part}</mark>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </>
    );
}

// Quick Stats Bar
function QuickStatsBar({ leads, totalValue }: { leads: Lead[]; totalValue: number }) {
    const avgValue = leads.length > 0 ? totalValue / leads.length : 0;
    const newCount = leads.filter(l => l.status === "new").length;
    const qualifiedCount = leads.filter(l => l.status === "qualified").length;
    const conversionRate = leads.length > 0 ? ((qualifiedCount / leads.length) * 100).toFixed(1) : "0";

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Total Leads</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">{leads.length}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Total Value</span>
                </div>
                <div className="text-2xl font-bold text-green-900">${totalValue.toLocaleString()}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-purple-600 mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Avg Value</span>
                </div>
                <div className="text-2xl font-bold text-purple-900">${avgValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-amber-600 mb-1">
                    <CheckSquare className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Qualified</span>
                </div>
                <div className="text-2xl font-bold text-amber-900">{qualifiedCount} <span className="text-sm font-normal">({conversionRate}%)</span></div>
            </div>
        </div>
    );
}

// Sortable Column Header
function SortableHeader({
    column,
    sortKey,
    sortDirection,
    onSort,
    className
}: {
    column: ColumnDef;
    sortKey: ColumnKey | null;
    sortDirection: SortDirection;
    onSort: (key: ColumnKey) => void;
    className?: string;
}) {
    const isActive = sortKey === column.key;

    if (!column.sortable) {
        return <span>{column.label}</span>;
    }

    return (
        <button
            onClick={() => onSort(column.key)}
            className={`flex items-center gap-1 hover:text-blue-600 transition-colors ${className || ''}`}
        >
            {column.label}
            {isActive ? (
                sortDirection === "asc" ? (
                    <ArrowUp className="h-3 w-3" />
                ) : (
                    <ArrowDown className="h-3 w-3" />
                )
            ) : (
                <ArrowUpDown className="h-3 w-3 opacity-30" />
            )}
        </button>
    );
}

// Selection Banner
function SelectionBanner({
    selectionMode,
    selectedCount,
    pageCount,
    totalCount,
    onSelectAll,
    onClearSelection,
}: {
    selectionMode: SelectionMode;
    selectedCount: number;
    pageCount: number;
    totalCount: number;
    onSelectAll: () => void;
    onClearSelection: () => void;
}) {
    if (selectionMode === "none" || selectedCount === 0) return null;

    return (
        <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-2 flex items-center justify-center gap-2 text-sm">
            <CheckSquare className="h-4 w-4 text-blue-600" />
            {selectionMode === "page" ? (
                <>
                    <span className="text-blue-800">
                        All <strong>{selectedCount}</strong> records on this page are selected.
                    </span>
                    {totalCount > pageCount && (
                        <button onClick={onSelectAll} className="text-blue-600 font-medium hover:underline">
                            Select all {totalCount} records in Leads
                        </button>
                    )}
                </>
            ) : (
                <>
                    <span className="text-blue-800">
                        All <strong>{totalCount}</strong> records in Leads are selected.
                    </span>
                    <button onClick={onClearSelection} className="text-blue-600 font-medium hover:underline">
                        Clear selection
                    </button>
                </>
            )}
        </div>
    );
}

// Pagination
function Pagination({
    currentPage, totalPages, onPageChange, totalRecords, startRecord, endRecord, compact = false
}: {
    currentPage: number; totalPages: number; onPageChange: (page: number) => void;
    totalRecords: number; startRecord: number; endRecord: number; compact?: boolean;
}) {
    const canGoPrevious = currentPage > 1;
    const canGoNext = currentPage < totalPages;

    return (
        <div className={`flex items-center ${compact ? 'gap-1' : 'justify-between gap-4'}`}>
            {!compact && (
                <div className="text-sm text-gray-500">
                    Showing {startRecord} to {endRecord} of {totalRecords} records
                </div>
            )}
            <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(1)} disabled={!canGoPrevious}>
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(currentPage - 1)} disabled={!canGoPrevious}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1 px-2">
                    <span className="text-sm text-gray-700">Page</span>
                    <span className="text-sm font-medium">{currentPage}</span>
                    <span className="text-sm text-gray-700">of {totalPages}</span>
                </div>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(currentPage + 1)} disabled={!canGoNext}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(totalPages)} disabled={!canGoNext}>
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

// Inline Edit Cell
function InlineEditCell({
    value,
    field,
    leadId,
    onSave,
    searchQuery,
}: {
    value: string;
    field: ColumnKey;
    leadId: string;
    onSave: (id: string, field: ColumnKey, value: string) => void;
    searchQuery: string;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (editValue !== value) {
            onSave(leadId, field, editValue);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleSave();
        } else if (e.key === "Escape") {
            setEditValue(value);
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <Input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className="h-7 text-sm"
            />
        );
    }

    return (
        <span
            onDoubleClick={() => setIsEditing(true)}
            className="cursor-text hover:bg-gray-100 px-1 py-0.5 rounded inline-block min-w-[20px]"
            title="Double-click to edit"
        >
            <HighlightText text={value || "-"} search={searchQuery} />
        </span>
    );
}

export default function LeadsPage() {
    // State
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    const [selectionMode, setSelectionMode] = useState<SelectionMode>("none");
    const [showImportWizard, setShowImportWizard] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage, setRecordsPerPage] = useState(10);
    const [columnVisibility, setColumnVisibility] = useState<Record<ColumnKey, boolean>>(getDefaultVisibleColumns);
    const [sortKey, setSortKey] = useState<ColumnKey | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [rowDensity, setRowDensity] = useState<RowDensity>("comfortable");
    const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);

    // Advanced filters
    const [advancedFilters, setAdvancedFilters] = useState<FilterCondition[]>([]);

    // Dialog state
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    const tableRef = useRef<HTMLDivElement>(null);
    const { leads, loading, leadStats, deleteLead, updateLead } = useLeads({ status: statusFilter });

    // Calculate total value
    const totalValue = useMemo(() => {
        return leads.reduce((sum, lead) => sum + (lead.value || 0), 0);
    }, [leads]);

    // Filter and sort leads
    const processedLeads = useMemo(() => {
        let result = leads.filter(lead =>
            lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.email?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Apply advanced filters
        advancedFilters.forEach(filter => {
            result = result.filter(lead => {
                const fieldValue = String(lead[filter.field as keyof Lead] || "").toLowerCase();
                const filterValue = filter.value.toLowerCase();

                switch (filter.operator) {
                    case "contains": return fieldValue.includes(filterValue);
                    case "equals": return fieldValue === filterValue;
                    case "startsWith": return fieldValue.startsWith(filterValue);
                    case "isEmpty": return !fieldValue;
                    case "isNotEmpty": return !!fieldValue;
                    default: return true;
                }
            });
        });

        // Sort
        if (sortKey && sortDirection) {
            result = [...result].sort((a, b) => {
                let aVal = a[sortKey as keyof Lead];
                let bVal = b[sortKey as keyof Lead];

                if (sortKey === "value") {
                    aVal = aVal || 0;
                    bVal = bVal || 0;
                    return sortDirection === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
                }

                aVal = String(aVal || "").toLowerCase();
                bVal = String(bVal || "").toLowerCase();
                return sortDirection === "asc"
                    ? (aVal as string).localeCompare(bVal as string)
                    : (bVal as string).localeCompare(aVal as string);
            });
        }

        return result;
    }, [leads, searchQuery, advancedFilters, sortKey, sortDirection]);

    // Pagination
    const totalRecords = processedLeads.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + recordsPerPage, totalRecords);
    const paginatedLeads = useMemo(() => processedLeads.slice(startIndex, endIndex), [processedLeads, startIndex, endIndex]);
    const currentPageIds = useMemo(() => paginatedLeads.map(l => l.id), [paginatedLeads]);
    const allFilteredIds = useMemo(() => processedLeads.map(l => l.id), [processedLeads]);
    const visibleColumnsCount = Object.values(columnVisibility).filter(Boolean).length;
    const totalVisibleColumns = 1 + visibleColumnsCount;

    // Sort handler
    const handleSort = useCallback((key: ColumnKey) => {
        if (sortKey === key) {
            if (sortDirection === "asc") setSortDirection("desc");
            else if (sortDirection === "desc") { setSortKey(null); setSortDirection(null); }
        } else {
            setSortKey(key);
            setSortDirection("asc");
        }
    }, [sortKey, sortDirection]);

    // Column handlers
    const toggleColumn = useCallback((columnKey: ColumnKey) => {
        const column = COLUMNS.find(c => c.key === columnKey);
        if (column?.required) return;
        setColumnVisibility(prev => ({ ...prev, [columnKey]: !prev[columnKey] }));
    }, []);

    const showAllColumns = useCallback(() => {
        const visibility: Record<string, boolean> = {};
        COLUMNS.forEach(col => { visibility[col.key] = true; });
        setColumnVisibility(visibility as Record<ColumnKey, boolean>);
    }, []);

    const resetColumns = useCallback(() => setColumnVisibility(getDefaultVisibleColumns()), []);

    // Selection handlers
    const handleSelectAllOnPage = useCallback(() => { setSelectedLeads(currentPageIds); setSelectionMode("page"); }, [currentPageIds]);
    const handleSelectAllRecords = useCallback(() => { setSelectedLeads(allFilteredIds); setSelectionMode("all"); }, [allFilteredIds]);
    const handleClearSelection = useCallback(() => { setSelectedLeads([]); setSelectionMode("none"); }, []);
    const handleSelectAllCheckbox = useCallback((checked: boolean) => { if (checked) handleSelectAllOnPage(); else handleClearSelection(); }, [handleSelectAllOnPage, handleClearSelection]);

    const handleSelectLead = useCallback((leadId: string, checked: boolean) => {
        if (checked) {
            setSelectedLeads(prev => [...prev, leadId]);
            if (selectedLeads.length + 1 === paginatedLeads.length) setSelectionMode("page");
        } else {
            setSelectedLeads(prev => prev.filter(id => id !== leadId));
            if (selectionMode === "all") setSelectionMode("page");
            if (selectedLeads.length - 1 === 0) setSelectionMode("none");
        }
    }, [selectedLeads.length, paginatedLeads.length, selectionMode]);

    const isAllPageSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedLeads.includes(id));
    const isSomeSelected = selectedLeads.length > 0 && !isAllPageSelected;

    // Action handlers
    const handleView = useCallback((lead: Lead) => { setSelectedLead(lead); setDetailsOpen(true); }, []);
    const handleEdit = useCallback((lead: Lead) => { setSelectedLead(lead); setEditOpen(true); }, []);
    const handleDelete = useCallback(async (id: string) => { if (window.confirm("Delete this lead?")) await deleteLead(id); }, [deleteLead]);

    const handleBulkDelete = useCallback(async () => {
        if (selectedLeads.length === 0) return;
        const count = selectionMode === "all" ? totalRecords : selectedLeads.length;
        if (window.confirm(`Delete ${count} selected leads?`)) {
            for (const id of selectedLeads) await deleteLead(id);
            handleClearSelection();
        }
    }, [selectedLeads, selectionMode, totalRecords, deleteLead, handleClearSelection]);

    const handleInlineEdit = useCallback(async (id: string, field: ColumnKey, value: string) => {
        await updateLead(id, { [field]: value } as any);
    }, [updateLead]);

    const handleSaveLead = useCallback(async (id: string, data: Partial<Lead>) => {
        await updateLead(id, data as any);
        if (selectedLead && selectedLead.id === id) setSelectedLead({ ...selectedLead, ...data } as Lead);
    }, [updateLead, selectedLead]);

    const handleStatusChange = useCallback(async (leadId: string, newStatus: LeadStatus) => {
        await updateLead(leadId, { status: newStatus });
    }, [updateLead]);

    const clearFilters = useCallback(() => {
        setStatusFilter("all");
        setSearchQuery("");
        setAdvancedFilters([]);
        setCurrentPage(1);
        handleClearSelection();
    }, [handleClearSelection]);

    // Keyboard navigation
    const handleTableKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
        if (paginatedLeads.length === 0) return;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setFocusedRowIndex(prev => prev === null ? 0 : Math.min(prev + 1, paginatedLeads.length - 1));
                break;
            case "ArrowUp":
                e.preventDefault();
                setFocusedRowIndex(prev => prev === null ? 0 : Math.max(prev - 1, 0));
                break;
            case "Enter":
                if (focusedRowIndex !== null) {
                    handleView(paginatedLeads[focusedRowIndex]);
                }
                break;
            case " ":
                e.preventDefault();
                if (focusedRowIndex !== null) {
                    const lead = paginatedLeads[focusedRowIndex];
                    handleSelectLead(lead.id, !selectedLeads.includes(lead.id));
                }
                break;
            case "Delete":
            case "Backspace":
                if (selectedLeads.length > 0 && e.target === tableRef.current) {
                    e.preventDefault();
                    handleBulkDelete();
                }
                break;
        }
    }, [paginatedLeads, focusedRowIndex, handleView, handleSelectLead, selectedLeads, handleBulkDelete]);

    const hasActiveFilters = statusFilter !== "all" || advancedFilters.length > 0;

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex justify-between"><h1 className="text-2xl font-bold">Leads</h1></div>
                <TableSkeleton rows={10} columns={6} />
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="space-y-4">
                {/* Quick Stats Bar */}
                <QuickStatsBar leads={processedLeads} totalValue={totalValue} />

                {/* Header Row */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Link href="/dashboard/leads/new">
                            <Button className="bg-gray-900 text-white hover:bg-gray-800">
                                <Plus className="mr-2 h-4 w-4" /> New Lead
                            </Button>
                        </Link>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">Actions <ChevronDown className="ml-2 h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={() => setShowImportWizard(true)}>
                                    <Upload className="mr-2 h-4 w-4" /> Import Leads
                                </DropdownMenuItem>
                                <DropdownMenuItem><Download className="mr-2 h-4 w-4" /> Export Leads</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {selectedLeads.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                                        <Badge className="mr-2 bg-blue-600">{selectionMode === "all" ? totalRecords : selectedLeads.length}</Badge>
                                        Bulk Actions <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    <DropdownMenuLabel>With {selectionMode === "all" ? totalRecords : selectedLeads.length} selected</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-red-600" onClick={handleBulkDelete}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        <div className="flex items-center gap-2 ml-4 border-l pl-4">
                            <span className="text-sm text-gray-500">Show</span>
                            <Select value={recordsPerPage.toString()} onValueChange={(v) => { setRecordsPerPage(parseInt(v)); setCurrentPage(1); }}>
                                <SelectTrigger className="w-[70px] h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="30">30</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-1 max-w-xl justify-end">
                        <div className="relative flex-1 max-w-xs">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search leads..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); handleClearSelection(); }}
                            />
                        </div>

                        {/* Row Density */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" title="Row density">
                                    <LayoutList className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Row Density</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuRadioGroup value={rowDensity} onValueChange={(v) => setRowDensity(v as RowDensity)}>
                                    <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="spacious">Spacious</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Columns */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" title="Manage columns"><Columns className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel className="flex items-center justify-between">
                                    <span>Columns</span>
                                    <span className="text-xs text-gray-400">{visibleColumnsCount}/{COLUMNS.length}</span>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {COLUMNS.map((col) => (
                                    <DropdownMenuCheckboxItem key={col.key} checked={columnVisibility[col.key]} onCheckedChange={() => toggleColumn(col.key)} disabled={col.required}>
                                        {col.label} {col.required && <span className="text-xs text-gray-400 ml-1">(required)</span>}
                                    </DropdownMenuCheckboxItem>
                                ))}
                                <DropdownMenuSeparator />
                                <div className="flex gap-1 p-1">
                                    <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={showAllColumns}>Show All</Button>
                                    <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={resetColumns}>Reset</Button>
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Filters */}
                        <Popover open={showFilters} onOpenChange={setShowFilters}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={hasActiveFilters ? "border-blue-500 text-blue-600" : ""}>
                                    <Filter className="mr-2 h-4 w-4" /> Filters
                                    {hasActiveFilters && <Badge className="ml-2 bg-blue-600 text-white h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">{1 + advancedFilters.length}</Badge>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-80">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium">Filters</h4>
                                        {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-gray-500">Clear all</Button>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Status</label>
                                        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as LeadStatus | "all"); setCurrentPage(1); handleClearSelection(); }}>
                                            <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All statuses</SelectItem>
                                                {LEAD_STATUSES.map((s) => (
                                                    <SelectItem key={s.value} value={s.value}>
                                                        <div className="flex items-center gap-2">
                                                            <span>{s.label}</span>
                                                            {leadStats[s.value] !== undefined && <Badge variant="secondary" className="text-[10px] h-4 px-1">{leadStats[s.value]}</Badge>}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>

                        <Button variant="outline" size="icon" onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4" /></Button>
                    </div>
                </div>

                {/* Active Filters */}
                {hasActiveFilters && (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Active filters:</span>
                        {statusFilter !== "all" && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                                Status: {statusFilter}
                                <button onClick={() => { setStatusFilter("all"); setCurrentPage(1); }} className="ml-1 hover:text-red-500"><X className="h-3 w-3" /></button>
                            </Badge>
                        )}
                    </div>
                )}

                {/* Selection Banner */}
                <SelectionBanner selectionMode={selectionMode} selectedCount={selectedLeads.length} pageCount={paginatedLeads.length} totalCount={totalRecords} onSelectAll={handleSelectAllRecords} onClearSelection={handleClearSelection} />

                {/* Pagination - Top */}
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalRecords={totalRecords} startRecord={totalRecords === 0 ? 0 : startIndex + 1} endRecord={endIndex} />

                {/* Table */}
                <div
                    ref={tableRef}
                    tabIndex={0}
                    onKeyDown={handleTableKeyDown}
                    className="border rounded-md bg-white overflow-x-auto focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                <TableHead className="w-12 text-center bg-gray-100/50 sticky left-0 z-10">
                                    <Checkbox checked={isAllPageSelected} ref={(el) => { if (el) (el as any).indeterminate = isSomeSelected; }} onCheckedChange={handleSelectAllCheckbox} />
                                </TableHead>
                                {columnVisibility.id && <TableHead className="w-16 text-gray-900 font-semibold bg-gray-100/50">#</TableHead>}
                                {columnVisibility.name && (
                                    <TableHead className="font-semibold text-gray-900 bg-gray-100/50 sticky left-12 z-10">
                                        <SortableHeader column={COLUMNS[1]} sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                                    </TableHead>
                                )}
                                {columnVisibility.company && <TableHead className="font-semibold text-gray-900 bg-gray-100/50"><SortableHeader column={COLUMNS[2]} sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} /></TableHead>}
                                {columnVisibility.email && <TableHead className="font-semibold text-gray-900 bg-gray-100/50"><SortableHeader column={COLUMNS[3]} sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} /></TableHead>}
                                {columnVisibility.phone && <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Phone</TableHead>}
                                {columnVisibility.value && <TableHead className="font-semibold text-gray-900 bg-gray-100/50"><SortableHeader column={COLUMNS[5]} sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} /></TableHead>}
                                {columnVisibility.status && <TableHead className="font-semibold text-gray-900 bg-gray-100/50"><SortableHeader column={COLUMNS[6]} sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} /></TableHead>}
                                {columnVisibility.source && <TableHead className="font-semibold text-gray-900 bg-gray-100/50"><SortableHeader column={COLUMNS[7]} sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} /></TableHead>}
                                <TableHead className="w-24 text-gray-900 font-semibold bg-gray-100/50 text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedLeads.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={totalVisibleColumns + 1} className="text-center py-10 text-muted-foreground">
                                        {searchQuery ? "No leads match your search." : "No leads found. Create your first one!"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedLeads.map((lead, index) => (
                                    <TableRow
                                        key={lead.id}
                                        className={`group hover:bg-gray-50 ${selectedLeads.includes(lead.id) ? 'bg-blue-50/50' : ''} ${focusedRowIndex === index ? 'ring-2 ring-inset ring-blue-500' : ''} ${ROW_DENSITY_STYLES[rowDensity]}`}
                                    >
                                        <TableCell className="text-center sticky left-0 z-10 bg-white group-hover:bg-gray-50">
                                            <Checkbox checked={selectedLeads.includes(lead.id)} onCheckedChange={(checked) => handleSelectLead(lead.id, !!checked)} />
                                        </TableCell>
                                        {columnVisibility.id && <TableCell className="font-medium text-gray-500">{lead.id.substring(0, 4)}</TableCell>}
                                        {columnVisibility.name && (
                                            <TableCell className="text-gray-900 font-medium sticky left-12 z-10 bg-white group-hover:bg-gray-50">
                                                <InlineEditCell value={lead.name || ""} field="name" leadId={lead.id} onSave={handleInlineEdit} searchQuery={searchQuery} />
                                            </TableCell>
                                        )}
                                        {columnVisibility.company && <TableCell className="text-gray-500"><InlineEditCell value={lead.company || ""} field="company" leadId={lead.id} onSave={handleInlineEdit} searchQuery={searchQuery} /></TableCell>}
                                        {columnVisibility.email && <TableCell className="text-gray-500"><InlineEditCell value={lead.email || ""} field="email" leadId={lead.id} onSave={handleInlineEdit} searchQuery={searchQuery} /></TableCell>}
                                        {columnVisibility.phone && <TableCell className="text-gray-500"><InlineEditCell value={lead.phone || ""} field="phone" leadId={lead.id} onSave={handleInlineEdit} searchQuery={searchQuery} /></TableCell>}
                                        {columnVisibility.value && <TableCell className="text-gray-900">{lead.value ? `$${lead.value.toLocaleString()}` : "-"}</TableCell>}
                                        {columnVisibility.status && (
                                            <TableCell>
                                                <Select value={lead.status} onValueChange={(v) => handleStatusChange(lead.id, v as LeadStatus)}>
                                                    <SelectTrigger className="h-7 text-xs font-normal w-[110px]"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        {LEAD_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                        )}
                                        {columnVisibility.source && <TableCell className="text-gray-500">{lead.source || "-"}</TableCell>}
                                        <TableCell>
                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleView(lead)}>
                                                            <ExternalLink className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>View</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(lead)}>
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Edit</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(lead.id)}>
                                                            <Trash className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Delete</TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination - Bottom */}
                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 font-medium">Total: {totalRecords} record{totalRecords !== 1 ? 's' : ''}</div>
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalRecords={totalRecords} startRecord={totalRecords === 0 ? 0 : startIndex + 1} endRecord={endIndex} compact />
                </div>

                {/* Keyboard Shortcuts Help */}
                <div className="text-xs text-gray-400 text-center">
                    <span className="px-1">↑↓ Navigate</span> • <span className="px-1">Enter View</span> • <span className="px-1">Space Select</span> • <span className="px-1">Double-click Edit</span>
                </div>

                {/* Dialogs */}
                <ImportWizard open={showImportWizard} onClose={() => setShowImportWizard(false)} module="leads" onSuccess={(count) => console.log(`Imported ${count} leads`)} />
                <LeadDetailsDialog open={detailsOpen} onClose={() => setDetailsOpen(false)} lead={selectedLead} onEdit={() => { setDetailsOpen(false); setEditOpen(true); }} />
                <LeadEditDialog open={editOpen} onClose={() => setEditOpen(false)} lead={selectedLead} onSave={handleSaveLead as any} />
            </div>
        </TooltipProvider>
    );
}
