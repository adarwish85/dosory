"use client";

import { useState, useMemo, useCallback, useRef, useEffect, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
    Plus,
    Search,
    Filter,
    RefreshCw,
    Upload,
    Download,
    Trash2,
    ChevronDown,
    X,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    CheckSquare,
    Columns,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Pencil,
    Trash,
    ExternalLink,
    LayoutList,
    DollarSign,
    Users,
    TrendingUp,
    GripVertical,
    PlusCircle,
    Star,
    Clock,
    FileDown,
    Mail,
    Phone,
    RefreshCcw,
    BookmarkPlus,
    Save,
    FolderOpen,
    MoreVertical,
    Tag,
    Zap,
    Send,
    Kanban,
    Table2,
    GitMerge,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useLeads, usePermission } from "@/lib/hooks";
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
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

// DND Kit imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Dynamic imports
const ImportWizard = dynamic(() => import("@/components/import/ImportWizard"), {
    loading: () => <div className="text-sm text-gray-500">Loading...</div>,
    ssr: false,
});
const LeadDetailsDialog = dynamic(
    () => import("@/components/dashboard/leads/lead-details-dialog").then((mod) => ({ default: mod.LeadDetailsSheet })),
    { ssr: false }
);
const LeadEditDialog = dynamic(
    () => import("@/components/dashboard/leads/lead-edit-dialog").then((mod) => ({ default: mod.LeadEditSheet })),
    { ssr: false }
);
import { LeadsTable } from "@/components/dashboard/leads/leads-table"; // Added import

import { LEAD_STATUSES, STATUS_COLORS } from "@/lib/constants";
import { Timestamp } from "firebase/firestore";
import { formatDistanceToNow, format } from "date-fns";

// Types
type SelectionMode = "none" | "page" | "all";
type SortDirection = "asc" | "desc" | null;
type RowDensity = "compact" | "comfortable";
type ViewMode = "table" | "kanban";
type ColumnKey =
    | "starred"
    | "id"
    | "name"
    | "company"
    | "email"
    | "phone"
    | "value"
    | "status"
    | "source"
    | "lastActivity"
    | "score"
    | "tags";
type FilterOperator =
    | "contains"
    | "equals"
    | "startsWith"
    | "endsWith"
    | "isEmpty"
    | "isNotEmpty"
    | "greaterThan"
    | "lessThan";
type FilterLogic = "AND" | "OR";

interface ColumnDef {
    key: ColumnKey;
    label: string;
    defaultVisible: boolean;
    required?: boolean;
    sortable?: boolean;
    width?: string;
}
interface FilterCondition {
    id: string;
    field: ColumnKey;
    operator: FilterOperator;
    value: string;
}

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
    recordsPerPage?: number; // Added for saving page size
    isDefault?: boolean;
    columnWidths?: Record<string, number>;
    createdAt: number;
}

const SAVED_VIEWS_STORAGE_KEY = "leads_saved_views";

// Default pixel widths
const DEFAULT_COLUMN_WIDTHS: Record<ColumnKey, number> = {
    id: 60,
    starred: 40,
    name: 200,
    company: 150,
    email: 200,
    phone: 150,
    value: 100,
    status: 120,
    score: 80,
    tags: 150,
    source: 120,
    lastActivity: 150,
};

const DEFAULT_COLUMNS: ColumnDef[] = [
    { key: "starred", label: "★", defaultVisible: true },
    { key: "name", label: "Name", defaultVisible: true, required: true, sortable: true },
    { key: "company", label: "Company", defaultVisible: true, sortable: true },
    { key: "email", label: "Email", defaultVisible: true, sortable: true },
    { key: "phone", label: "Phone", defaultVisible: true },
    { key: "value", label: "Value", defaultVisible: true, sortable: true },
    { key: "status", label: "Status", defaultVisible: true, sortable: true },
    { key: "score", label: "Score", defaultVisible: true, sortable: true },
    { key: "tags", label: "Tags", defaultVisible: true },
    { key: "source", label: "Source", defaultVisible: false, sortable: true },
    { key: "lastActivity", label: "Last Activity", defaultVisible: false, sortable: true },
];

// Calculate lead score - now using shared utility
import { calculateLeadScore, getScoreColor } from "@/lib/utils/lead-score";

const FILTER_OPERATORS: { value: FilterOperator; label: string }[] = [
    { value: "contains", label: "Contains" },
    { value: "equals", label: "Equals" },
    { value: "startsWith", label: "Starts with" },
    { value: "endsWith", label: "Ends with" },
    { value: "isEmpty", label: "Is empty" },
    { value: "isNotEmpty", label: "Is not empty" },
    { value: "greaterThan", label: "Greater than" },
    { value: "lessThan", label: "Less than" },
];

const ROW_DENSITY_STYLES: Record<RowDensity, string> = { compact: "py-1 text-xs", comfortable: "py-2 text-sm" };

const getDefaultVisibleColumns = (): Record<ColumnKey, boolean> => {
    const v: Record<string, boolean> = {};
    DEFAULT_COLUMNS.forEach((col) => {
        v[col.key] = col.defaultVisible;
    });
    return v as Record<ColumnKey, boolean>;
};

// Format timestamp to relative time
function formatLastActivity(timestamp: Timestamp | undefined): string {
    if (!timestamp) return "-";
    try {
        const date = timestamp.toDate();
        return formatDistanceToNow(date, { addSuffix: true });
    } catch {
        return "-";
    }
}

function formatFullDate(timestamp: Timestamp | undefined): string {
    if (!timestamp) return "No activity";
    try {
        return format(timestamp.toDate(), "PPpp");
    } catch {
        return "No activity";
    }
}

