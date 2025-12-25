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
    ArrowUpDown, ArrowUp, ArrowDown, Pencil, Trash, ExternalLink,
    LayoutList, DollarSign, Users, TrendingUp, GripVertical, PlusCircle,
    Star, Clock, FileDown, Mail, Phone, AlertTriangle, RefreshCcw,
    Bookmark, BookmarkPlus, Save, FolderOpen, MoreVertical, Tag, Zap, Send,
    Kanban, Table2, GitMerge, UserPlus, Settings2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useLeads } from "@/lib/hooks";
import type { Lead, LeadStatus } from "@/lib/types";
import Link from "next/link";
import { TableSkeleton } from "@/components/ui/skeleton-loaders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";

// DND Kit imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Dynamic imports
const ImportWizard = dynamic(() => import("@/components/import/ImportWizard"), { loading: () => <div className="text-sm text-gray-500">Loading...</div>, ssr: false });
const LeadDetailsDialog = dynamic(() => import("@/components/dashboard/leads/lead-details-dialog").then(mod => ({ default: mod.LeadDetailsSheet })), { ssr: false });
const LeadEditDialog = dynamic(() => import("@/components/dashboard/leads/lead-edit-dialog").then(mod => ({ default: mod.LeadEditSheet })), { ssr: false });

import { LEAD_STATUSES, STATUS_COLORS } from "@/lib/constants";
import { Timestamp } from "firebase/firestore";
import { formatDistanceToNow, format } from "date-fns";

// Types
type SelectionMode = "none" | "page" | "all";
type SortDirection = "asc" | "desc" | null;
type RowDensity = "compact" | "comfortable" | "spacious";
type ViewMode = "table" | "kanban";
type ColumnKey = "starred" | "id" | "name" | "company" | "email" | "phone" | "value" | "status" | "source" | "lastActivity" | "score" | "tags";
type FilterOperator = "contains" | "equals" | "startsWith" | "endsWith" | "isEmpty" | "isNotEmpty" | "greaterThan" | "lessThan";
type FilterLogic = "AND" | "OR";

interface ColumnDef { key: ColumnKey; label: string; defaultVisible: boolean; required?: boolean; sortable?: boolean; width?: string; }
interface FilterCondition { id: string; field: ColumnKey; operator: FilterOperator; value: string; }

// Saved View type
interface SavedView {
    id: string;
    name: string;
    columnVisibility: Record<ColumnKey, boolean>;
    columnOrder: ColumnKey[];
    sortKey: ColumnKey | null;
    sortDirection: SortDirection;
    advancedFilters: FilterCondition[];
    filterLogic: FilterLogic;
    statusFilter: LeadStatus | "all";
    rowDensity: RowDensity;
    isDefault?: boolean;
    createdAt: number;
}

const SAVED_VIEWS_STORAGE_KEY = "leads_saved_views";

const DEFAULT_COLUMNS: ColumnDef[] = [
    { key: "starred", label: "★", defaultVisible: true, width: "w-10" },
    { key: "id", label: "#", defaultVisible: true, width: "w-16" },
    { key: "name", label: "Name", defaultVisible: true, required: true, sortable: true },
    { key: "company", label: "Company", defaultVisible: true, sortable: true },
    { key: "email", label: "Email", defaultVisible: true, sortable: true },
    { key: "phone", label: "Phone", defaultVisible: true },
    { key: "value", label: "Value", defaultVisible: true, sortable: true },
    { key: "status", label: "Status", defaultVisible: true, sortable: true },
    { key: "score", label: "Score", defaultVisible: true, sortable: true, width: "w-20" },
    { key: "tags", label: "Tags", defaultVisible: true },
    { key: "source", label: "Source", defaultVisible: false, sortable: true },
    { key: "lastActivity", label: "Last Activity", defaultVisible: false, sortable: true },
];

// Calculate lead score based on criteria (0-100)
function calculateLeadScore(lead: Lead): number {
    let score = 0;
    // Has email (+15)
    if (lead.email) score += 15;
    // Has phone (+15)
    if (lead.phone) score += 15;
    // Has company name (+10)
    if (lead.company) score += 10;
    // Has value (+15 scaled)
    if (lead.value && lead.value > 0) score += Math.min(15, Math.floor(lead.value / 1000));
    // Status progression (+20 max)
    const statusScores: Record<string, number> = { new: 5, contacted: 10, qualified: 15, proposal: 18, negotiation: 20, won: 20, lost: 0, junk: 0 };
    score += statusScores[lead.status] || 0;
    // Recent activity (+15)
    if (lead.lastContactedAt) {
        const daysSinceContact = Math.floor((Date.now() - lead.lastContactedAt.toMillis()) / (1000 * 60 * 60 * 24));
        if (daysSinceContact < 7) score += 15;
        else if (daysSinceContact < 30) score += 10;
        else if (daysSinceContact < 90) score += 5;
    }
    // Has tags (+5)
    if (lead.tags && lead.tags.length > 0) score += 5;
    // Is starred (+5 bonus)
    if (lead.isStarred) score += 5;
    return Math.min(100, score);
}

// Score color based on value
function getScoreColor(score: number): string {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-blue-100 text-blue-800";
    if (score >= 40) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-600";
}

const FILTER_OPERATORS: { value: FilterOperator; label: string }[] = [
    { value: "contains", label: "Contains" }, { value: "equals", label: "Equals" },
    { value: "startsWith", label: "Starts with" }, { value: "endsWith", label: "Ends with" },
    { value: "isEmpty", label: "Is empty" }, { value: "isNotEmpty", label: "Is not empty" },
    { value: "greaterThan", label: "Greater than" }, { value: "lessThan", label: "Less than" },
];

const ROW_DENSITY_STYLES: Record<RowDensity, string> = { compact: "py-1 text-xs", comfortable: "py-2 text-sm", spacious: "py-4 text-sm" };

const getDefaultVisibleColumns = (): Record<ColumnKey, boolean> => {
    const v: Record<string, boolean> = {};
    DEFAULT_COLUMNS.forEach(col => { v[col.key] = col.defaultVisible; });
    return v as Record<ColumnKey, boolean>;
};

// Format timestamp to relative time
function formatLastActivity(timestamp: Timestamp | undefined): string {
    if (!timestamp) return "-";
    try {
        const date = timestamp.toDate();
        return formatDistanceToNow(date, { addSuffix: true });
    } catch { return "-"; }
}

function formatFullDate(timestamp: Timestamp | undefined): string {
    if (!timestamp) return "No activity";
    try { return format(timestamp.toDate(), "PPpp"); } catch { return "No activity"; }
}

