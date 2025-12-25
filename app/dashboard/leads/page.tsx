"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, RefreshCw, Upload, Download, Trash2, ChevronDown, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
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
} from "@/components/ui/dropdown-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

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

// Pagination Component
function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    totalRecords,
    startRecord,
    endRecord,
    compact = false
}: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalRecords: number;
    startRecord: number;
    endRecord: number;
    compact?: boolean;
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
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(1)}
                    disabled={!canGoPrevious}
                >
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={!canGoPrevious}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1 px-2">
                    <span className="text-sm text-gray-700">Page</span>
                    <span className="text-sm font-medium">{currentPage}</span>
                    <span className="text-sm text-gray-700">of {totalPages}</span>
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={!canGoNext}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(totalPages)}
                    disabled={!canGoNext}
                >
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

export default function LeadsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    const [showImportWizard, setShowImportWizard] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage, setRecordsPerPage] = useState(10);

    // Dialog state
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    const { leads, loading, leadStats, deleteLead, updateLead } = useLeads({ status: statusFilter });

    // Filter leads based on search
    const filteredLeads = useMemo(() => {
        return leads.filter(lead =>
            lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.email?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [leads, searchQuery]);

    // Pagination calculations
    const totalRecords = filteredLeads.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + recordsPerPage, totalRecords);
    const startRecord = totalRecords === 0 ? 0 : startIndex + 1;
    const endRecord = endIndex;

    // Paginated leads
    const paginatedLeads = useMemo(() => {
        return filteredLeads.slice(startIndex, endIndex);
    }, [filteredLeads, startIndex, endIndex]);

    // Reset to page 1 when filters change
    const handleRecordsPerPageChange = useCallback((value: string) => {
        setRecordsPerPage(parseInt(value));
        setCurrentPage(1);
    }, []);

    // Checkbox handlers
    const handleSelectAll = useCallback((checked: boolean) => {
        if (checked) {
            setSelectedLeads(paginatedLeads.map(l => l.id));
        } else {
            setSelectedLeads([]);
        }
    }, [paginatedLeads]);

    const handleSelectLead = useCallback((leadId: string, checked: boolean) => {
        if (checked) {
            setSelectedLeads(prev => [...prev, leadId]);
        } else {
            setSelectedLeads(prev => prev.filter(id => id !== leadId));
        }
    }, []);

    const handleView = useCallback((lead: Lead) => {
        setSelectedLead(lead);
        setDetailsOpen(true);
    }, []);

    const handleEdit = useCallback((lead: Lead) => {
        setSelectedLead(lead);
        setEditOpen(true);
    }, []);

    const handleDelete = useCallback(async (id: string) => {
        if (window.confirm("Are you sure you want to delete this lead?")) {
            await deleteLead(id);
        }
    }, [deleteLead]);

    const handleBulkDelete = useCallback(async () => {
        if (selectedLeads.length === 0) return;
        if (window.confirm(`Delete ${selectedLeads.length} selected leads?`)) {
            for (const id of selectedLeads) {
                await deleteLead(id);
            }
            setSelectedLeads([]);
        }
    }, [selectedLeads, deleteLead]);

    const handleSaveLead = useCallback(async (id: string, data: Partial<Lead>) => {
        await updateLead(id, data as any);
        if (selectedLead && selectedLead.id === id) {
            setSelectedLead({ ...selectedLead, ...data } as Lead);
        }
    }, [updateLead, selectedLead]);

    const handleStatusChange = useCallback(async (leadId: string, newStatus: LeadStatus) => {
        await updateLead(leadId, { status: newStatus });
    }, [updateLead]);

    const clearFilters = useCallback(() => {
        setStatusFilter("all");
        setSearchQuery("");
        setCurrentPage(1);
    }, []);

    const hasActiveFilters = statusFilter !== "all";

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex justify-between">
                    <h1 className="text-2xl font-bold">Leads</h1>
                </div>
                <TableSkeleton rows={10} columns={6} />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Single Compact Header Row */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* Left: Primary Actions */}
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/leads/new">
                        <Button className="bg-gray-900 text-white hover:bg-gray-800">
                            <Plus className="mr-2 h-4 w-4" /> New Lead
                        </Button>
                    </Link>

                    {/* Actions Dropdown (Import/Export) */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                Actions <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => setShowImportWizard(true)}>
                                <Upload className="mr-2 h-4 w-4" /> Import Leads
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" /> Export Leads
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Bulk Actions - Only show when items selected */}
                    {selectedLeads.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                                    <Badge className="mr-2 bg-blue-600">{selectedLeads.length}</Badge>
                                    Bulk Actions <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuLabel>With {selectedLeads.length} selected</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600" onClick={handleBulkDelete}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    {/* Records per page */}
                    <div className="flex items-center gap-2 ml-4 border-l pl-4">
                        <span className="text-sm text-gray-500">Show</span>
                        <Select value={recordsPerPage.toString()} onValueChange={handleRecordsPerPageChange}>
                            <SelectTrigger className="w-[70px] h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="30">30</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                        <span className="text-sm text-gray-500">per page</span>
                    </div>
                </div>

                {/* Right: Search + Filters */}
                <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
                    {/* Search */}
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search leads..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>

                    {/* Filters Popover */}
                    <Popover open={showFilters} onOpenChange={setShowFilters}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={hasActiveFilters ? "border-blue-500 text-blue-600" : ""}>
                                <Filter className="mr-2 h-4 w-4" />
                                Filters
                                {hasActiveFilters && (
                                    <Badge className="ml-2 bg-blue-600 text-white h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">1</Badge>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-80">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium">Filters</h4>
                                    {hasActiveFilters && (
                                        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-gray-500">
                                            Clear all
                                        </Button>
                                    )}
                                </div>

                                {/* Status Filter */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Status</label>
                                    <Select value={statusFilter} onValueChange={(v) => {
                                        setStatusFilter(v as LeadStatus | "all");
                                        setCurrentPage(1);
                                    }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All statuses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All statuses</SelectItem>
                                            {LEAD_STATUSES.map((status) => (
                                                <SelectItem key={status.value} value={status.value}>
                                                    <div className="flex items-center gap-2">
                                                        <span>{status.label}</span>
                                                        {leadStats[status.value] !== undefined && (
                                                            <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                                                {leadStats[status.value]}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Refresh */}
                    <Button variant="outline" size="icon" onClick={() => window.location.reload()}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Filtering by:</span>
                    <Badge variant="secondary" className="flex items-center gap-1">
                        Status: {statusFilter}
                        <button onClick={() => { setStatusFilter("all"); setCurrentPage(1); }} className="ml-1 hover:text-red-500">
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                </div>
            )}

            {/* Pagination - Top */}
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalRecords={totalRecords}
                startRecord={startRecord}
                endRecord={endRecord}
            />

            {/* Table */}
            <div className="border rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="w-12 text-center bg-gray-100/50">
                                <Checkbox
                                    checked={selectedLeads.length === paginatedLeads.length && paginatedLeads.length > 0}
                                    onCheckedChange={handleSelectAll}
                                />
                            </TableHead>
                            <TableHead className="w-10 text-gray-900 font-semibold bg-gray-100/50">#</TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Name</TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Company</TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Email</TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Phone</TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Value</TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Status</TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Source</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedLeads.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                                    {searchQuery ? "No leads match your search." : "No leads found. Create your first one!"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedLeads.map((lead) => (
                                <TableRow key={lead.id} className="group hover:bg-gray-50">
                                    <TableCell className="text-center">
                                        <Checkbox
                                            checked={selectedLeads.includes(lead.id)}
                                            onCheckedChange={(checked) => handleSelectLead(lead.id, !!checked)}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-500">{lead.id.substring(0, 4)}</TableCell>
                                    <TableCell className="text-gray-900 font-medium">
                                        <div className="flex flex-col">
                                            <span
                                                className="cursor-pointer hover:text-blue-600"
                                                onClick={() => handleView(lead)}
                                            >
                                                {lead.name}
                                            </span>
                                            <div className="hidden group-hover:flex items-center gap-1 text-xs text-gray-500 mt-1">
                                                <button className="hover:text-blue-600 hover:underline" onClick={() => handleView(lead)}>View</button>
                                                <span>|</span>
                                                <button className="hover:text-blue-600 hover:underline" onClick={() => handleEdit(lead)}>Edit</button>
                                                <span>|</span>
                                                <button className="hover:text-red-600 hover:underline" onClick={() => handleDelete(lead.id)}>Delete</button>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-500">{lead.company || "-"}</TableCell>
                                    <TableCell className="text-gray-500">{lead.email || "-"}</TableCell>
                                    <TableCell className="text-gray-500">{lead.phone || "-"}</TableCell>
                                    <TableCell className="text-gray-900">{lead.value ? `$${lead.value.toLocaleString()}` : "-"}</TableCell>
                                    <TableCell>
                                        <Select
                                            value={lead.status}
                                            onValueChange={(value) => handleStatusChange(lead.id, value as LeadStatus)}
                                        >
                                            <SelectTrigger className="h-7 text-xs font-normal w-[120px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {LEAD_STATUSES.map((status) => (
                                                    <SelectItem key={status.value} value={status.value}>
                                                        {status.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="text-gray-500">{lead.source || "-"}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination - Bottom with total counter */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 font-medium">
                    Total: {totalRecords} record{totalRecords !== 1 ? 's' : ''}
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalRecords={totalRecords}
                    startRecord={startRecord}
                    endRecord={endRecord}
                    compact
                />
            </div>

            {/* Import Wizard */}
            <ImportWizard
                open={showImportWizard}
                onClose={() => setShowImportWizard(false)}
                module="leads"
                onSuccess={(count) => console.log(`Imported ${count} leads`)}
            />

            <LeadDetailsDialog
                open={detailsOpen}
                onClose={() => setDetailsOpen(false)}
                lead={selectedLead}
                onEdit={() => {
                    setDetailsOpen(false);
                    setEditOpen(true);
                }}
            />

            <LeadEditDialog
                open={editOpen}
                onClose={() => setEditOpen(false)}
                lead={selectedLead}
                onSave={handleSaveLead as any}
            />
        </div>
    );
}