// QuickViewCard moved to leads-table.tsx

// DraggableColumnHeader moved to leads-table.tsx

// HighlightText moved to leads-table.tsx

// Quick Stats
function QuickStatsBar({ leads, totalValue, totalCount }: { leads: Lead[]; totalValue: number; totalCount?: number }) {
    const qualifiedCount = leads.filter((l) => l.status === "qualified").length;
    const starredCount = leads.filter((l) => l.isStarred).length;
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Total</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">
                    {totalCount !== undefined ? totalCount : leads.length}
                </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Value</span>
                </div>
                <div className="text-2xl font-bold text-green-900">${totalValue.toLocaleString()}</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-yellow-600 mb-1">
                    <Star className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Starred</span>
                </div>
                <div className="text-2xl font-bold text-yellow-900">{starredCount}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-purple-600 mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Qualified</span>
                </div>
                <div className="text-2xl font-bold text-purple-900">{qualifiedCount}</div>
            </div>
        </div>
    );
}

// Filter Row
function FilterRow({
    filter,
    columns,
    onUpdate,
    onRemove,
    showLogic,
    logic,
    onLogicChange,
}: {
    filter: FilterCondition;
    columns: ColumnDef[];
    onUpdate: (id: string, updates: Partial<FilterCondition>) => void;
    onRemove: (id: string) => void;
    showLogic: boolean;
    logic: FilterLogic;
    onLogicChange: (l: FilterLogic) => void;
}) {
    const needsValue = !["isEmpty", "isNotEmpty"].includes(filter.operator);
    return (
        <div className="flex items-center gap-2">
            {showLogic ? (
                <Select value={logic} onValueChange={(v) => onLogicChange(v as FilterLogic)}>
                    <SelectTrigger className="w-[70px] h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="AND">AND</SelectItem>
                        <SelectItem value="OR">OR</SelectItem>
                    </SelectContent>
                </Select>
            ) : (
                <div className="w-[70px] text-xs text-gray-500 text-center">Where</div>
            )}
            <Select value={filter.field} onValueChange={(v) => onUpdate(filter.id, { field: v as ColumnKey })}>
                <SelectTrigger className="w-[100px] h-8 text-xs">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {columns
                        .filter((c) => c.key !== "starred" && c.key !== "lastActivity")
                        .map((c) => (
                            <SelectItem key={c.key} value={c.key}>
                                {c.label}
                            </SelectItem>
                        ))}
                </SelectContent>
            </Select>
            <Select
                value={filter.operator}
                onValueChange={(v) => onUpdate(filter.id, { operator: v as FilterOperator })}
            >
                <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {FILTER_OPERATORS.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                            {op.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {needsValue && (
                <Input
                    value={filter.value}
                    onChange={(e) => onUpdate(filter.id, { value: e.target.value })}
                    placeholder="Value..."
                    className="w-[120px] h-8 text-xs"
                />
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRemove(filter.id)}>
                <X className="h-4 w-4" />
            </Button>
        </div>
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
                        All <strong>{selectedCount}</strong> on page selected.
                    </span>
                    {totalCount > pageCount && (
                        <button onClick={onSelectAll} className="text-blue-600 font-medium hover:underline">
                            Select all {totalCount}
                        </button>
                    )}
                </>
            ) : (
                <>
                    <span className="text-blue-800">
                        All <strong>{totalCount}</strong> selected.
                    </span>
                    <button onClick={onClearSelection} className="text-blue-600 font-medium hover:underline">
                        Clear
                    </button>
                </>
            )}
        </div>
    );
}

// Pagination
function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    totalRecords,
    startRecord,
    endRecord,
    compact = false,
}: {
    currentPage: number;
    totalPages: number;
    onPageChange: (p: number) => void;
    totalRecords: number;
    startRecord: number;
    endRecord: number;
    compact?: boolean;
}) {
    const canPrev = currentPage > 1,
        canNext = currentPage < totalPages;
    return (
        <div className={`flex items-center ${compact ? "gap-1" : "justify-between gap-4"}`}>
            {!compact && (
                <div className="text-sm text-gray-500">
                    Showing {startRecord} to {endRecord} of {totalRecords}
                </div>
            )}
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(1)}
                    disabled={!canPrev}
                >
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={!canPrev}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1 px-2 text-sm">
                    <span className="text-gray-700">Page</span>
                    <span className="font-medium">{currentPage}</span>
                    <span className="text-gray-700">of {totalPages}</span>
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={!canNext}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(totalPages)}
                    disabled={!canNext}
                >
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

// InlineEditCell moved to leads-table.tsx