// Quick View Card Component
function QuickViewCard({ lead }: { lead: Lead }) {
    const statusColor = STATUS_COLORS[lead.status] || { bg: "bg-gray-50", text: "text-gray-600" };
    return (
        <Card className="w-80 shadow-lg border-0">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                {lead.name?.charAt(0)?.toUpperCase() || "?"}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-base">{lead.name}</CardTitle>
                            {lead.company && <p className="text-sm text-gray-500">{lead.company}</p>}
                        </div>
                    </div>
                    {lead.isStarred && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                    <Badge className={`${statusColor.bg} ${statusColor.text} border-0`}>{lead.status}</Badge>
                    {lead.value && <Badge variant="outline" className="font-mono">${lead.value.toLocaleString()}</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    {lead.email && (
                        <div><span className="text-gray-500">Email:</span><p className="truncate">{lead.email}</p></div>
                    )}
                    {lead.phone && (
                        <div><span className="text-gray-500">Phone:</span><p>{lead.phone}</p></div>
                    )}
                    {lead.source && (
                        <div><span className="text-gray-500">Source:</span><p>{lead.source}</p></div>
                    )}
                    <div>
                        <span className="text-gray-500">Last Activity:</span>
                        <p className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatLastActivity(lead.lastContactedAt)}</p>
                    </div>
                </div>
                {lead.description && (
                    <div className="text-sm"><span className="text-gray-500">Notes:</span><p className="text-gray-700 line-clamp-2">{lead.description}</p></div>
                )}
            </CardContent>
        </Card>
    );
}

// Draggable Header
function DraggableColumnHeader({ column, sortKey, sortDirection, onSort, isVisible }: { column: ColumnDef; sortKey: ColumnKey | null; sortDirection: SortDirection; onSort: (key: ColumnKey) => void; isVisible: boolean; }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.key });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
    if (!isVisible) return null;
    const isActive = sortKey === column.key;
    return (
        <TableHead ref={setNodeRef} style={style} className={`font-semibold text-gray-900 bg-gray-100/50 ${column.key === "name" ? "sticky left-12 z-10" : ""}`}>
            <div className="flex items-center gap-1">
                <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded"><GripVertical className="h-3 w-3 text-gray-400" /></button>
                {column.sortable ? (
                    <button onClick={() => onSort(column.key)} className="flex items-center gap-1 hover:text-blue-600">
                        {column.label}
                        {isActive ? (sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </button>
                ) : <span>{column.label}</span>}
            </div>
        </TableHead>
    );
}

// Highlight text
function HighlightText({ text, search }: { text: string; search: string }) {
    if (!search.trim() || !text) return <>{text}</>;
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return <>{parts.map((part, i) => regex.test(part) ? <mark key={i} className="bg-yellow-200 px-0.5 rounded">{part}</mark> : <span key={i}>{part}</span>)}</>;
}

// Quick Stats
function QuickStatsBar({ leads, totalValue }: { leads: Lead[]; totalValue: number }) {
    const avgValue = leads.length > 0 ? totalValue / leads.length : 0;
    const qualifiedCount = leads.filter(l => l.status === "qualified").length;
    const starredCount = leads.filter(l => l.isStarred).length;
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-blue-600 mb-1"><Users className="h-4 w-4" /><span className="text-xs font-medium uppercase">Total</span></div>
                <div className="text-2xl font-bold text-blue-900">{leads.length}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-green-600 mb-1"><DollarSign className="h-4 w-4" /><span className="text-xs font-medium uppercase">Value</span></div>
                <div className="text-2xl font-bold text-green-900">${totalValue.toLocaleString()}</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-yellow-600 mb-1"><Star className="h-4 w-4" /><span className="text-xs font-medium uppercase">Starred</span></div>
                <div className="text-2xl font-bold text-yellow-900">{starredCount}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-purple-600 mb-1"><TrendingUp className="h-4 w-4" /><span className="text-xs font-medium uppercase">Qualified</span></div>
                <div className="text-2xl font-bold text-purple-900">{qualifiedCount}</div>
            </div>
        </div>
    );
}

