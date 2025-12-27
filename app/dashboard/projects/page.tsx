"use client";

import { useState, useMemo, useCallback, useRef, useEffect, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Plus, Search, Filter, RefreshCw, AlignJustify, Download, Trash2, ChevronDown, Columns, LayoutList,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Pencil, ExternalLink, Trash,
    FolderKanban, Clock, CheckCircle2, PauseCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useProjects } from "@/lib/hooks";
import type { ProjectStatus } from "@/lib/types";
import { format } from "date-fns";
import Link from "next/link";
import { TableSkeleton } from "@/components/ui/skeleton-loaders";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem,
    DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const statusColors: Record<ProjectStatus, { bg: string; text: string; border: string }> = {
    not_started: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
    in_progress: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
    on_hold: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200" },
    cancelled: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
    finished: { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
};

const statusLabels: Record<ProjectStatus, string> = {
    not_started: "Not Started", in_progress: "In Progress", on_hold: "On Hold",
    cancelled: "Cancelled", finished: "Finished",
};

type ColumnKey = "name" | "customer" | "status" | "progress" | "startDate" | "deadline";
type RowDensity = "compact" | "comfortable" | "spacious";
type SelectionMode = "none" | "page" | "all";

interface ColumnDef { key: ColumnKey; label: string; defaultVisible: boolean; required?: boolean; }

const DEFAULT_COLUMNS: ColumnDef[] = [
    { key: "name", label: "Name", defaultVisible: true, required: true },
    { key: "customer", label: "Customer", defaultVisible: true },
    { key: "status", label: "Status", defaultVisible: true },
    { key: "progress", label: "Progress", defaultVisible: true },
    { key: "startDate", label: "Start Date", defaultVisible: true },
    { key: "deadline", label: "Deadline", defaultVisible: true },
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

function QuickStatsBar({ projects, stats }: { projects: any[]; stats: Record<string, number> }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-blue-600 mb-1"><FolderKanban className="h-4 w-4" /><span className="text-xs font-medium uppercase">Total</span></div>
                <div className="text-2xl font-bold text-blue-900">{projects.length}</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-yellow-600 mb-1"><Clock className="h-4 w-4" /><span className="text-xs font-medium uppercase">In Progress</span></div>
                <div className="text-2xl font-bold text-yellow-900">{stats.in_progress || 0}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-green-600 mb-1"><CheckCircle2 className="h-4 w-4" /><span className="text-xs font-medium uppercase">Finished</span></div>
                <div className="text-2xl font-bold text-green-900">{stats.finished || 0}</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-orange-600 mb-1"><PauseCircle className="h-4 w-4" /><span className="text-xs font-medium uppercase">On Hold</span></div>
                <div className="text-2xl font-bold text-orange-900">{stats.on_hold || 0}</div>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-gray-600 mb-1"><FolderKanban className="h-4 w-4" /><span className="text-xs font-medium uppercase">Avg Progress</span></div>
                <div className="text-2xl font-bold text-gray-900">{projects.length > 0 ? Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / projects.length) : 0}%</div>
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
                <div className="flex items-center gap-1 px-2 text-sm"><span className="font-medium">{currentPage}</span><span className="text-gray-700">of {totalPages}</span></div>
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

export default function ProjectsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
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

    const { projects, loading, projectStats, deleteProject } = useProjects({ status: statusFilter });

    const filteredProjects = useMemo(() => {
        return projects.filter(project =>
            (project.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (project.customerName || "").toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [projects, searchQuery]);

    const totalRecords = filteredProjects.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + recordsPerPage, totalRecords);
    const paginatedProjects = filteredProjects.slice(startIndex, endIndex);
    const currentPageIds = paginatedProjects.map(p => p.id);
    const allFilteredIds = filteredProjects.map(p => p.id);
    const visibleColumns = DEFAULT_COLUMNS.filter(col => columnVisibility[col.key]);
    const visibleColumnsCount = visibleColumns.length;

    const formatDate = (timestamp: { toDate: () => Date } | null | undefined) => {
        if (!timestamp) return "-";
        try { return format(timestamp.toDate(), "dd/MM/yyyy"); } catch { return "-"; }
    };

    const handleDelete = useCallback(async (id: string) => { if (window.confirm("Delete this project?")) await deleteProject(id); }, [deleteProject]);

    const handleBulkDelete = useCallback(async () => {
        if (selectedProjects.length === 0) return;
        if (window.confirm(`Delete ${selectedProjects.length} projects?`)) {
            for (const id of selectedProjects) await deleteProject(id);
            setSelectedProjects([]); setSelectionMode("none");
        }
    }, [selectedProjects, deleteProject]);

    const handleSelectAllOnPage = useCallback(() => { setSelectedProjects(currentPageIds); setSelectionMode("page"); }, [currentPageIds]);
    const handleSelectAllRecords = useCallback(() => { setSelectedProjects(allFilteredIds); setSelectionMode("all"); }, [allFilteredIds]);
    const handleClearSelection = useCallback(() => { setSelectedProjects([]); setSelectionMode("none"); }, []);
    const handleSelectProject = useCallback((id: string, checked: boolean) => {
        if (checked) setSelectedProjects(prev => [...prev, id]);
        else setSelectedProjects(prev => prev.filter(i => i !== id));
    }, []);

    const isAllPageSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedProjects.includes(id));
    const isSomeSelected = selectedProjects.length > 0 && !isAllPageSelected;

    const toggleColumn = useCallback((key: ColumnKey) => {
        const col = DEFAULT_COLUMNS.find(c => c.key === key);
        if (col?.required) return;
        setColumnVisibility(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const exportProjects = useCallback(() => {
        const headers = ["ID", "Name", "Customer", "Status", "Progress", "Start Date", "Deadline"];
        const rows = filteredProjects.map(p => [p.id, p.name || "", p.customerName || "", p.status, p.progress || 0, formatDate(p.startDate), formatDate(p.deadline)]);
        const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `projects_export_${new Date().toISOString().split('T')[0]}.csv`; link.click();
    }, [filteredProjects]);

    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
        if (paginatedProjects.length === 0) return;
        switch (e.key) {
            case "ArrowDown": e.preventDefault(); setFocusedRowIndex(prev => prev === null ? 0 : Math.min(prev + 1, paginatedProjects.length - 1)); break;
            case "ArrowUp": e.preventDefault(); setFocusedRowIndex(prev => prev === null ? 0 : Math.max(prev - 1, 0)); break;
            case " ": e.preventDefault(); if (focusedRowIndex !== null) { const p = paginatedProjects[focusedRowIndex]; handleSelectProject(p.id, !selectedProjects.includes(p.id)); } break;
        }
    }, [paginatedProjects, focusedRowIndex, handleSelectProject, selectedProjects]);

    useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter]);

    if (loading) return <div className="space-y-6"><h1 className="text-2xl font-bold">Projects</h1><TableSkeleton rows={10} columns={6} /></div>;

    return (
        <TooltipProvider>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Projects</h1>
                    <Link href="/dashboard/projects/new"><Button className="bg-gray-900 text-white hover:bg-gray-800"><Plus className="mr-2 h-4 w-4" /> New Project</Button></Link>
                </div>

                <QuickStatsBar projects={projects} stats={projectStats} />

                {/* Status Tabs */}
                <div className="flex flex-wrap gap-2">
                    {(["not_started", "in_progress", "on_hold", "cancelled", "finished"] as ProjectStatus[]).map(status => {
                        const colors = statusColors[status];
                        const count = projectStats[status] || 0;
                        const isActive = statusFilter === status;
                        return (
                            <button key={status} onClick={() => setStatusFilter(isActive ? "all" : status)} className={`border rounded-full px-3 py-1 text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors ${isActive ? `${colors.bg} ${colors.text} ${colors.border}` : "bg-white text-gray-500 hover:bg-gray-50"}`}>
                                <span className="font-bold text-gray-900">{count}</span> {statusLabels[status]}
                            </button>
                        );
                    })}
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Show</span>
                        <Select value={recordsPerPage.toString()} onValueChange={(v) => { setRecordsPerPage(parseInt(v)); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[70px] h-9"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem><SelectItem value="100">100</SelectItem></SelectContent>
                        </Select>
                        <Button variant="outline" onClick={exportProjects}><Download className="mr-2 h-4 w-4" />Export</Button>
                        {selectedProjects.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="outline" className="border-blue-200 bg-blue-50 text-blue-700"><Badge className="mr-2 bg-blue-600">{selectedProjects.length}</Badge>Bulk <ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent><DropdownMenuLabel>With {selectedProjects.length} selected</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem className="text-red-600" onClick={handleBulkDelete}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem></DropdownMenuContent>
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

                <SelectionBanner selectionMode={selectionMode} selectedCount={selectedProjects.length} totalCount={totalRecords} onSelectAll={handleSelectAllRecords} onClearSelection={handleClearSelection} />
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalRecords={totalRecords} startRecord={totalRecords === 0 ? 0 : startIndex + 1} endRecord={endIndex} />

                {/* Table */}
                <div ref={tableRef} tabIndex={0} onKeyDown={handleKeyDown} className="border rounded-md bg-white overflow-x-auto focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                <TableHead className="w-[40px]"><Checkbox checked={isAllPageSelected} ref={(el) => { if (el) (el as any).indeterminate = isSomeSelected; }} onCheckedChange={(c) => c ? handleSelectAllOnPage() : handleClearSelection()} /></TableHead>
                                {columnVisibility.name && <TableHead className="font-semibold text-gray-900">Name</TableHead>}
                                {columnVisibility.customer && <TableHead>Customer</TableHead>}
                                {columnVisibility.status && <TableHead>Status</TableHead>}
                                {columnVisibility.progress && <TableHead>Progress</TableHead>}
                                {columnVisibility.startDate && <TableHead>Start Date</TableHead>}
                                {columnVisibility.deadline && <TableHead>Deadline</TableHead>}
                                <TableHead className="w-24 text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedProjects.length === 0 ? (
                                <TableRow><TableCell colSpan={visibleColumnsCount + 2} className="text-center py-10 text-muted-foreground">{searchQuery ? "No matches" : "No projects"}</TableCell></TableRow>
                            ) : (
                                paginatedProjects.map((project, index) => {
                                    const colors = statusColors[project.status] || statusColors["not_started"];
                                    return (
                                        <TableRow key={project.id} className={`group hover:bg-gray-50 ${selectedProjects.includes(project.id) ? 'bg-blue-50/50' : ''} ${focusedRowIndex === index ? 'ring-2 ring-inset ring-blue-500' : ''} ${ROW_DENSITY_STYLES[rowDensity]}`}>
                                            <TableCell><Checkbox checked={selectedProjects.includes(project.id)} onCheckedChange={(c) => handleSelectProject(project.id, !!c)} /></TableCell>
                                            {columnVisibility.name && <TableCell className="font-medium"><Link href={`/dashboard/projects/${project.id}`} className="text-blue-600 hover:underline"><HighlightText text={project.name || "-"} search={searchQuery} /></Link></TableCell>}
                                            {columnVisibility.customer && <TableCell className="text-gray-500"><HighlightText text={project.customerName || "-"} search={searchQuery} /></TableCell>}
                                            {columnVisibility.status && <TableCell><Badge className={`${colors.bg} ${colors.text} ${colors.border} border`}>{statusLabels[project.status]}</Badge></TableCell>}
                                            {columnVisibility.progress && <TableCell><div className="flex items-center gap-2 w-32"><Progress value={project.progress || 0} className="h-2" /><span className="text-xs text-gray-500">{project.progress || 0}%</span></div></TableCell>}
                                            {columnVisibility.startDate && <TableCell className="text-gray-500">{formatDate(project.startDate)}</TableCell>}
                                            {columnVisibility.deadline && <TableCell className="text-gray-500">{formatDate(project.deadline)}</TableCell>}
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Tooltip><TooltipTrigger asChild><Link href={`/dashboard/projects/${project.id}`}><Button variant="ghost" size="icon" className="h-7 w-7"><ExternalLink className="h-3.5 w-3.5" /></Button></Link></TooltipTrigger><TooltipContent>View</TooltipContent></Tooltip>
                                                    <Tooltip><TooltipTrigger asChild><Link href={`/dashboard/projects/${project.id}/settings`}><Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button></Link></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
                                                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(project.id)}><Trash className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>
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