// Kanban Board Component
function KanbanBoard({
    leads,
    onStatusChange,
    onView,
    onEdit,
    canEdit = false,
}: {
    leads: Lead[];
    onStatusChange: (id: string, status: LeadStatus) => void;
    onView: (lead: Lead) => void;
    onEdit: (lead: Lead) => void;
    canEdit?: boolean;
}) {
    const statusColumns = LEAD_STATUSES.filter((s) => !["won", "lost", "junk"].includes(s.value));
    const closedStatuses = LEAD_STATUSES.filter((s) => ["won", "lost", "junk"].includes(s.value));

    const getLeadsByStatus = (status: LeadStatus) => leads.filter((l) => l.status === status);

    const handleDragStart = (e: React.DragEvent, leadId: string) => {
        e.dataTransfer.setData("leadId", leadId);
    };

    const handleDrop = (e: React.DragEvent, newStatus: LeadStatus) => {
        e.preventDefault();
        if (!canEdit) return;
        const leadId = e.dataTransfer.getData("leadId");
        if (leadId) onStatusChange(leadId, newStatus);
    };

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();

    const renderLeadCard = (lead: Lead) => {
        const score = lead.leadScore ?? calculateLeadScore(lead);
        return (
            <div
                key={lead.id}
                draggable={canEdit}
                onDragStart={(e) => canEdit && handleDragStart(e, lead.id)}
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
                            {lead.company && (
                                <p className="text-xs text-gray-500 truncate max-w-[120px]">{lead.company}</p>
                            )}
                        </div>
                    </div>
                    {lead.isStarred && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                </div>
                <div className="flex items-center gap-2 mb-2">
                    <Badge className={`text-[10px] px-1.5 py-0 ${getScoreColor(score)}`}>
                        <Zap className="h-2 w-2 mr-0.5" />
                        {score}
                    </Badge>
                    {lead.value && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            ${lead.value.toLocaleString()}
                        </Badge>
                    )}
                </div>
                {lead.tags && lead.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {lead.tags.slice(0, 2).map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-[9px] px-1 py-0">
                                {tag}
                            </Badge>
                        ))}
                    </div>
                )}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onView(lead)}>
                        <ExternalLink className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(lead)}>
                        <Pencil className="h-3 w-3" />
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="flex gap-4 overflow-x-auto pb-4">
            {statusColumns.map((status) => {
                const statusLeads = getLeadsByStatus(status.value as LeadStatus);
                const statusColor = STATUS_COLORS[status.value as LeadStatus] || {
                    bg: "bg-gray-50",
                    text: "text-gray-600",
                };
                return (
                    <div
                        key={status.value}
                        className="flex-shrink-0 w-72 bg-gray-50 rounded-lg p-3"
                        onDrop={(e) => handleDrop(e, status.value as LeadStatus)}
                        onDragOver={handleDragOver}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <Badge className={`${statusColor.bg} ${statusColor.text} border-0`}>{status.label}</Badge>
                            <Badge variant="outline" className="text-xs">
                                {statusLeads.length}
                            </Badge>
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
                                <Badge variant="outline" className="text-[10px]">
                                    {statusLeads.length}
                                </Badge>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function LeadsPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    const [selectionMode, setSelectionMode] = useState<SelectionMode>("none");
    const [showImportWizard, setShowImportWizard] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage, setRecordsPerPage] = useState(10);
    const [columnVisibility, setColumnVisibility] = useState<Record<ColumnKey, boolean>>(getDefaultVisibleColumns);
    const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(DEFAULT_COLUMNS.map((c) => c.key));
    const [sortKey, setSortKey] = useState<ColumnKey | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [rowDensity, setRowDensity] = useState<RowDensity>("comfortable");
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(DEFAULT_COLUMN_WIDTHS);

    // Column Resizing Logic
    const handleColumnResize = useCallback(
        (e: React.MouseEvent, key: ColumnKey) => {
            e.preventDefault();
            const startX = e.pageX;
            const startWidth = columnWidths[key] || 100;

            const onMouseMove = (moveEvent: MouseEvent) => {
                const diff = moveEvent.pageX - startX;
                setColumnWidths((prev) => ({
                    ...prev,
                    [key]: Math.max(50, startWidth + diff), // Min width 50px
                }));
            };

            const onMouseUp = () => {
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
            };

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        },
        [columnWidths]
    );
    const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
    const [advancedFilters, setAdvancedFilters] = useState<FilterCondition[]>([]);
    const [filterLogic, setFilterLogic] = useState<FilterLogic>("AND");
    const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    // Saved views state
    const [savedViews, setSavedViews] = useState<SavedView[]>([]);
    const [viewsLoaded, setViewsLoaded] = useState(false);
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
                const defaultView = views.find((v) => v.isDefault);
                if (defaultView) {
                    applyView(defaultView);
                }
            }
        } catch (e) {
            console.error("Failed to load saved views", e);
        } finally {
            setViewsLoaded(true);
        }
    }, []);

    // Save views to localStorage whenever they change
    useEffect(() => {
        // Only save if views have been loaded to avoid overwriting with initial empty state
        if (viewsLoaded) {
            localStorage.setItem(SAVED_VIEWS_STORAGE_KEY, JSON.stringify(savedViews));
        }
    }, [savedViews, viewsLoaded]);

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
        if (view.columnWidths) setColumnWidths(view.columnWidths);
        if (view.recordsPerPage) setRecordsPerPage(view.recordsPerPage);
        setActiveViewId(view.id);
        setCurrentPage(1);
    }, []);

    // Update existing view
    const updateCurrentView = useCallback(() => {
        if (!activeViewId) return;
        setSavedViews((prev) =>
            prev.map((v) => {
                if (v.id === activeViewId) {
                    return {
                        ...v,
                        columnVisibility,
                        columnOrder,
                        sortKey,
                        sortDirection,
                        advancedFilters,
                        filterLogic,
                        statusFilter,
                        rowDensity,
                        columnWidths,
                        recordsPerPage,
                        updatedAt: Date.now(),
                    };
                }
                return v;
            })
        );
        setNewViewName("");
        setShowSaveViewDialog(false);
    }, [
        activeViewId,
        columnVisibility,
        columnOrder,
        sortKey,
        sortDirection,
        advancedFilters,
        filterLogic,
        statusFilter,
        rowDensity,
        columnWidths,
        recordsPerPage,
    ]);

    // Save current state as a new view
    const saveCurrentView = useCallback(
        (name: string, setAsDefault: boolean = false) => {
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
                columnWidths,
                recordsPerPage,
                isDefault: setAsDefault,
                createdAt: Date.now(),
            };
            setSavedViews((prev) => {
                const updated = setAsDefault ? prev.map((v) => ({ ...v, isDefault: false })) : prev;
                return [...updated, newView];
            });
            setActiveViewId(newView.id);
            setNewViewName("");
            setShowSaveViewDialog(false);
        },
        [
            columnVisibility,
            columnOrder,
            sortKey,
            sortDirection,
            advancedFilters,
            filterLogic,
            statusFilter,
            rowDensity,
            columnWidths,
            recordsPerPage,
        ]
    );

    // Delete a saved view
    const deleteView = useCallback(
        (viewId: string) => {
            setSavedViews((prev) => {
                const updated = prev.filter((v) => v.id !== viewId);
                if (updated.length === 0) localStorage.removeItem(SAVED_VIEWS_STORAGE_KEY);
                return updated;
            });
            if (activeViewId === viewId) setActiveViewId(null);
        },
        [activeViewId]
    );

    // Set a view as default
    const setViewAsDefault = useCallback((viewId: string) => {
        setSavedViews((prev) => prev.map((v) => ({ ...v, isDefault: v.id === viewId })));
    }, []);

    // State for Search Debounce
    const [localSearch, setLocalSearch] = useState(searchQuery);

    const isSearching = !!searchQuery.trim();
    const isClientMode = isSearching;

    const tableRef = useRef<HTMLDivElement>(null);
    const {
        leads,
        loading,
        createLead: addLead,
        updateLead,
        deleteLead,
        bulkDeleteLeads,
        bulkDeleteAllMatches,
        leadStats,
        totalRecords: serverTotal,
    } = useLeads({
        limit: isClientMode ? 1000 : recordsPerPage,
        page: isClientMode ? 1 : currentPage,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        orderByField: (sortKey || "createdAt") as any, // Use createdAt as default - lastActivity might not exist on all docs
        orderDirection: sortDirection || "desc",
        searchQuery: searchQuery, // Add search query to hook!
    });

    const { can } = usePermission();
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );
    const orderedColumns = useMemo(
        () => columnOrder.map((key) => DEFAULT_COLUMNS.find((c) => c.key === key)!).filter(Boolean),
        [columnOrder]
    );

    // Server-side loaded data is ALREADY processed.
    const processedLeads = leads;

    // Total records come from server
    const totalRecords = serverTotal;
    const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + recordsPerPage, totalRecords);

    // Pagination is handled by server, so "paginatedLeads" is just "processedLeads"
    const paginatedLeads = processedLeads;
    const currentPageIds = useMemo(() => paginatedLeads.map((l) => l.id), [paginatedLeads]);

    const visibleColumnsCount = Object.values(columnVisibility).filter(Boolean).length;

    // Export function
    const exportLeads = useCallback(
        (exportAll: boolean) => {
            const dataToExport = exportAll
                ? processedLeads
                : processedLeads.filter((l) => selectedLeads.includes(l.id));
            if (dataToExport.length === 0) {
                alert("No leads to export");
                return;
            }

            const headers = [
                "Name",
                "Company",
                "Email",
                "Phone",
                "Value",
                "Status",
                "Source",
                "Last Activity",
                "Starred",
            ];
            const csvContent = [
                headers.join(","),
                ...dataToExport.map((lead) =>
                    [
                        `"${lead.name || ""}"`,
                        `"${lead.company || ""}"`,
                        `"${lead.email || ""}"`,
                        `"${lead.phone || ""}"`,
                        lead.value || 0,
                        lead.status,
                        `"${lead.source || ""}"`,
                        lead.lastContactedAt ? `"${formatFullDate(lead.lastContactedAt)}"` : "",
                        lead.isStarred ? "Yes" : "No",
                    ].join(",")
                ),
            ].join("\n");

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `leads_export_${new Date().toISOString().split("T")[0]}.csv`;
            link.click();
        },
        [processedLeads, selectedLeads]
    );

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id)
            setColumnOrder((items) =>
                arrayMove(items, items.indexOf(active.id as ColumnKey), items.indexOf(over.id as ColumnKey))
            );
    }, []);

    const handleSort = useCallback(
        (key: ColumnKey) => {
            if (sortKey === key) {
                if (sortDirection === "asc") setSortDirection("desc");
                else {
                    setSortKey(null);
                    setSortDirection(null);
                }
            } else {
                setSortKey(key);
                setSortDirection("asc");
            }
        },
        [sortKey, sortDirection]
    );

    const toggleColumn = useCallback((key: ColumnKey) => {
        const col = DEFAULT_COLUMNS.find((c) => c.key === key);
        if (col?.required) return;
        setColumnVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);
    const showAllColumns = useCallback(() => {
        const v: Record<string, boolean> = {};
        DEFAULT_COLUMNS.forEach((c) => {
            v[c.key] = true;
        });
        setColumnVisibility(v as Record<ColumnKey, boolean>);
    }, []);
    const resetColumns = useCallback(() => {
        setColumnVisibility(getDefaultVisibleColumns());
        setColumnOrder(DEFAULT_COLUMNS.map((c) => c.key));
    }, []);

    const addFilter = useCallback(
        () =>
            setAdvancedFilters((prev) => [
                ...prev,
                { id: crypto.randomUUID(), field: "name", operator: "contains", value: "" },
            ]),
        []
    );
    const updateFilter = useCallback(
        (id: string, updates: Partial<FilterCondition>) =>
            setAdvancedFilters((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f))),
        []
    );
    const removeFilter = useCallback((id: string) => setAdvancedFilters((prev) => prev.filter((f) => f.id !== id)), []);

    const handleSelectAllOnPage = useCallback(() => {
        setSelectedLeads(currentPageIds);
        setSelectionMode("page");
    }, [currentPageIds]);
    const handleSelectAllRecords = useCallback(() => {
        setSelectedLeads([]);
        setSelectionMode("all");
    }, []);
    const handleClearSelection = useCallback(() => {
        setSelectedLeads([]);
        setSelectionMode("none");
    }, []);
    const handleSelectAllCheckbox = useCallback(
        (checked: boolean) => {
            if (checked) handleSelectAllOnPage();
            else handleClearSelection();
        },
        [handleSelectAllOnPage, handleClearSelection]
    );

    // Debounce Search Effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearch !== searchQuery) {
                setSearchQuery(localSearch);
                setCurrentPage(1);
                handleClearSelection();
            }
        }, 500); // 500ms delay
        return () => clearTimeout(timer);
    }, [localSearch, searchQuery, handleClearSelection]);

    const handleSelectLead = useCallback(
        (leadId: string, checked: boolean) => {
            if (selectionMode === "all") {
                setSelectionMode("page");
                setSelectedLeads(paginatedLeads.map((l) => l.id).filter((id) => id !== leadId));
            } else {
                if (checked) {
                    setSelectedLeads((prev) => [...prev, leadId]);
                    if (selectedLeads.length + 1 === paginatedLeads.length) setSelectionMode("page");
                } else {
                    setSelectedLeads((prev) => prev.filter((id) => id !== leadId));
                    if (selectedLeads.length - 1 === 0) setSelectionMode("none");
                }
            }
        },
        [selectionMode, paginatedLeads, selectedLeads.length]
    );
    const isAllPageSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedLeads.includes(id));
    const isSomeSelected = selectedLeads.length > 0 && !isAllPageSelected;

    const handleView = useCallback(
        (lead: Lead) => {
            router.push(`/dashboard/leads/${lead.id}`);
        },
        [router]
    );
    const handleEdit = useCallback((lead: Lead) => {
        setSelectedLead(lead);
        setEditOpen(true);
    }, []);
    const handleDelete = useCallback(
        async (id: string) => {
            if (window.confirm("Delete?")) await deleteLead(id);
        },
        [deleteLead]
    );
    const handleBulkDelete = useCallback(async () => {
        if (selectedLeads.length === 0 && selectionMode !== "all") return;

        // Safety check
        const isAll = selectionMode === "all";
        const count = isAll ? totalRecords : selectedLeads.length;

        if (!window.confirm(`Are you sure you want to delete ${count} leads? This action cannot be undone.`)) {
            return;
        }

        try {
            if (isAll) {
                await bulkDeleteAllMatches();
                alert(`Successfully deleted ${count} leads.`);
            } else {
                await bulkDeleteLeads(selectedLeads);
            }
            handleClearSelection();
        } catch (error) {
            console.error("Bulk delete failed:", error);
            alert("Failed to delete leads. Please try again.");
        }
    }, [selectedLeads, selectionMode, totalRecords, bulkDeleteLeads, bulkDeleteAllMatches, handleClearSelection]);
    const handleInlineEdit = useCallback(
        async (id: string, field: ColumnKey, value: string) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await updateLead(id, { [field]: value } as any);
        },
        [updateLead]
    );
    const handleSaveLead = useCallback(
        async (id: string, data: Partial<Lead>) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await updateLead(id, data as any);
            if (selectedLead?.id === id) setSelectedLead({ ...selectedLead, ...data } as Lead);
        },
        [updateLead, selectedLead]
    );
    const handleStatusChange = useCallback(
        async (leadId: string, newStatus: LeadStatus) => {
            await updateLead(leadId, { status: newStatus });
        },
        [updateLead]
    );
    const handleToggleStar = useCallback(
        async (leadId: string, isStarred: boolean) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await updateLead(leadId, { isStarred } as any);
        },
        [updateLead]
    );

    // Bulk status update
    const handleBulkStatusUpdate = useCallback(
        async (newStatus: LeadStatus) => {
            if (selectedLeads.length === 0) return;
            if (
                window.confirm(
                    `Update ${selectionMode === "all" ? totalRecords : selectedLeads.length} leads to "${newStatus}"?`
                )
            ) {
                for (const id of selectedLeads) await updateLead(id, { status: newStatus });
                handleClearSelection();
            }
        },
        [selectedLeads, selectionMode, totalRecords, updateLead, handleClearSelection]
    );

    // Duplicate detection
    const findDuplicates = useCallback(
        (email: string, phone: string, excludeId?: string): Lead[] => {
            return leads.filter((l) => {
                if (excludeId && l.id === excludeId) return false;
                const emailMatch = email && l.email && l.email.toLowerCase() === email.toLowerCase();
                const phoneMatch = phone && l.phone && l.phone.replace(/\D/g, "") === phone.replace(/\D/g, "");
                return emailMatch || phoneMatch;
            });
        },
        [leads]
    );

    // Batch email - open mailto with all selected leads
    const handleBatchEmail = useCallback(() => {
        const selectedLeadData = processedLeads.filter((l) => selectedLeads.includes(l.id));
        const emails = selectedLeadData.filter((l) => l.email).map((l) => l.email);
        if (emails.length === 0) {
            alert("No email addresses found in selected leads");
            return;
        }
        const mailto = `mailto:${emails.join(",")}?subject=Follow-up with Leads`;
        window.open(mailto, "_blank");
    }, [processedLeads, selectedLeads]);

    // Open bulk email compose dialog
    const openBulkEmailCompose = useCallback(() => {
        const selectedLeadData = processedLeads.filter((l) => selectedLeads.includes(l.id));
        const leadsWithEmail = selectedLeadData.filter((l) => l.email);
        if (leadsWithEmail.length === 0) {
            alert("No email addresses found in selected leads");
            return;
        }
        setEmailBody(`Dear Lead,\n\nThank you for your interest. We would like to follow up...\n\nBest regards`);
        setShowBulkEmailDialog(true);
    }, [processedLeads, selectedLeads]);

    // Handle sending bulk email
    const handleSendBulkEmail = useCallback(() => {
        const selectedLeadData = processedLeads.filter((l) => selectedLeads.includes(l.id));
        const emails = selectedLeadData.filter((l) => l.email).map((l) => l.email);
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
        const selected = processedLeads.filter((l) => selectedLeads.includes(l.id));
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
        if (!mergeTargetLead.description && mergeSourceLead.description)
            mergedData.description = mergeSourceLead.description;
        // Merge tags
        const mergedTags = [...(mergeTargetLead.tags || []), ...(mergeSourceLead.tags || [])];
        mergedData.tags = [...new Set(mergedTags)];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await updateLead(mergeTargetLead.id, mergedData as any);
        await deleteLead(mergeSourceLead.id);
        setShowMergeDialog(false);
        setMergeTargetLead(null);
        setMergeSourceLead(null);
        handleClearSelection();
    }, [mergeTargetLead, mergeSourceLead, updateLead, deleteLead, handleClearSelection]);

    const clearAllFilters = useCallback(() => {
        setStatusFilter("all");
        setSearchQuery("");
        setAdvancedFilters([]);
        setCurrentPage(1);
        handleClearSelection();
    }, [handleClearSelection]);

    const handleTableKeyDown = useCallback(
        (e: KeyboardEvent<HTMLDivElement>) => {
            if (paginatedLeads.length === 0) return;
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setFocusedRowIndex((prev) => (prev === null ? 0 : Math.min(prev + 1, paginatedLeads.length - 1)));
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setFocusedRowIndex((prev) => (prev === null ? 0 : Math.max(prev - 1, 0)));
                    break;
                case "Enter":
                    if (focusedRowIndex !== null) handleView(paginatedLeads[focusedRowIndex]);
                    break;
                case " ":
                    e.preventDefault();
                    if (focusedRowIndex !== null) {
                        const l = paginatedLeads[focusedRowIndex];
                        handleSelectLead(l.id, !selectedLeads.includes(l.id));
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
        },
        [paginatedLeads, focusedRowIndex, handleView, handleSelectLead, selectedLeads, handleBulkDelete]
    );

    const hasActiveFilters = statusFilter !== "all" || advancedFilters.length > 0;

    // renderCell moved to LeadsTable

    if (loading)
        return (
            <div className="space-y-4">
                <h1 className="text-2xl font-bold">Leads</h1>
                <TableSkeleton rows={10} columns={6} />
            </div>
        );

    return (
        <TooltipProvider>
            <div className="space-y-4">
                <QuickStatsBar leads={processedLeads} totalValue={leadStats.totalValue} totalCount={leadStats.total} />

                {/* Header */}
                {/* Header Actions Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        {can("leads-create") && (
                            <Link href="/dashboard/leads/new">
                                <Button className="bg-gray-900 text-white hover:bg-gray-800">
                                    <Plus className="mr-2 h-4 w-4" /> New Lead
                                </Button>
                            </Link>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                {can("leads-create") && (
                                    <DropdownMenuItem onClick={() => setShowImportWizard(true)}>
                                        <Upload className="mr-2 h-4 w-4" /> Import
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => exportLeads(true)}>
                                    <Download className="mr-2 h-4 w-4" /> Export All ({processedLeads.length})
                                </DropdownMenuItem>
                                {selectedLeads.length > 0 && (
                                    <DropdownMenuItem onClick={() => exportLeads(false)}>
                                        <FileDown className="mr-2 h-4 w-4" /> Export Selected ({selectedLeads.length})
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {selectedLeads.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                                        <Badge className="mr-2 bg-blue-600">
                                            {selectionMode === "all" ? totalRecords : selectedLeads.length}
                                        </Badge>
                                        Bulk <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    <DropdownMenuLabel>
                                        With {selectionMode === "all" ? totalRecords : selectedLeads.length} selected
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {can("leads-edit") && (
                                        <>
                                            <DropdownMenuLabel className="text-xs text-gray-500">
                                                Change Status To
                                            </DropdownMenuLabel>
                                            {LEAD_STATUSES.map((s) => (
                                                <DropdownMenuItem
                                                    key={s.value}
                                                    onClick={() => handleBulkStatusUpdate(s.value as LeadStatus)}
                                                >
                                                    <RefreshCcw className="mr-2 h-4 w-4" /> {s.label}
                                                </DropdownMenuItem>
                                            ))}
                                            <DropdownMenuSeparator />
                                        </>
                                    )}
                                    <DropdownMenuItem onClick={handleBatchEmail}>
                                        <Send className="mr-2 h-4 w-4" /> Send Email to Selected
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={openBulkEmailCompose}>
                                        <Mail className="mr-2 h-4 w-4" /> Compose Email...
                                    </DropdownMenuItem>
                                    {selectedLeads.length === 2 && can("leads-edit") && (
                                        <DropdownMenuItem onClick={openMergeDialog}>
                                            <GitMerge className="mr-2 h-4 w-4" /> Merge Selected
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    {can("leads-delete") && (
                                        <DropdownMenuItem className="text-red-600" onClick={handleBulkDelete}>
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>

                    <div className="flex items-center gap-2 flex-1 w-full max-w-md mx-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search name, company, email..."
                                className="pl-9"
                                value={localSearch}
                                onChange={(e) => setLocalSearch(e.target.value)}
                            />
                        </div>

                        <Popover open={showFilters} onOpenChange={setShowFilters}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={hasActiveFilters ? "border-blue-500 text-blue-600" : ""}
                                >
                                    <Filter className="mr-2 h-4 w-4" />
                                    Filters
                                    {hasActiveFilters && (
                                        <Badge className="ml-2 bg-blue-600 text-white h-5 min-w-[20px] px-1 rounded-full text-[10px]">
                                            {(statusFilter !== "all" ? 1 : 0) + advancedFilters.length}
                                        </Badge>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-[520px]">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium">Filters</h4>
                                        {hasActiveFilters && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={clearAllFilters}
                                                className="text-xs"
                                            >
                                                Clear
                                            </Button>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Status</label>
                                        <Select
                                            value={statusFilter}
                                            onValueChange={(v) => {
                                                setStatusFilter(v as LeadStatus | "all");
                                                setCurrentPage(1);
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All</SelectItem>
                                                {LEAD_STATUSES.map((s) => (
                                                    <SelectItem key={s.value} value={s.value}>
                                                        <div className="flex gap-2">
                                                            <span>{s.label}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Conditions</label>
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {advancedFilters.map((f, i) => (
                                                <FilterRow
                                                    key={f.id}
                                                    filter={f}
                                                    columns={DEFAULT_COLUMNS}
                                                    onUpdate={updateFilter}
                                                    onRemove={removeFilter}
                                                    showLogic={i > 0}
                                                    logic={filterLogic}
                                                    onLogicChange={setFilterLogic}
                                                />
                                            ))}
                                        </div>
                                        <Button variant="outline" size="sm" onClick={addFilter} className="w-full">
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Add condition
                                        </Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Unified Views Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={activeViewId ? "border-purple-500 text-purple-600" : ""}
                                >
                                    <LayoutList className="mr-2 h-4 w-4" />
                                    Display
                                    {(activeViewId || savedViews.length > 0) && (
                                        <Badge className="ml-2 bg-purple-600 text-white h-5 min-w-[20px] px-1 rounded-full text-[10px]">
                                            {activeViewId ? 1 : savedViews.length}
                                        </Badge>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                                <DropdownMenuLabel>Layout</DropdownMenuLabel>
                                <div className="px-2 py-1">
                                    <div className="flex bg-gray-100 p-1 rounded-md">
                                        <button
                                            onClick={() => setViewMode("table")}
                                            className={`flex-1 flex items-center justify-center p-1 rounded text-xs font-medium transition-all ${viewMode === "table" ? "bg-white shadow" : "text-gray-500 hover:text-gray-900"}`}
                                        >
                                            <Table2 className="h-3 w-3 mr-1" /> Table
                                        </button>
                                        <button
                                            onClick={() => setViewMode("kanban")}
                                            className={`flex-1 flex items-center justify-center p-1 rounded text-xs font-medium transition-all ${viewMode === "kanban" ? "bg-white shadow" : "text-gray-500 hover:text-gray-900"}`}
                                        >
                                            <Kanban className="h-3 w-3 mr-1" /> Board
                                        </button>
                                    </div>
                                </div>
                                <DropdownMenuSeparator />

                                <DropdownMenuLabel>Density</DropdownMenuLabel>
                                <DropdownMenuRadioGroup
                                    value={rowDensity}
                                    onValueChange={(v) => setRowDensity(v as RowDensity)}
                                >
                                    <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                                <DropdownMenuSeparator />

                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                        <Columns className="h-4 w-4 mr-2" /> Columns ({visibleColumnsCount})
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                        <DropdownMenuSubContent className="w-48">
                                            <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {DEFAULT_COLUMNS.map((c) => (
                                                <DropdownMenuCheckboxItem
                                                    key={c.key}
                                                    checked={columnVisibility[c.key]}
                                                    onCheckedChange={() => toggleColumn(c.key)}
                                                    disabled={c.required}
                                                >
                                                    {c.label}
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                            <DropdownMenuSeparator />
                                            <div className="flex gap-1 p-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="flex-1 text-xs"
                                                    onClick={showAllColumns}
                                                >
                                                    All
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="flex-1 text-xs"
                                                    onClick={resetColumns}
                                                >
                                                    Reset
                                                </Button>
                                            </div>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuSub>
                                <DropdownMenuSeparator />

                                <DropdownMenuLabel>Saved Views</DropdownMenuLabel>
                                {savedViews.length === 0 ? (
                                    <div className="px-2 py-2 text-xs text-gray-500 text-center italic">
                                        No saved views
                                    </div>
                                ) : (
                                    savedViews.map((view) => (
                                        <div key={view.id} className="flex items-center group">
                                            <DropdownMenuItem className="flex-1" onClick={() => applyView(view)}>
                                                <FolderOpen className="mr-2 h-4 w-4" />
                                                <span className="flex-1 truncate">{view.name}</span>
                                                {view.isDefault && (
                                                    <Badge variant="secondary" className="text-[10px] ml-1">
                                                        Default
                                                    </Badge>
                                                )}
                                                {activeViewId === view.id && (
                                                    <Badge className="bg-purple-600 text-[10px] ml-1">Active</Badge>
                                                )}
                                            </DropdownMenuItem>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 opacity-0 group-hover:opacity-100"
                                                    >
                                                        <MoreVertical className="h-3 w-3" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => setViewAsDefault(view.id)}>
                                                        <Star className="mr-2 h-4 w-4" />{" "}
                                                        {view.isDefault ? "Remove Default" : "Set as Default"}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-red-600"
                                                        onClick={() => deleteView(view.id)}
                                                    >
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
                                        <X className="mr-2 h-4 w-4" /> Reset to Default
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button variant="outline" size="icon" onClick={() => window.location.reload()}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Save View Dialog */}
                {/* Save View Dialog */}
                <Dialog open={showSaveViewDialog} onOpenChange={setShowSaveViewDialog}>
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Save className="h-5 w-5" /> Save Current View
                            </DialogTitle>
                            <DialogDescription>
                                Save your current filters, columns, and sort preferences.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label htmlFor="view-name">View Name</Label>
                                <Input
                                    id="view-name"
                                    placeholder="e.g. High Value Leads"
                                    value={newViewName}
                                    onChange={(e) => setNewViewName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && newViewName.trim())
                                            saveCurrentView(newViewName.trim());
                                    }}
                                />
                            </div>
                        </div>
                        <DialogFooter className="flex-col sm:flex-col gap-2">
                            <div className="flex gap-2 w-full">
                                <Button
                                    className="flex-1"
                                    disabled={!newViewName.trim()}
                                    onClick={() => saveCurrentView(newViewName.trim())}
                                >
                                    Save New
                                </Button>
                                {activeViewId && (
                                    <Button variant="secondary" className="flex-1" onClick={updateCurrentView}>
                                        Update Active
                                    </Button>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                className="w-full"
                                disabled={!newViewName.trim()}
                                onClick={() => saveCurrentView(newViewName.trim(), true)}
                            >
                                Save as Default View
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {hasActiveFilters && (
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                        <span className="text-gray-500">Active:</span>
                        {statusFilter !== "all" && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                                Status: {statusFilter}
                                <button onClick={() => setStatusFilter("all")} className="ml-1 hover:text-red-500">
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        )}
                        {advancedFilters.map((f, i) => (
                            <Badge key={f.id} variant="secondary" className="flex items-center gap-1">
                                {i > 0 && <span className="text-gray-400 mr-1">{filterLogic}</span>}
                                {f.field} {f.operator} {f.value && `"${f.value}"`}
                                <button onClick={() => removeFilter(f.id)} className="ml-1 hover:text-red-500">
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}

                <SelectionBanner
                    selectionMode={selectionMode}
                    selectedCount={selectedLeads.length}
                    pageCount={paginatedLeads.length}
                    totalCount={totalRecords}
                    onSelectAll={handleSelectAllRecords}
                    onClearSelection={handleClearSelection}
                />

                {viewMode === "table" ? (
                    <>
                        <LeadsTable
                            leads={paginatedLeads}
                            totalRecords={totalRecords}
                            loading={loading}
                            selectedLeads={selectedLeads}
                            selectionMode={selectionMode}
                            onSelectLead={handleSelectLead}
                            onSelectAllOnPage={handleSelectAllCheckbox}
                            orderedColumns={orderedColumns}
                            columnVisibility={columnVisibility}
                            columnWidths={columnWidths}
                            onColumnResize={handleColumnResize}
                            columnOrder={columnOrder}
                            onColumnReorder={handleDragEnd}
                            sortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                            rowDensity={rowDensity}
                            searchQuery={searchQuery}
                            canEdit={can("leads-edit")}
                            canDelete={can("leads-delete")}
                            onView={handleView}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onStatusChange={handleStatusChange}
                            onToggleStar={handleToggleStar}
                            onInlineEdit={handleInlineEdit}
                        />

                        <div className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-600 font-medium">Total: {totalRecords}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">Rows:</span>
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
                                            <SelectItem value="30">30</SelectItem>
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
                                totalRecords={totalRecords}
                                startRecord={totalRecords === 0 ? 0 : startIndex + 1}
                                endRecord={endIndex}
                                compact
                            />
                        </div>
                        <div className="text-xs text-gray-400 text-center">
                            ↑↓ Navigate • Enter View • Space Select • Double-click Edit • Drag headers • ★ Star to pin
                        </div>
                    </>
                ) : (
                    <KanbanBoard
                        leads={processedLeads}
                        onStatusChange={handleStatusChange}
                        onView={handleView}
                        onEdit={handleEdit}
                        canEdit={can("leads-edit")}
                    />
                )}

                <ImportWizard
                    open={showImportWizard}
                    onClose={() => setShowImportWizard(false)}
                    module="leads"
                    onSuccess={(count) => console.log(`Imported ${count}`)}
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
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onSave={(id: string, data: any) => handleSaveLead(id, data)}
                />

                {/* Merge Dialog */}
                <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <GitMerge className="h-5 w-5" /> Merge Leads
                            </DialogTitle>
                            <DialogDescription>
                                Combine two leads into one. Missing fields from the source will be copied to the target.
                            </DialogDescription>
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
                            <Button variant="outline" onClick={() => setShowMergeDialog(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleMergeLeads} className="bg-green-600 hover:bg-green-700">
                                Merge Leads
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Bulk Email Dialog */}
                <Dialog open={showBulkEmailDialog} onOpenChange={setShowBulkEmailDialog}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Mail className="h-5 w-5" /> Compose Email
                            </DialogTitle>
                            <DialogDescription>Send email to {selectedLeads.length} selected leads.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Subject</Label>
                                <Input
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                    placeholder="Enter subject..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Message</Label>
                                <Textarea
                                    value={emailBody}
                                    onChange={(e) => setEmailBody(e.target.value)}
                                    placeholder="Write your message..."
                                    className="min-h-[150px]"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowBulkEmailDialog(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSendBulkEmail}>
                                <Send className="mr-2 h-4 w-4" /> Open in Email Client
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
}