// Filter Row
function FilterRow({ filter, columns, onUpdate, onRemove, showLogic, logic, onLogicChange }: { filter: FilterCondition; columns: ColumnDef[]; onUpdate: (id: string, updates: Partial<FilterCondition>) => void; onRemove: (id: string) => void; showLogic: boolean; logic: FilterLogic; onLogicChange: (l: FilterLogic) => void; }) {
    const needsValue = !["isEmpty", "isNotEmpty"].includes(filter.operator);
    return (
        <div className="flex items-center gap-2">
            {showLogic ? (<Select value={logic} onValueChange={(v) => onLogicChange(v as FilterLogic)}><SelectTrigger className="w-[70px] h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="AND">AND</SelectItem><SelectItem value="OR">OR</SelectItem></SelectContent></Select>) : <div className="w-[70px] text-xs text-gray-500 text-center">Where</div>}
            <Select value={filter.field} onValueChange={(v) => onUpdate(filter.id, { field: v as ColumnKey })}><SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{columns.filter(c => c.key !== "starred" && c.key !== "lastActivity").map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent></Select>
            <Select value={filter.operator} onValueChange={(v) => onUpdate(filter.id, { operator: v as FilterOperator })}><SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{FILTER_OPERATORS.map((op) => <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>)}</SelectContent></Select>
            {needsValue && <Input value={filter.value} onChange={(e) => onUpdate(filter.id, { value: e.target.value })} placeholder="Value..." className="w-[120px] h-8 text-xs" />}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRemove(filter.id)}><X className="h-4 w-4" /></Button>
        </div>
    );
}

// Selection Banner
function SelectionBanner({ selectionMode, selectedCount, pageCount, totalCount, onSelectAll, onClearSelection }: { selectionMode: SelectionMode; selectedCount: number; pageCount: number; totalCount: number; onSelectAll: () => void; onClearSelection: () => void; }) {
    if (selectionMode === "none" || selectedCount === 0) return null;
    return (
        <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-2 flex items-center justify-center gap-2 text-sm">
            <CheckSquare className="h-4 w-4 text-blue-600" />
            {selectionMode === "page" ? (<><span className="text-blue-800">All <strong>{selectedCount}</strong> on page selected.</span>{totalCount > pageCount && <button onClick={onSelectAll} className="text-blue-600 font-medium hover:underline">Select all {totalCount}</button>}</>) : (<><span className="text-blue-800">All <strong>{totalCount}</strong> selected.</span><button onClick={onClearSelection} className="text-blue-600 font-medium hover:underline">Clear</button></>)}
        </div>
    );
}

// Pagination
function Pagination({ currentPage, totalPages, onPageChange, totalRecords, startRecord, endRecord, compact = false }: { currentPage: number; totalPages: number; onPageChange: (p: number) => void; totalRecords: number; startRecord: number; endRecord: number; compact?: boolean; }) {
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

// Inline Edit
function InlineEditCell({ value, field, leadId, onSave, searchQuery }: { value: string; field: ColumnKey; leadId: string; onSave: (id: string, field: ColumnKey, value: string) => void; searchQuery: string; }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => { if (isEditing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [isEditing]);
    const handleSave = () => { if (editValue !== value) onSave(leadId, field, editValue); setIsEditing(false); };
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") handleSave(); else if (e.key === "Escape") { setEditValue(value); setIsEditing(false); } };
    if (isEditing) return <Input ref={inputRef} value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} className="h-7 text-sm" />;
    return <span onDoubleClick={() => setIsEditing(true)} className="cursor-text hover:bg-gray-100 px-1 py-0.5 rounded inline-block min-w-[20px]" title="Double-click to edit"><HighlightText text={value || "-"} search={searchQuery} /></span>;
}

// Kanban Board Component
function KanbanBoard({ leads, onStatusChange, onView, onEdit }: { leads: Lead[]; onStatusChange: (id: string, status: LeadStatus) => void; onView: (lead: Lead) => void; onEdit: (lead: Lead) => void; }) {
    const statusColumns = LEAD_STATUSES.filter(s => !["won", "lost", "junk"].includes(s.value));
    const closedStatuses = LEAD_STATUSES.filter(s => ["won", "lost", "junk"].includes(s.value));

    const getLeadsByStatus = (status: LeadStatus) => leads.filter(l => l.status === status);

    const handleDragStart = (e: React.DragEvent, leadId: string) => {
        e.dataTransfer.setData("leadId", leadId);
    };

    const handleDrop = (e: React.DragEvent, newStatus: LeadStatus) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData("leadId");
        if (leadId) onStatusChange(leadId, newStatus);
    };

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();

    const renderLeadCard = (lead: Lead) => {
        const score = lead.leadScore ?? calculateLeadScore(lead);
        return (
            <div
                key={lead.id}
                draggable
                onDragStart={(e) => handleDragStart(e, lead.id)}
                className="bg-white border rounded-lg p-3 cursor-move hover:shadow-md transition-shadow group"
            >
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                {lead.name?.charAt(0)?.toUpperCase() || "?"}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-medium text-sm truncate max-w-[120px]">{lead.name}</p>
                            {lead.company && <p className="text-xs text-gray-500 truncate max-w-[120px]">{lead.company}</p>}
                        </div>
                    </div>
                    {lead.isStarred && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                </div>
                <div className="flex items-center gap-2 mb-2">
                    <Badge className={`text-[10px] px-1.5 py-0 ${getScoreColor(score)}`}>
                        <Zap className="h-2 w-2 mr-0.5" />{score}
                    </Badge>
                    {lead.value && <Badge variant="outline" className="text-[10px] px-1.5 py-0">${lead.value.toLocaleString()}</Badge>}
                </div>
                {lead.tags && lead.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {lead.tags.slice(0, 2).map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-[9px] px-1 py-0">{tag}</Badge>
                        ))}
                    </div>
                )}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onView(lead)}><ExternalLink className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(lead)}><Pencil className="h-3 w-3" /></Button>
                </div>
            </div>
        );
    };

    return (
        <div className="flex gap-4 overflow-x-auto pb-4">
            {statusColumns.map((status) => {
                const statusLeads = getLeadsByStatus(status.value as LeadStatus);
                const statusColor = STATUS_COLORS[status.value as LeadStatus] || { bg: "bg-gray-50", text: "text-gray-600" };
                return (
                    <div
                        key={status.value}
                        className="flex-shrink-0 w-72 bg-gray-50 rounded-lg p-3"
                        onDrop={(e) => handleDrop(e, status.value as LeadStatus)}
                        onDragOver={handleDragOver}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <Badge className={`${statusColor.bg} ${statusColor.text} border-0`}>{status.label}</Badge>
                            <Badge variant="outline" className="text-xs">{statusLeads.length}</Badge>
                        </div>
                        <div className="space-y-2 min-h-[200px]">
                            {statusLeads.map(renderLeadCard)}
                            {statusLeads.length === 0 && (
                                <div className="text-center py-8 text-sm text-gray-400 border-2 border-dashed rounded-lg">
                                    Drag leads here
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
            {/* Closed columns - collapsed */}
            <div className="flex-shrink-0 w-48 bg-gray-100 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-600 mb-3">Closed</div>
                {closedStatuses.map((status) => {
                    const statusLeads = getLeadsByStatus(status.value as LeadStatus);
                    return (
                        <div
                            key={status.value}
                            className="mb-2 p-2 bg-white rounded border"
                            onDrop={(e) => handleDrop(e, status.value as LeadStatus)}
                            onDragOver={handleDragOver}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium">{status.label}</span>
                                <Badge variant="outline" className="text-[10px]">{statusLeads.length}</Badge>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function LeadsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    const [selectionMode, setSelectionMode] = useState<SelectionMode>("none");
    const [showImportWizard, setShowImportWizard] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage, setRecordsPerPage] = useState(10);
    const [columnVisibility, setColumnVisibility] = useState<Record<ColumnKey, boolean>>(getDefaultVisibleColumns);
    const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(DEFAULT_COLUMNS.map(c => c.key));
    const [sortKey, setSortKey] = useState<ColumnKey | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [rowDensity, setRowDensity] = useState<RowDensity>("comfortable");
    const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
    const [advancedFilters, setAdvancedFilters] = useState<FilterCondition[]>([]);
    const [filterLogic, setFilterLogic] = useState<FilterLogic>("AND");
    const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    // Saved views state
    const [savedViews, setSavedViews] = useState<SavedView[]>([]);
    const [showSaveViewDialog, setShowSaveViewDialog] = useState(false);
    const [newViewName, setNewViewName] = useState("");
    const [activeViewId, setActiveViewId] = useState<string | null>(null);

    // View mode state
    const [viewMode, setViewMode] = useState<ViewMode>("table");

    // Merge dialog state
    const [showMergeDialog, setShowMergeDialog] = useState(false);
    const [mergeTargetLead, setMergeTargetLead] = useState<Lead | null>(null);
    const [mergeSourceLead, setMergeSourceLead] = useState<Lead | null>(null);

    // Bulk email dialog state
    const [showBulkEmailDialog, setShowBulkEmailDialog] = useState(false);
    const [emailSubject, setEmailSubject] = useState("Follow-up");
    const [emailBody, setEmailBody] = useState("");

    // Load saved views from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(SAVED_VIEWS_STORAGE_KEY);
            if (stored) {
                const views = JSON.parse(stored) as SavedView[];
                setSavedViews(views);
                // Apply default view if exists
                const defaultView = views.find(v => v.isDefault);
                if (defaultView) {
                    applyView(defaultView);
                }
            }
        } catch (e) { console.error("Failed to load saved views", e); }
    }, []);

    // Save views to localStorage whenever they change
    useEffect(() => {
        if (savedViews.length > 0) {
            localStorage.setItem(SAVED_VIEWS_STORAGE_KEY, JSON.stringify(savedViews));
        }
    }, [savedViews]);

    // Apply a saved view
    const applyView = useCallback((view: SavedView) => {
        setColumnVisibility(view.columnVisibility);
        setColumnOrder(view.columnOrder);
        setSortKey(view.sortKey);
        setSortDirection(view.sortDirection);
        setAdvancedFilters(view.advancedFilters);
        setFilterLogic(view.filterLogic);
        setStatusFilter(view.statusFilter);
        setRowDensity(view.rowDensity);
        setActiveViewId(view.id);
        setCurrentPage(1);
    }, []);

    // Save current state as a new view
    const saveCurrentView = useCallback((name: string, setAsDefault: boolean = false) => {
        const newView: SavedView = {
            id: crypto.randomUUID(),
            name,
            columnVisibility,
            columnOrder,
            sortKey,
            sortDirection,
            advancedFilters,
            filterLogic,
            statusFilter,
            rowDensity,
            isDefault: setAsDefault,
            createdAt: Date.now(),
        };
        setSavedViews(prev => {
            // If setting as default, remove default from others
            const updated = setAsDefault ? prev.map(v => ({ ...v, isDefault: false })) : prev;
            return [...updated, newView];
        });
        setActiveViewId(newView.id);
        setNewViewName("");
        setShowSaveViewDialog(false);
    }, [columnVisibility, columnOrder, sortKey, sortDirection, advancedFilters, filterLogic, statusFilter, rowDensity]);

    // Delete a saved view
    const deleteView = useCallback((viewId: string) => {
        setSavedViews(prev => {
            const updated = prev.filter(v => v.id !== viewId);
            if (updated.length === 0) localStorage.removeItem(SAVED_VIEWS_STORAGE_KEY);
            return updated;
        });
        if (activeViewId === viewId) setActiveViewId(null);
    }, [activeViewId]);

    // Set a view as default
    const setViewAsDefault = useCallback((viewId: string) => {
        setSavedViews(prev => prev.map(v => ({ ...v, isDefault: v.id === viewId })));
    }, []);

    const tableRef = useRef<HTMLDivElement>(null);
    const { leads, loading, leadStats, deleteLead, updateLead } = useLeads({ status: statusFilter });

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const orderedColumns = useMemo(() => columnOrder.map(key => DEFAULT_COLUMNS.find(c => c.key === key)!).filter(Boolean), [columnOrder]);
    const totalValue = useMemo(() => leads.reduce((sum, l) => sum + (l.value || 0), 0), [leads]);

    const applyFilter = useCallback((lead: Lead, filter: FilterCondition): boolean => {
        const fieldValue = String(lead[filter.field as keyof Lead] || "").toLowerCase();
        const filterValue = filter.value.toLowerCase();
        switch (filter.operator) {
            case "contains": return fieldValue.includes(filterValue);
            case "equals": return fieldValue === filterValue;
            case "startsWith": return fieldValue.startsWith(filterValue);
            case "endsWith": return fieldValue.endsWith(filterValue);
            case "isEmpty": return !fieldValue;
            case "isNotEmpty": return !!fieldValue;
            case "greaterThan": return parseFloat(fieldValue) > parseFloat(filterValue);
            case "lessThan": return parseFloat(fieldValue) < parseFloat(filterValue);
            default: return true;
        }
    }, []);

    const processedLeads = useMemo(() => {
        let result = leads.filter(lead => lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) || lead.company?.toLowerCase().includes(searchQuery.toLowerCase()) || lead.email?.toLowerCase().includes(searchQuery.toLowerCase()));
        if (advancedFilters.length > 0) {
            result = result.filter(lead => filterLogic === "AND" ? advancedFilters.every(f => applyFilter(lead, f)) : advancedFilters.some(f => applyFilter(lead, f)));
        }
        // Sort: starred first, then by sortKey
        result = [...result].sort((a, b) => {
            // Starred items come first
            if (a.isStarred && !b.isStarred) return -1;
            if (!a.isStarred && b.isStarred) return 1;
            // Then apply regular sort
            if (sortKey && sortDirection) {
                let aVal = a[sortKey as keyof Lead];
                let bVal = b[sortKey as keyof Lead];
                if (sortKey === "value") { aVal = aVal || 0; bVal = bVal || 0; return sortDirection === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number); }
                if (sortKey === "lastActivity") {
                    const aTime = a.lastContactedAt?.toMillis() || 0;
                    const bTime = b.lastContactedAt?.toMillis() || 0;
                    return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
                }
                aVal = String(aVal || "").toLowerCase(); bVal = String(bVal || "").toLowerCase();
                return sortDirection === "asc" ? (aVal as string).localeCompare(bVal as string) : (bVal as string).localeCompare(aVal as string);
            }
            return 0;
        });
        return result;
    }, [leads, searchQuery, advancedFilters, filterLogic, sortKey, sortDirection, applyFilter]);

    const totalRecords = processedLeads.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + recordsPerPage, totalRecords);
    const paginatedLeads = useMemo(() => processedLeads.slice(startIndex, endIndex), [processedLeads, startIndex, endIndex]);
    const currentPageIds = useMemo(() => paginatedLeads.map(l => l.id), [paginatedLeads]);
    const allFilteredIds = useMemo(() => processedLeads.map(l => l.id), [processedLeads]);
    const visibleColumnsCount = Object.values(columnVisibility).filter(Boolean).length;

    // Export function
    const exportLeads = useCallback((exportAll: boolean) => {
        const dataToExport = exportAll ? processedLeads : processedLeads.filter(l => selectedLeads.includes(l.id));
        if (dataToExport.length === 0) { alert("No leads to export"); return; }

        const headers = ["Name", "Company", "Email", "Phone", "Value", "Status", "Source", "Last Activity", "Starred"];
        const csvContent = [
            headers.join(","),
            ...dataToExport.map(lead => [
                `"${lead.name || ""}"`,
                `"${lead.company || ""}"`,
                `"${lead.email || ""}"`,
                `"${lead.phone || ""}"`,
                lead.value || 0,
                lead.status,
                `"${lead.source || ""}"`,
                lead.lastContactedAt ? `"${formatFullDate(lead.lastContactedAt)}"` : "",
                lead.isStarred ? "Yes" : "No"
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }, [processedLeads, selectedLeads]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) setColumnOrder(items => arrayMove(items, items.indexOf(active.id as ColumnKey), items.indexOf(over.id as ColumnKey)));
    }, []);

    const handleSort = useCallback((key: ColumnKey) => {
        if (sortKey === key) { if (sortDirection === "asc") setSortDirection("desc"); else { setSortKey(null); setSortDirection(null); } } else { setSortKey(key); setSortDirection("asc"); }
    }, [sortKey, sortDirection]);

    const toggleColumn = useCallback((key: ColumnKey) => { const col = DEFAULT_COLUMNS.find(c => c.key === key); if (col?.required) return; setColumnVisibility(prev => ({ ...prev, [key]: !prev[key] })); }, []);
    const showAllColumns = useCallback(() => { const v: Record<string, boolean> = {}; DEFAULT_COLUMNS.forEach(c => { v[c.key] = true; }); setColumnVisibility(v as Record<ColumnKey, boolean>); }, []);
    const resetColumns = useCallback(() => { setColumnVisibility(getDefaultVisibleColumns()); setColumnOrder(DEFAULT_COLUMNS.map(c => c.key)); }, []);

    const addFilter = useCallback(() => setAdvancedFilters(prev => [...prev, { id: crypto.randomUUID(), field: "name", operator: "contains", value: "" }]), []);
    const updateFilter = useCallback((id: string, updates: Partial<FilterCondition>) => setAdvancedFilters(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f)), []);
    const removeFilter = useCallback((id: string) => setAdvancedFilters(prev => prev.filter(f => f.id !== id)), []);

    const handleSelectAllOnPage = useCallback(() => { setSelectedLeads(currentPageIds); setSelectionMode("page"); }, [currentPageIds]);
    const handleSelectAllRecords = useCallback(() => { setSelectedLeads(allFilteredIds); setSelectionMode("all"); }, [allFilteredIds]);
    const handleClearSelection = useCallback(() => { setSelectedLeads([]); setSelectionMode("none"); }, []);
    const handleSelectAllCheckbox = useCallback((checked: boolean) => { if (checked) handleSelectAllOnPage(); else handleClearSelection(); }, [handleSelectAllOnPage, handleClearSelection]);
    const handleSelectLead = useCallback((leadId: string, checked: boolean) => {
        if (checked) { setSelectedLeads(prev => [...prev, leadId]); if (selectedLeads.length + 1 === paginatedLeads.length) setSelectionMode("page"); }
        else { setSelectedLeads(prev => prev.filter(id => id !== leadId)); if (selectionMode === "all") setSelectionMode("page"); if (selectedLeads.length - 1 === 0) setSelectionMode("none"); }
    }, [selectedLeads.length, paginatedLeads.length, selectionMode]);
    const isAllPageSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedLeads.includes(id));
    const isSomeSelected = selectedLeads.length > 0 && !isAllPageSelected;

    const handleView = useCallback((lead: Lead) => { setSelectedLead(lead); setDetailsOpen(true); }, []);
    const handleEdit = useCallback((lead: Lead) => { setSelectedLead(lead); setEditOpen(true); }, []);
    const handleDelete = useCallback(async (id: string) => { if (window.confirm("Delete?")) await deleteLead(id); }, [deleteLead]);
    const handleBulkDelete = useCallback(async () => { if (selectedLeads.length === 0) return; if (window.confirm(`Delete ${selectionMode === "all" ? totalRecords : selectedLeads.length}?`)) { for (const id of selectedLeads) await deleteLead(id); handleClearSelection(); } }, [selectedLeads, selectionMode, totalRecords, deleteLead, handleClearSelection]);
    const handleInlineEdit = useCallback(async (id: string, field: ColumnKey, value: string) => { await updateLead(id, { [field]: value } as any); }, [updateLead]);
    const handleSaveLead = useCallback(async (id: string, data: Partial<Lead>) => { await updateLead(id, data as any); if (selectedLead?.id === id) setSelectedLead({ ...selectedLead, ...data } as Lead); }, [updateLead, selectedLead]);
    const handleStatusChange = useCallback(async (leadId: string, newStatus: LeadStatus) => { await updateLead(leadId, { status: newStatus }); }, [updateLead]);
    const handleToggleStar = useCallback(async (leadId: string, isStarred: boolean) => { await updateLead(leadId, { isStarred } as any); }, [updateLead]);

    // Bulk status update
    const handleBulkStatusUpdate = useCallback(async (newStatus: LeadStatus) => {
        if (selectedLeads.length === 0) return;
        if (window.confirm(`Update ${selectionMode === "all" ? totalRecords : selectedLeads.length} leads to "${newStatus}"?`)) {
            for (const id of selectedLeads) await updateLead(id, { status: newStatus });
            handleClearSelection();
        }
    }, [selectedLeads, selectionMode, totalRecords, updateLead, handleClearSelection]);

    // Duplicate detection
    const findDuplicates = useCallback((email: string, phone: string, excludeId?: string): Lead[] => {
        return leads.filter(l => {
            if (excludeId && l.id === excludeId) return false;
            const emailMatch = email && l.email && l.email.toLowerCase() === email.toLowerCase();
            const phoneMatch = phone && l.phone && l.phone.replace(/\D/g, '') === phone.replace(/\D/g, '');
            return emailMatch || phoneMatch;
        });
    }, [leads]);

    // Batch email - open mailto with all selected leads
    const handleBatchEmail = useCallback(() => {
        const selectedLeadData = processedLeads.filter(l => selectedLeads.includes(l.id));
        const emails = selectedLeadData.filter(l => l.email).map(l => l.email);
        if (emails.length === 0) {
            alert("No email addresses found in selected leads");
            return;
        }
        const mailto = `mailto:${emails.join(",")}?subject=Follow-up with Leads`;
        window.open(mailto, "_blank");
    }, [processedLeads, selectedLeads]);

    // Open bulk email compose dialog
    const openBulkEmailCompose = useCallback(() => {
        const selectedLeadData = processedLeads.filter(l => selectedLeads.includes(l.id));
        const leadsWithEmail = selectedLeadData.filter(l => l.email);
        if (leadsWithEmail.length === 0) {
            alert("No email addresses found in selected leads");
            return;
        }
        setEmailBody(`Dear Lead,\n\nThank you for your interest. We would like to follow up...\n\nBest regards`);
        setShowBulkEmailDialog(true);
    }, [processedLeads, selectedLeads]);

    // Handle sending bulk email
    const handleSendBulkEmail = useCallback(() => {
        const selectedLeadData = processedLeads.filter(l => selectedLeads.includes(l.id));
        const emails = selectedLeadData.filter(l => l.email).map(l => l.email);
        const mailto = `mailto:${emails.join(",")}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
        window.open(mailto, "_blank");
        setShowBulkEmailDialog(false);
    }, [processedLeads, selectedLeads, emailSubject, emailBody]);

    // Open merge dialog
    const openMergeDialog = useCallback(() => {
        if (selectedLeads.length !== 2) {
            alert("Please select exactly 2 leads to merge");
            return;
        }
        const selected = processedLeads.filter(l => selectedLeads.includes(l.id));
        setMergeTargetLead(selected[0]);
        setMergeSourceLead(selected[1]);
        setShowMergeDialog(true);
    }, [selectedLeads, processedLeads]);

    // Handle merge leads
    const handleMergeLeads = useCallback(async () => {
        if (!mergeTargetLead || !mergeSourceLead) return;
        // Merge: copy missing fields from source to target, then delete source
        const mergedData: Partial<Lead> = {};
        if (!mergeTargetLead.email && mergeSourceLead.email) mergedData.email = mergeSourceLead.email;
        if (!mergeTargetLead.phone && mergeSourceLead.phone) mergedData.phone = mergeSourceLead.phone;
        if (!mergeTargetLead.company && mergeSourceLead.company) mergedData.company = mergeSourceLead.company;
        if (!mergeTargetLead.value && mergeSourceLead.value) mergedData.value = mergeSourceLead.value;
        if (!mergeTargetLead.website && mergeSourceLead.website) mergedData.website = mergeSourceLead.website;
        if (!mergeTargetLead.description && mergeSourceLead.description) mergedData.description = mergeSourceLead.description;
        // Merge tags
        const mergedTags = [...(mergeTargetLead.tags || []), ...(mergeSourceLead.tags || [])];
        mergedData.tags = [...new Set(mergedTags)];

        await updateLead(mergeTargetLead.id, mergedData as any);
        await deleteLead(mergeSourceLead.id);
        setShowMergeDialog(false);
        setMergeTargetLead(null);
        setMergeSourceLead(null);
        handleClearSelection();
    }, [mergeTargetLead, mergeSourceLead, updateLead, deleteLead, handleClearSelection]);

    const clearAllFilters = useCallback(() => { setStatusFilter("all"); setSearchQuery(""); setAdvancedFilters([]); setCurrentPage(1); handleClearSelection(); }, [handleClearSelection]);

    const handleTableKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
        if (paginatedLeads.length === 0) return;
        switch (e.key) {
            case "ArrowDown": e.preventDefault(); setFocusedRowIndex(prev => prev === null ? 0 : Math.min(prev + 1, paginatedLeads.length - 1)); break;
            case "ArrowUp": e.preventDefault(); setFocusedRowIndex(prev => prev === null ? 0 : Math.max(prev - 1, 0)); break;
            case "Enter": if (focusedRowIndex !== null) handleView(paginatedLeads[focusedRowIndex]); break;
            case " ": e.preventDefault(); if (focusedRowIndex !== null) { const l = paginatedLeads[focusedRowIndex]; handleSelectLead(l.id, !selectedLeads.includes(l.id)); } break;
            case "Delete": case "Backspace": if (selectedLeads.length > 0 && e.target === tableRef.current) { e.preventDefault(); handleBulkDelete(); } break;
        }
    }, [paginatedLeads, focusedRowIndex, handleView, handleSelectLead, selectedLeads, handleBulkDelete]);

    const hasActiveFilters = statusFilter !== "all" || advancedFilters.length > 0;

    const renderCell = (lead: Lead, column: ColumnDef) => {
        switch (column.key) {
            case "starred": return (
                <button onClick={() => handleToggleStar(lead.id, !lead.isStarred)} className="hover:scale-110 transition-transform">
                    <Star className={`h-4 w-4 ${lead.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`} />
                </button>
            );
            case "id": return <span className="font-medium text-gray-500">{lead.id.substring(0, 4)}</span>;
            case "name": return (
                <HoverCard openDelay={300} closeDelay={100}>
                    <HoverCardTrigger asChild>
                        <span><InlineEditCell value={lead.name || ""} field="name" leadId={lead.id} onSave={handleInlineEdit} searchQuery={searchQuery} /></span>
                    </HoverCardTrigger>
                    <HoverCardContent side="right" align="start" className="p-0 border-0 bg-transparent shadow-none"><QuickViewCard lead={lead} /></HoverCardContent>
                </HoverCard>
            );
            case "company": return <InlineEditCell value={lead.company || ""} field="company" leadId={lead.id} onSave={handleInlineEdit} searchQuery={searchQuery} />;
            case "email": return lead.email ? (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline" onClick={(e) => e.stopPropagation()}>
                    <Mail className="h-3 w-3" />
                    <HighlightText text={lead.email} search={searchQuery} />
                </a>
            ) : <span className="text-gray-400">-</span>;
            case "phone": return lead.phone ? (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-green-600 hover:text-green-800 hover:underline" onClick={(e) => e.stopPropagation()}>
                    <Phone className="h-3 w-3" />
                    <HighlightText text={lead.phone} search={searchQuery} />
                </a>
            ) : <span className="text-gray-400">-</span>;
            case "value": return <span className="text-gray-900 font-mono">{lead.value ? `$${lead.value.toLocaleString()}` : "-"}</span>;
            case "status": return (
                <Select value={lead.status} onValueChange={(v) => handleStatusChange(lead.id, v as LeadStatus)}>
                    <SelectTrigger className="h-7 text-xs w-[110px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{LEAD_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
            );
            case "source": return <span className="text-gray-500">{lead.source || "-"}</span>;
            case "lastActivity": return (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="text-gray-500 flex items-center gap-1 cursor-help"><Clock className="h-3 w-3" />{formatLastActivity(lead.lastContactedAt)}</span>
                    </TooltipTrigger>
                    <TooltipContent>{formatFullDate(lead.lastContactedAt)}</TooltipContent>
                </Tooltip>
            );
            case "score": {
                const score = lead.leadScore ?? calculateLeadScore(lead);
                return (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getScoreColor(score)}`}>
                                <Zap className="h-3 w-3" />
                                {score}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <div className="text-xs">
                                <p className="font-medium">Lead Score: {score}/100</p>
                                <p className="text-gray-400 mt-1">Based on: contact info, value, status, activity</p>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                );
            }
            case "tags": return lead.tags && lead.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                    {lead.tags.slice(0, 3).map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                            <Tag className="h-2 w-2 mr-0.5" />{tag}
                        </Badge>
                    ))}
                    {lead.tags.length > 3 && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 cursor-help">+{lead.tags.length - 3}</Badge>
                            </TooltipTrigger>
                            <TooltipContent>{lead.tags.slice(3).join(", ")}</TooltipContent>
                        </Tooltip>
                    )}
                </div>
            ) : <span className="text-gray-400">-</span>;
            default: return null;
        }
    };

    if (loading) return <div className="space-y-4"><h1 className="text-2xl font-bold">Leads</h1><TableSkeleton rows={10} columns={6} /></div>;

    return (
        <TooltipProvider>
            <div className="space-y-4">
                <QuickStatsBar leads={processedLeads} totalValue={totalValue} />

                {/* Header */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Link href="/dashboard/leads/new"><Button className="bg-gray-900 text-white hover:bg-gray-800"><Plus className="mr-2 h-4 w-4" /> New Lead</Button></Link>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="outline">Actions <ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={() => setShowImportWizard(true)}><Upload className="mr-2 h-4 w-4" /> Import</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => exportLeads(true)}><Download className="mr-2 h-4 w-4" /> Export All ({processedLeads.length})</DropdownMenuItem>
                                {selectedLeads.length > 0 && <DropdownMenuItem onClick={() => exportLeads(false)}><FileDown className="mr-2 h-4 w-4" /> Export Selected ({selectedLeads.length})</DropdownMenuItem>}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {selectedLeads.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="outline" className="border-blue-200 bg-blue-50 text-blue-700"><Badge className="mr-2 bg-blue-600">{selectionMode === "all" ? totalRecords : selectedLeads.length}</Badge>Bulk <ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    <DropdownMenuLabel>With {selectionMode === "all" ? totalRecords : selectedLeads.length} selected</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel className="text-xs text-gray-500">Change Status To</DropdownMenuLabel>
                                    {LEAD_STATUSES.map((s) => (
                                        <DropdownMenuItem key={s.value} onClick={() => handleBulkStatusUpdate(s.value as LeadStatus)}>
                                            <RefreshCcw className="mr-2 h-4 w-4" /> {s.label}
                                        </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleBatchEmail}>
                                        <Send className="mr-2 h-4 w-4" /> Send Email to Selected
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={openBulkEmailCompose}>
                                        <Mail className="mr-2 h-4 w-4" /> Compose Email...
                                    </DropdownMenuItem>
                                    {selectedLeads.length === 2 && (
                                        <DropdownMenuItem onClick={openMergeDialog}>
                                            <GitMerge className="mr-2 h-4 w-4" /> Merge Selected
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-red-600" onClick={handleBulkDelete}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <div className="flex items-center gap-2 ml-4 border-l pl-4">
                            <span className="text-sm text-gray-500">Show</span>
                            <Select value={recordsPerPage.toString()} onValueChange={(v) => { setRecordsPerPage(parseInt(v)); setCurrentPage(1); }}><SelectTrigger className="w-[70px] h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="30">30</SelectItem><SelectItem value="50">50</SelectItem><SelectItem value="100">100</SelectItem></SelectContent></Select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-1 max-w-xl justify-end">
                        <div className="relative flex-1 max-w-xs"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" /><Input placeholder="Search..." className="pl-9" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); handleClearSelection(); }} /></div>
                        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon"><LayoutList className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Density</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuRadioGroup value={rowDensity} onValueChange={(v) => setRowDensity(v as RowDensity)}><DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem><DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem><DropdownMenuRadioItem value="spacious">Spacious</DropdownMenuRadioItem></DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
                        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon"><Columns className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuLabel className="flex justify-between"><span>Columns</span><span className="text-xs text-gray-400">{visibleColumnsCount}/{DEFAULT_COLUMNS.length}</span></DropdownMenuLabel><DropdownMenuSeparator />{DEFAULT_COLUMNS.map((c) => <DropdownMenuCheckboxItem key={c.key} checked={columnVisibility[c.key]} onCheckedChange={() => toggleColumn(c.key)} disabled={c.required}>{c.label}</DropdownMenuCheckboxItem>)}<DropdownMenuSeparator /><div className="flex gap-1 p-1"><Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={showAllColumns}>All</Button><Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={resetColumns}>Reset</Button></div></DropdownMenuContent></DropdownMenu>
                        <Popover open={showFilters} onOpenChange={setShowFilters}><PopoverTrigger asChild><Button variant="outline" className={hasActiveFilters ? "border-blue-500 text-blue-600" : ""}><Filter className="mr-2 h-4 w-4" />Filters{hasActiveFilters && <Badge className="ml-2 bg-blue-600 text-white h-5 min-w-[20px] px-1 rounded-full text-[10px]">{(statusFilter !== "all" ? 1 : 0) + advancedFilters.length}</Badge>}</Button></PopoverTrigger><PopoverContent align="end" className="w-[520px]"><div className="space-y-4"><div className="flex items-center justify-between"><h4 className="font-medium">Filters</h4>{hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs">Clear</Button>}</div><div className="space-y-2"><label className="text-sm font-medium">Status</label><Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as LeadStatus | "all"); setCurrentPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{LEAD_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}><div className="flex gap-2"><span>{s.label}</span>{leadStats[s.value] !== undefined && <Badge variant="secondary" className="text-[10px] h-4 px-1">{leadStats[s.value]}</Badge>}</div></SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><label className="text-sm font-medium">Conditions</label><div className="space-y-2 max-h-48 overflow-y-auto">{advancedFilters.map((f, i) => <FilterRow key={f.id} filter={f} columns={DEFAULT_COLUMNS} onUpdate={updateFilter} onRemove={removeFilter} showLogic={i > 0} logic={filterLogic} onLogicChange={setFilterLogic} />)}</div><Button variant="outline" size="sm" onClick={addFilter} className="w-full"><PlusCircle className="mr-2 h-4 w-4" />Add condition</Button></div></div></PopoverContent></Popover>

                        {/* View Toggle */}
                        <div className="flex border rounded-md">
                            <Button variant={viewMode === "table" ? "default" : "ghost"} size="icon" className="rounded-r-none" onClick={() => setViewMode("table")}><Table2 className="h-4 w-4" /></Button>
                            <Button variant={viewMode === "kanban" ? "default" : "ghost"} size="icon" className="rounded-l-none" onClick={() => setViewMode("kanban")}><Kanban className="h-4 w-4" /></Button>
                        </div>

                        <Button variant="outline" size="icon" onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4" /></Button>

                        {/* Saved Views */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className={activeViewId ? "border-purple-500 text-purple-600" : ""}>
                                    <Bookmark className="mr-2 h-4 w-4" />
                                    Views
                                    {savedViews.length > 0 && <Badge className="ml-2 bg-purple-600 text-white h-5 min-w-[20px] px-1 rounded-full text-[10px]">{savedViews.length}</Badge>}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Saved Views</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {savedViews.length === 0 ? (
                                    <div className="px-2 py-3 text-sm text-gray-500 text-center">No saved views yet</div>
                                ) : (
                                    savedViews.map((view) => (
                                        <div key={view.id} className="flex items-center group">
                                            <DropdownMenuItem className="flex-1" onClick={() => applyView(view)}>
                                                <FolderOpen className="mr-2 h-4 w-4" />
                                                <span className="flex-1">{view.name}</span>
                                                {view.isDefault && <Badge variant="secondary" className="text-[10px] ml-1">Default</Badge>}
                                                {activeViewId === view.id && <Badge className="bg-purple-600 text-[10px] ml-1">Active</Badge>}
                                            </DropdownMenuItem>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                                                        <MoreVertical className="h-3 w-3" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => setViewAsDefault(view.id)}>
                                                        <Star className="mr-2 h-4 w-4" /> {view.isDefault ? "Remove Default" : "Set as Default"}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-red-600" onClick={() => deleteView(view.id)}>
                                                        <Trash className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    ))
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setShowSaveViewDialog(true)}>
                                    <BookmarkPlus className="mr-2 h-4 w-4" /> Save Current View
                                </DropdownMenuItem>
                                {activeViewId && (
                                    <DropdownMenuItem onClick={() => setActiveViewId(null)}>
                                        <X className="mr-2 h-4 w-4" /> Clear Active View
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Save View Dialog */}
                        <Popover open={showSaveViewDialog} onOpenChange={setShowSaveViewDialog}>
                            <PopoverContent align="end" className="w-72">
                                <div className="space-y-3">
                                    <h4 className="font-medium flex items-center gap-2"><Save className="h-4 w-4" /> Save Current View</h4>
                                    <Input placeholder="View name..." value={newViewName} onChange={(e) => setNewViewName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newViewName.trim()) saveCurrentView(newViewName.trim()); }} />
                                    <div className="flex gap-2">
                                        <Button size="sm" className="flex-1" disabled={!newViewName.trim()} onClick={() => saveCurrentView(newViewName.trim())}>Save</Button>
                                        <Button size="sm" variant="outline" className="flex-1" disabled={!newViewName.trim()} onClick={() => saveCurrentView(newViewName.trim(), true)}>Save as Default</Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {hasActiveFilters && <div className="flex items-center gap-2 text-sm flex-wrap"><span className="text-gray-500">Active:</span>{statusFilter !== "all" && <Badge variant="secondary" className="flex items-center gap-1">Status: {statusFilter}<button onClick={() => setStatusFilter("all")} className="ml-1 hover:text-red-500"><X className="h-3 w-3" /></button></Badge>}{advancedFilters.map((f, i) => <Badge key={f.id} variant="secondary" className="flex items-center gap-1">{i > 0 && <span className="text-gray-400 mr-1">{filterLogic}</span>}{f.field} {f.operator} {f.value && `"${f.value}"`}<button onClick={() => removeFilter(f.id)} className="ml-1 hover:text-red-500"><X className="h-3 w-3" /></button></Badge>)}</div>}

                <SelectionBanner selectionMode={selectionMode} selectedCount={selectedLeads.length} pageCount={paginatedLeads.length} totalCount={totalRecords} onSelectAll={handleSelectAllRecords} onClearSelection={handleClearSelection} />

                {viewMode === "table" ? (
                    <>
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalRecords={totalRecords} startRecord={totalRecords === 0 ? 0 : startIndex + 1} endRecord={endIndex} />

                        <div ref={tableRef} tabIndex={0} onKeyDown={handleTableKeyDown} className="border rounded-md bg-white overflow-x-auto focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                                            <TableHead className="w-12 text-center bg-gray-100/50 sticky left-0 z-10"><Checkbox checked={isAllPageSelected} ref={(el) => { if (el) (el as any).indeterminate = isSomeSelected; }} onCheckedChange={handleSelectAllCheckbox} /></TableHead>
                                            <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                                                {orderedColumns.map((col) => <DraggableColumnHeader key={col.key} column={col} sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} isVisible={columnVisibility[col.key]} />)}
                                            </SortableContext>
                                            <TableHead className="w-24 text-center bg-gray-100/50">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedLeads.length === 0 ? (
                                            <TableRow><TableCell colSpan={visibleColumnsCount + 2} className="text-center py-10 text-muted-foreground">{searchQuery ? "No matches" : "No leads"}</TableCell></TableRow>
                                        ) : (
                                            paginatedLeads.map((lead, index) => (
                                                <TableRow key={lead.id} className={`group hover:bg-gray-50 ${selectedLeads.includes(lead.id) ? 'bg-blue-50/50' : ''} ${lead.isStarred ? 'bg-yellow-50/30' : ''} ${focusedRowIndex === index ? 'ring-2 ring-inset ring-blue-500' : ''} ${ROW_DENSITY_STYLES[rowDensity]}`}>
                                                    <TableCell className="text-center sticky left-0 z-10 bg-white group-hover:bg-gray-50"><Checkbox checked={selectedLeads.includes(lead.id)} onCheckedChange={(c) => handleSelectLead(lead.id, !!c)} /></TableCell>
                                                    {orderedColumns.map((col) => columnVisibility[col.key] && <TableCell key={col.key} className={col.key === "name" ? "sticky left-12 z-10 bg-white group-hover:bg-gray-50" : ""}>{renderCell(lead, col)}</TableCell>)}
                                                    <TableCell>
                                                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleView(lead)}><ExternalLink className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>View</TooltipContent></Tooltip>
                                                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(lead)}><Pencil className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
                                                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(lead.id)}><Trash className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </DndContext>
                        </div>

                        <div className="flex items-center justify-between"><div className="text-sm text-gray-600 font-medium">Total: {totalRecords}</div><Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalRecords={totalRecords} startRecord={totalRecords === 0 ? 0 : startIndex + 1} endRecord={endIndex} compact /></div>
                        <div className="text-xs text-gray-400 text-center">↑↓ Navigate • Enter View • Space Select • Double-click Edit • Drag headers • ★ Star to pin</div>
                    </>
                ) : (
                    <KanbanBoard leads={processedLeads} onStatusChange={handleStatusChange} onView={handleView} onEdit={handleEdit} />
                )}

                <ImportWizard open={showImportWizard} onClose={() => setShowImportWizard(false)} module="leads" onSuccess={(count) => console.log(`Imported ${count}`)} />
                <LeadDetailsDialog open={detailsOpen} onClose={() => setDetailsOpen(false)} lead={selectedLead} onEdit={() => { setDetailsOpen(false); setEditOpen(true); }} />
                <LeadEditDialog open={editOpen} onClose={() => setEditOpen(false)} lead={selectedLead} onSave={handleSaveLead as any} />

                {/* Merge Dialog */}
                <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2"><GitMerge className="h-5 w-5" /> Merge Leads</DialogTitle>
                            <DialogDescription>Combine two leads into one. Missing fields from the source will be copied to the target.</DialogDescription>
                        </DialogHeader>
                        {mergeTargetLead && mergeSourceLead && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 border rounded-lg bg-green-50">
                                        <div className="text-xs text-green-600 font-medium mb-1">TARGET (Keep)</div>
                                        <p className="font-medium">{mergeTargetLead.name}</p>
                                        <p className="text-sm text-gray-500">{mergeTargetLead.email}</p>
                                    </div>
                                    <div className="p-3 border rounded-lg bg-red-50">
                                        <div className="text-xs text-red-600 font-medium mb-1">SOURCE (Delete)</div>
                                        <p className="font-medium">{mergeSourceLead.name}</p>
                                        <p className="text-sm text-gray-500">{mergeSourceLead.email}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowMergeDialog(false)}>Cancel</Button>
                            <Button onClick={handleMergeLeads} className="bg-green-600 hover:bg-green-700">Merge Leads</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Bulk Email Dialog */}
                <Dialog open={showBulkEmailDialog} onOpenChange={setShowBulkEmailDialog}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Compose Email</DialogTitle>
                            <DialogDescription>Send email to {selectedLeads.length} selected leads.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Subject</Label>
                                <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Enter subject..." />
                            </div>
                            <div className="space-y-2">
                                <Label>Message</Label>
                                <Textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder="Write your message..." className="min-h-[150px]" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowBulkEmailDialog(false)}>Cancel</Button>
                            <Button onClick={handleSendBulkEmail}><Send className="mr-2 h-4 w-4" /> Open in Email Client</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
}
