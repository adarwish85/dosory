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
    Kanban, Table2, GitMerge, UserPlus, Settings2, Building, Globe
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useCustomers, useContacts } from "@/lib/hooks";
import type { Customer, EntityStatus } from "@/lib/types";
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
const AddCustomerPanel = dynamic(() => import("@/components/dashboard/customers/AddCustomerPanel"), { ssr: false });

import { CUSTOMER_STATUSES } from "@/lib/constants";
import { Timestamp } from "firebase/firestore";
import { formatDistanceToNow, format } from "date-fns";

// Types
type SelectionMode = "none" | "page" | "all";
type SortDirection = "asc" | "desc" | null;
type RowDensity = "compact" | "comfortable";
type ViewMode = "table" | "kanban";
// Column Keys
type ColumnKey = "id" | "company" | "phone" | "website" | "status" | "groups" | "vatNumber" | "city" | "country" | "createdAt" | "primaryContactName" | "primaryContactEmail" | "primaryContactPhone" | "primaryContactPosition";

const DEFAULT_COLUMNS: ColumnDef[] = [
    { key: "id", label: "#", defaultVisible: false, sortable: true },
    { key: "company", label: "Company", defaultVisible: true, required: true, sortable: true },
    { key: "status", label: "Status", defaultVisible: true, sortable: true },
    { key: "phone", label: "Phone", defaultVisible: true },
    { key: "groups", label: "Groups", defaultVisible: true },
    { key: "website", label: "Website", defaultVisible: true },
    { key: "primaryContactName", label: "Contact Name", defaultVisible: false },
    { key: "primaryContactEmail", label: "Contact Email", defaultVisible: false },
    { key: "primaryContactPhone", label: "Contact Phone", defaultVisible: false },
    { key: "primaryContactPosition", label: "Title", defaultVisible: false },
    { key: "vatNumber", label: "VAT No.", defaultVisible: false },
    { key: "city", label: "City", defaultVisible: false },
    { key: "country", label: "Country", defaultVisible: false },
    { key: "createdAt", label: "Created", defaultVisible: false, sortable: true },
];

const DEFAULT_COLUMN_WIDTHS: Record<ColumnKey, number> = {
    id: 60,
    company: 250,
    phone: 150,
    website: 200,
    status: 120,
    groups: 150,
    vatNumber: 120,
    city: 150,
    country: 120,
    createdAt: 150,
    primaryContactName: 180,
    primaryContactEmail: 200,
    primaryContactPhone: 150,
    primaryContactPosition: 150
};


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
    statusFilter: EntityStatus | "all";
    rowDensity: RowDensity;
    isDefault?: boolean;
    columnWidths?: Record<string, number>;
    createdAt: number;
}

const SAVED_VIEWS_STORAGE_KEY = "customers_saved_views";

// Default pixel widths


const FILTER_OPERATORS: { value: FilterOperator; label: string }[] = [
    { value: "contains", label: "Contains" }, { value: "equals", label: "Equals" },
    { value: "startsWith", label: "Starts with" }, { value: "endsWith", label: "Ends with" },
    { value: "isEmpty", label: "Is empty" }, { value: "isNotEmpty", label: "Is not empty" },
];

const ROW_DENSITY_STYLES: Record<RowDensity, string> = { compact: "py-1 text-xs", comfortable: "py-2 text-sm" };

const getDefaultVisibleColumns = (): Record<ColumnKey, boolean> => {
    const v: Record<string, boolean> = {};
    DEFAULT_COLUMNS.forEach(col => { v[col.key] = col.defaultVisible; });
    return v as Record<ColumnKey, boolean>;
};

// Format timestamp to relative time
function formatTimestamp(timestamp: Timestamp | undefined): string {
    if (!timestamp) return "-";
    try {
        const date = timestamp.toDate();
        return formatDistanceToNow(date, { addSuffix: true });
    } catch { return "-"; }
}

function formatFullDate(timestamp: Timestamp | undefined): string {
    if (!timestamp) return "-";
    try { return format(timestamp.toDate(), "PPpp"); } catch { return "-"; }
}

// Draggable Header
function DraggableColumnHeader({
    column,
    sortKey,
    sortDirection,
    onSort,
    isVisible,
    width,
    onResize
}: {
    column: ColumnDef;
    sortKey: ColumnKey | null;
    sortDirection: SortDirection;
    onSort: (key: ColumnKey) => void;
    isVisible: boolean;
    width: number;
    onResize: (e: React.MouseEvent, key: ColumnKey) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.key });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        width: width,
        minWidth: width
    };

    if (!isVisible) return null;
    const isActive = sortKey === column.key;

    return (
        <TableHead ref={setNodeRef} style={style} className={`relative font-semibold text-gray-900 bg-gray-100 ${column.key === "company" ? "sticky left-[48px] z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r" : "border-r border-gray-200"}`}>
            <div className="flex items-center gap-1 w-full">
                <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded shrink-0"><GripVertical className="h-3 w-3 text-gray-400" /></button>
                {column.sortable ? (
                    <button onClick={() => onSort(column.key)} className="flex items-center gap-1 hover:text-blue-600 truncate">
                        <span className="truncate">{column.label}</span>
                        {isActive ? (sortDirection === "asc" ? <ArrowUp className="h-3 w-3 shrink-0" /> : <ArrowDown className="h-3 w-3 shrink-0" />) : <ArrowUpDown className="h-3 w-3 opacity-30 shrink-0" />}
                    </button>
                ) : <span className="truncate">{column.label}</span>}
            </div>
            {/* Resizer Handle */}
            <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-20"
                onMouseDown={(e) => onResize(e, column.key)}
            />
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

// Customer Stats Bar
function CustomerStatsBar({ customers }: { customers: Customer[] }) {
    const totalCount = customers.length;
    const activeCount = customers.filter(c => c.status === "active").length;
    const inactiveCount = customers.filter(c => c.status === "inactive").length;
    const portalCount = customers.filter(c => c.portalEnabled).length;

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex flex-col">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <Users className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Total Customers</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">{totalCount}</div>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex flex-col">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                    <CheckSquare className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Active</span>
                </div>
                <div className="text-2xl font-bold text-green-900">{activeCount}</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 flex flex-col">
                <div className="flex items-center gap-2 text-yellow-600 mb-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Inactive</span>
                </div>
                <div className="text-2xl font-bold text-yellow-900">{inactiveCount}</div>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 flex flex-col">
                <div className="flex items-center gap-2 text-purple-600 mb-2">
                    <Globe className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Portal Users</span>
                </div>
                <div className="text-2xl font-bold text-purple-900">{portalCount}</div>
            </div>
        </div>
    );
}

export default function CustomersPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
    const [selectionMode, setSelectionMode] = useState<SelectionMode>("none");
    const [showImportWizard, setShowImportWizard] = useState(false);
    const [showAddPanel, setShowAddPanel] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage, setRecordsPerPage] = useState(10);
    const [columnVisibility, setColumnVisibility] = useState<Record<ColumnKey, boolean>>(getDefaultVisibleColumns);
    const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(DEFAULT_COLUMNS.map(c => c.key));
    const [sortKey, setSortKey] = useState<ColumnKey | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [rowDensity, setRowDensity] = useState<RowDensity>("comfortable");
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(DEFAULT_COLUMN_WIDTHS);

    // Column Resizing Logic
    const handleColumnResize = useCallback((e: React.MouseEvent, key: ColumnKey) => {
        e.preventDefault();
        const startX = e.pageX;
        const startWidth = columnWidths[key] || 100;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const diff = moveEvent.pageX - startX;
            setColumnWidths(prev => ({
                ...prev,
                [key]: Math.max(50, startWidth + diff)
            }));
        };

        const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    }, [columnWidths]);

    const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<EntityStatus | "all">("all");

    // Saved views state
    const [savedViews, setSavedViews] = useState<SavedView[]>([]);
    const [viewsLoaded, setViewsLoaded] = useState(false);
    const [showSaveViewDialog, setShowSaveViewDialog] = useState(false);
    const [newViewName, setNewViewName] = useState("");
    const [activeViewId, setActiveViewId] = useState<string | null>(null);

    // Load saved views from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(SAVED_VIEWS_STORAGE_KEY);
            if (stored) {
                const views = JSON.parse(stored) as SavedView[];
                setSavedViews(views);
                const defaultView = views.find(v => v.isDefault);
                if (defaultView) applyView(defaultView);
            }
        } catch (e) {
            console.error("Failed to load saved views", e);
        } finally {
            setViewsLoaded(true);
        }
    }, []);

    // Save views to localStorage
    useEffect(() => {
        if (viewsLoaded) {
            localStorage.setItem(SAVED_VIEWS_STORAGE_KEY, JSON.stringify(savedViews));
        }
    }, [savedViews, viewsLoaded]);

    const applyView = useCallback((view: SavedView) => {
        // Merge saved columnOrder with any new columns from DEFAULT_COLUMNS that aren't in the saved view
        const savedOrder = view.columnOrder || [];
        const allColumnKeys = DEFAULT_COLUMNS.map(c => c.key);
        const missingColumns = allColumnKeys.filter(k => !savedOrder.includes(k));
        const mergedOrder = [...savedOrder, ...missingColumns];

        // Merge columnVisibility to include new columns (default to their defaultVisible value)
        const mergedVisibility = { ...getDefaultVisibleColumns(), ...view.columnVisibility };

        setColumnVisibility(mergedVisibility);
        setColumnOrder(mergedOrder);
        setSortKey(view.sortKey);
        setSortDirection(view.sortDirection);
        setStatusFilter(view.statusFilter);
        setRowDensity(view.rowDensity);
        if (view.columnWidths) setColumnWidths(view.columnWidths);
        setActiveViewId(view.id);
        setCurrentPage(1);
    }, []);

    const updateCurrentView = useCallback(() => {
        if (!activeViewId) return;
        setSavedViews(prev => prev.map(v => {
            if (v.id === activeViewId) {
                return {
                    ...v,
                    columnVisibility,
                    columnOrder,
                    sortKey,
                    sortDirection,
                    advancedFilters: [], // Placeholder
                    filterLogic: "AND",
                    statusFilter,
                    rowDensity,
                    columnWidths,
                    updatedAt: Date.now()
                };
            }
            return v;
        }));
        setShowSaveViewDialog(false);
        // Note: Toast imported from sonner should be added if not already
    }, [activeViewId, columnVisibility, columnOrder, sortKey, sortDirection, statusFilter, rowDensity, columnWidths]);

    const saveCurrentView = useCallback((name: string, setAsDefault: boolean = false) => {
        const newView: SavedView = {
            id: crypto.randomUUID(),
            name,
            columnVisibility,
            columnOrder,
            sortKey,
            sortDirection,
            advancedFilters: [],
            filterLogic: "AND",
            statusFilter,
            rowDensity,
            columnWidths,
            isDefault: setAsDefault,
            createdAt: Date.now(),
        };
        setSavedViews(prev => {
            const updated = setAsDefault ? prev.map(v => ({ ...v, isDefault: false })) : prev;
            return [...updated, newView];
        });
        setActiveViewId(newView.id);
        setNewViewName("");
        setShowSaveViewDialog(false);
    }, [columnVisibility, columnOrder, sortKey, sortDirection, statusFilter, rowDensity, columnWidths]);

    const deleteView = useCallback((viewId: string) => {
        setSavedViews(prev => {
            const updated = prev.filter(v => v.id !== viewId);
            if (updated.length === 0) localStorage.removeItem(SAVED_VIEWS_STORAGE_KEY);
            return updated;
        });
        if (activeViewId === viewId) setActiveViewId(null);
    }, [activeViewId]);

    // Toggle default status for a view
    const setViewAsDefault = useCallback((viewId: string) => {
        setSavedViews(prev => prev.map(v => ({
            ...v,
            isDefault: v.id === viewId ? !v.isDefault : false
        })));
    }, []);

    const [localSearch, setLocalSearch] = useState(searchQuery);
    const tableRef = useRef<HTMLDivElement>(null);
    const { customers, loading, deleteCustomer, updateCustomer } = useCustomers({
        status: statusFilter,
        limit: 1000 // Fetch logic limit
    });

    const { contacts } = useContacts(); // Fetch all contacts for mapping

    const primaryContactMap = useMemo(() => {
        const map = new Map<string, any>();
        contacts.forEach(c => {
            if (c.isPrimary) {
                map.set(c.customerId, c);
            }
        });
        return map;
    }, [contacts]);

    // Bulk Actions Handlers
    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectionMode === "all" ? totalRecords : selectedCustomers.length} customers?`)) return;
        try {
            // If selectionMode is "all", we might need a backend bulk delete. 
            // For now, we only delete loaded/selected items ID-by-ID as per current architecture.
            const idsToDelete = selectionMode === "all" ? currentPageIds : selectedCustomers; // "all" logic usually triggers a backend job, here we simplify to client-side batch for MVP
            // Actually, selectedCustomers holds IDs.
            await Promise.all(selectedCustomers.map(id => deleteCustomer(id)));
            setSelectedCustomers([]);
            setSelectionMode("none");
        } catch (e) {
            console.error("Bulk delete failed", e);
            alert("Failed to delete some customers.");
        }
    };

    const handleBulkStatusUpdate = async (status: EntityStatus) => {
        if (!window.confirm(`Update status of ${selectedCustomers.length} customers to "${status}"?`)) return;
        try {
            await Promise.all(selectedCustomers.map(id => updateCustomer(id, { status })));
            setSelectedCustomers([]);
            setSelectionMode("none");
        } catch (e) {
            console.error("Bulk status update failed", e);
            alert("Failed to update status.");
        }
    };

    // Client-side filtering and sorting
    const processedCustomers = useMemo(() => {
        let result = [...customers];

        // Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(c => c.company.toLowerCase().includes(q));
        }

        // Sorting
        if (sortKey) {
            result.sort((a, b) => {
                const aVal = a[sortKey as keyof Customer];
                const bVal = b[sortKey as keyof Customer];
                if (!aVal && !bVal) return 0;
                if (!aVal) return 1;
                if (!bVal) return -1;

                if (typeof aVal === "string" && typeof bVal === "string") {
                    return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                }
                // Handle Timestamp
                if ((aVal as any).toMillis && (bVal as any).toMillis) {
                    return sortDirection === "asc"
                        ? (aVal as any).toMillis() - (bVal as any).toMillis()
                        : (bVal as any).toMillis() - (aVal as any).toMillis();
                }

                return 0;
            });
        }

        return result;
    }, [customers, searchQuery, sortKey, sortDirection]);

    const totalRecords = processedCustomers.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + recordsPerPage, totalRecords);
    const paginatedCustomers = processedCustomers.slice(startIndex, endIndex);

    const currentPageIds = useMemo(() => paginatedCustomers.map(c => c.id), [paginatedCustomers]);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const orderedColumns = useMemo(() => columnOrder.map(key => DEFAULT_COLUMNS.find(c => c.key === key)!).filter(Boolean), [columnOrder]);
    const visibleColumnsCount = Object.values(columnVisibility).filter(Boolean).length;

    // Handlers
    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) setColumnOrder(items => arrayMove(items, items.indexOf(active.id as ColumnKey), items.indexOf(over.id as ColumnKey)));
    }, []);

    const handleSort = useCallback((key: ColumnKey) => {
        if (sortKey === key) { if (sortDirection === "asc") setSortDirection("desc"); else { setSortKey(null); setSortDirection(null); } } else { setSortKey(key); setSortDirection("asc"); }
    }, [sortKey, sortDirection]);

    const toggleColumn = useCallback((key: ColumnKey) => { const col = DEFAULT_COLUMNS.find(c => c.key === key); if (col?.required) return; setColumnVisibility(prev => ({ ...prev, [key]: !prev[key] })); }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearch !== searchQuery) {
                setSearchQuery(localSearch);
                setCurrentPage(1);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [localSearch, searchQuery]);

    const handleSelectAllOnPage = useCallback(() => { setSelectedCustomers(currentPageIds); setSelectionMode("page"); }, [currentPageIds]);
    const handleSelectAllRecords = useCallback(() => { setSelectedCustomers([]); setSelectionMode("all"); }, []);
    const handleClearSelection = useCallback(() => { setSelectedCustomers([]); setSelectionMode("none"); }, []);
    const handleSelectAllCheckbox = useCallback((checked: boolean) => { if (checked) handleSelectAllOnPage(); else handleClearSelection(); }, [handleSelectAllOnPage, handleClearSelection]);
    const handleSelectCustomer = useCallback((id: string, checked: boolean) => {
        if (checked) setSelectedCustomers(prev => [...prev, id]);
        else setSelectedCustomers(prev => prev.filter(cid => cid !== id));
    }, []);

    const isAllPageSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedCustomers.includes(id));
    const isSomeSelected = selectedCustomers.length > 0 && !isAllPageSelected;

    // Customer Quick View Card
    function CustomerQuickViewCard({ customer }: { customer: Customer }) {
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border">
                        <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                            {customer.company.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900">{customer.company}</h4>
                        <div className="flex gap-2 text-xs text-gray-500 mt-0.5">
                            <Badge variant="outline" className={customer.status === "active" ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700"}>
                                {customer.status}
                            </Badge>
                            {customer.createdAt && <span>Joined {formatDistanceToNow(customer.createdAt.toDate(), { addSuffix: true })}</span>}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    {customer.phone && (
                        <div className="flex items-center gap-1.5 overflow-hidden">
                            <Phone className="h-3 w-3 shrink-0 text-gray-400" />
                            <span className="truncate">{customer.phone}</span>
                        </div>
                    )}
                    {customer.website && (
                        <div className="flex items-center gap-1.5 overflow-hidden col-span-2">
                            <Globe className="h-3 w-3 shrink-0 text-gray-400" />
                            <a href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">
                                {customer.website}
                            </a>
                        </div>
                    )}
                    {customer.address?.city && (
                        <div className="flex items-center gap-1.5 overflow-hidden col-span-2">
                            <Building className="h-3 w-3 shrink-0 text-gray-400" />
                            <span className="truncate">{customer.address.city}, {customer.address.country}</span>
                        </div>
                    )}
                </div>

                {customer.groups && customer.groups.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1 border-t">
                        {customer.groups.slice(0, 3).map(g => (
                            <Badge key={g} variant="secondary" className="text-[10px] px-1.5">{g}</Badge>
                        ))}
                        {customer.groups.length > 3 && (
                            <span className="text-[10px] text-gray-400">+{customer.groups.length - 3} more</span>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Render Helper
    const renderCell = (customer: Customer, col: ColumnDef) => {
        const primaryContact = primaryContactMap.get(customer.id);

        switch (col.key) {
            case "id": return <span className="text-gray-500 font-mono text-xs">{customer.id.substring(0, 6)}</span>;
            case "company": return (
                <div className="flex flex-col relative group min-w-0">
                    <HoverCard>
                        <HoverCardTrigger asChild>
                            <Link href={`/dashboard/customers/${customer.id}`} className="font-medium text-blue-600 hover:underline block truncate max-w-full">
                                {customer.company}
                            </Link>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80" align="start">
                            <CustomerQuickViewCard customer={customer} />
                        </HoverCardContent>
                    </HoverCard>

                    {rowDensity === "comfortable" && (
                        <div className="flex gap-2 text-[10px] text-gray-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/dashboard/customers/${customer.id}`} className="hover:text-blue-600 flex items-center gap-0.5"><ExternalLink className="h-2.5 w-2.5" /> View</Link>
                            <span className="text-gray-300">|</span>
                            <Link href={`/dashboard/customers/${customer.id}/profile`} className="hover:text-blue-600 flex items-center gap-0.5"><Pencil className="h-2.5 w-2.5" /> Edit</Link>
                            <span className="text-gray-300">|</span>
                            <button onClick={async (e) => { e.stopPropagation(); if (window.confirm("Delete?")) await deleteCustomer(customer.id); }} className="hover:text-red-600 flex items-center gap-0.5"><Trash className="h-2.5 w-2.5" /> Delete</button>
                        </div>
                    )}
                </div>
            );
            case "status": return <Badge variant="outline" className={customer.status === "active" ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700"}>{customer.status}</Badge>;
            case "phone": return customer.phone ? <div className="flex items-center gap-1 text-gray-600"><Phone className="h-3 w-3" />{customer.phone}</div> : <span className="text-gray-400">-</span>;
            case "website": return customer.website ? <a href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline"><Globe className="h-3 w-3" /> Visit</a> : <span className="text-gray-400">-</span>;
            case "groups": return customer.groups && customer.groups.length > 0 ? <div className="flex flex-wrap gap-1">{customer.groups.map(g => <Badge key={g} variant="secondary" className="text-[10px] px-1 py-0">{g}</Badge>)}</div> : <span className="text-gray-400">-</span>;
            case "vatNumber": return customer.vatNumber ? <span className="text-gray-600 font-mono text-xs">{customer.vatNumber}</span> : <span className="text-gray-400">-</span>;
            case "city": return customer.address?.city ? <span className="text-gray-600">{customer.address.city}</span> : <span className="text-gray-400">-</span>;
            case "country": return customer.address?.country ? <span className="text-gray-600">{customer.address.country}</span> : <span className="text-gray-400">-</span>;
            case "createdAt": return <span className="text-gray-500">{formatTimestamp(customer.createdAt)}</span>;

            // Primary Contact Columns
            case "primaryContactName": return primaryContact ? <span className="text-gray-900">{primaryContact.firstName} {primaryContact.lastName}</span> : <span className="text-gray-400 italic text-xs">No primary contact</span>;
            case "primaryContactEmail": return primaryContact ? <a href={`mailto:${primaryContact.email}`} className="text-gray-600 hover:text-blue-600">{primaryContact.email}</a> : <span className="text-gray-400">-</span>;
            case "primaryContactPhone": return primaryContact?.phone ? <span className="text-gray-600">{primaryContact.phone}</span> : <span className="text-gray-400">-</span>;
            case "primaryContactPosition": return primaryContact?.position ? <span className="text-gray-600">{primaryContact.position}</span> : <span className="text-gray-400">-</span>;

            default: return <span className="text-gray-500">-</span>;
        }
    };

    return (
        <TooltipProvider>
            <div className="space-y-4">


                <CustomerStatsBar customers={customers} />

                {/* Header Toolbar */}
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-between">
                    <div className="flex items-center gap-2 shrink-0">
                        <Button className="bg-gray-900 text-white hover:bg-gray-800" onClick={() => setShowAddPanel(true)}>
                            <Plus className="mr-2 h-4 w-4" /> New Customer
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent><DropdownMenuItem onClick={() => setShowImportWizard(true)}><Upload className="mr-2 h-4 w-4" /> Import Customers</DropdownMenuItem></DropdownMenuContent>
                        </DropdownMenu>

                        {selectedCustomers.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                                        <Badge className="mr-2 bg-blue-600">{selectionMode === "all" ? totalRecords : selectedCustomers.length}</Badge>
                                        Bulk <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    <DropdownMenuLabel>With {selectionMode === "all" ? totalRecords : selectedCustomers.length} selected</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel className="text-xs text-gray-500">Change Status To</DropdownMenuLabel>
                                    {CUSTOMER_STATUSES.map((s) => (
                                        <DropdownMenuItem key={s.value} onClick={() => handleBulkStatusUpdate(s.value as EntityStatus)}>
                                            <RefreshCcw className="mr-2 h-4 w-4" /> {s.label}
                                        </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-red-600" onClick={handleBulkDelete}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>

                    <div className="flex items-center gap-2 flex-1 w-full max-w-md mx-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                            <Input placeholder="Search customers..." className="pl-9 bg-white" value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} />
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className={`gap-2 ${statusFilter !== "all" ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white"}`}>
                                    <Filter className="h-4 w-4" /> {statusFilter === "all" ? "Status" : statusFilter}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuRadioGroup value={statusFilter} onValueChange={(v) => setStatusFilter(v as EntityStatus | "all")}>
                                    <DropdownMenuRadioItem value="all">All Statuses</DropdownMenuRadioItem>
                                    {CUSTOMER_STATUSES.map(s => <DropdownMenuRadioItem key={s.value} value={s.value}>{s.label}</DropdownMenuRadioItem>)}
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {/* Views & Dislay Control */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="gap-2 bg-white text-purple-600 border-purple-200 hover:bg-purple-50">
                                    <LayoutList className="h-4 w-4" /> Display <Badge variant="secondary" className="ml-1 px-1 py-0 h-4 bg-purple-100 text-purple-700">{activeViewId ? 1 : savedViews.length}</Badge>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                                <DropdownMenuLabel>Density</DropdownMenuLabel>
                                <DropdownMenuRadioGroup value={rowDensity} onValueChange={(v) => setRowDensity(v as RowDensity)}>
                                    <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
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
                                            {DEFAULT_COLUMNS.map((col) => (
                                                <DropdownMenuCheckboxItem
                                                    key={col.key}
                                                    checked={columnVisibility[col.key]}
                                                    onCheckedChange={() => toggleColumn(col.key)}
                                                    disabled={col.required}
                                                >
                                                    {col.label}
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                            <DropdownMenuSeparator />
                                            <div className="flex gap-1 p-1">
                                                <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => setColumnVisibility(Object.fromEntries(DEFAULT_COLUMNS.map(c => [c.key, true])) as any)}>All</Button>
                                                <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => setColumnVisibility(getDefaultVisibleColumns())}>Reset</Button>
                                            </div>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuSub>
                                <DropdownMenuSeparator />

                                <DropdownMenuLabel>Saved Views</DropdownMenuLabel>
                                {savedViews.length > 0 ? (
                                    savedViews.map(view => (
                                        <div key={view.id} className="flex items-center group">
                                            <DropdownMenuItem className="flex-1" onClick={() => applyView(view)}>
                                                <FolderOpen className="mr-2 h-4 w-4" />
                                                <span className="flex-1 truncate">{view.name}</span>
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
                                ) : <div className="px-2 py-4 text-xs text-gray-400 text-center">No saved views</div>}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setShowSaveViewDialog(true); }}>
                                    <BookmarkPlus className="mr-2 h-4 w-4" /> Save Current View
                                </DropdownMenuItem>
                                {activeViewId && (
                                    <DropdownMenuItem onClick={() => { setActiveViewId(null); setColumnVisibility(getDefaultVisibleColumns()); setColumnOrder(DEFAULT_COLUMNS.map(c => c.key)); }}>
                                        <X className="mr-2 h-4 w-4" /> Reset to Default
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="icon" onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4 text-gray-500" /></Button>
                    </div>
                </div>

                {/* Save View Dialog */}
                <Dialog open={showSaveViewDialog} onOpenChange={setShowSaveViewDialog}>
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2"><Save className="h-5 w-5" /> Save Current View</DialogTitle>
                            <DialogDescription>Save your current filters, columns, and sort preferences.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label htmlFor="view-name">View Name</Label>
                                <Input id="view-name" placeholder="e.g. Active Customers" value={newViewName} onChange={(e) => setNewViewName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newViewName.trim()) saveCurrentView(newViewName.trim()); }} />
                            </div>
                        </div>
                        <DialogFooter className="flex-col sm:flex-col gap-2">
                            <div className="flex gap-2 w-full">
                                <Button className="flex-1" disabled={!newViewName.trim()} onClick={() => saveCurrentView(newViewName.trim())}>Save New</Button>
                                {activeViewId && <Button variant="secondary" className="flex-1" onClick={updateCurrentView}>Update Active</Button>}
                            </div>
                            <Button variant="outline" className="w-full" disabled={!newViewName.trim()} onClick={() => saveCurrentView(newViewName.trim(), true)}>Save as Default View</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <SelectionBanner selectionMode={selectionMode} selectedCount={selectedCustomers.length} pageCount={paginatedCustomers.length} totalCount={totalRecords} onSelectAll={handleSelectAllRecords} onClearSelection={handleClearSelection} />

                <div ref={tableRef} tabIndex={0} className="border rounded-md bg-white overflow-x-auto focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <Table className="table-fixed">
                            <TableHeader>
                                <TableRow className="bg-gray-50 hover:bg-gray-50">
                                    <TableHead className="w-[48px] min-w-[48px] max-w-[48px] text-center bg-gray-100 sticky left-0 z-30 p-0"><div className="flex items-center justify-center w-full h-full"><Checkbox checked={isAllPageSelected} ref={(el) => { if (el) (el as any).indeterminate = isSomeSelected; }} onCheckedChange={handleSelectAllCheckbox} /></div></TableHead>
                                    <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                                        {orderedColumns.map((col) => (
                                            <DraggableColumnHeader
                                                key={col.key}
                                                column={col}
                                                sortKey={sortKey}
                                                sortDirection={sortDirection}
                                                onSort={handleSort}
                                                isVisible={columnVisibility[col.key]}
                                                width={columnWidths[col.key] || 100}
                                                onResize={handleColumnResize}
                                            />
                                        ))}
                                    </SortableContext>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={visibleColumnsCount + 1} className="p-0"><TableSkeleton columns={visibleColumnsCount + 1} rows={10} /></TableCell></TableRow>
                                ) : paginatedCustomers.length === 0 ? (
                                    <TableRow><TableCell colSpan={visibleColumnsCount + 1} className="text-center py-10 text-muted-foreground">{searchQuery ? "No matches" : "No customers"}</TableCell></TableRow>
                                ) : (
                                    paginatedCustomers.map((customer, index) => (
                                        <TableRow key={customer.id} className={`group hover:bg-gray-50 ${(selectionMode === "all" || selectedCustomers.includes(customer.id)) ? 'bg-blue-50/50' : ''} ${focusedRowIndex === index ? 'ring-2 ring-inset ring-blue-500' : ''} ${ROW_DENSITY_STYLES[rowDensity]}`}>
                                            <TableCell className={`text-center sticky left-0 z-30 p-0 w-[48px] min-w-[48px] max-w-[48px] border-r ${selectionMode === "all" || selectedCustomers.includes(customer.id) ? "bg-blue-50" : "bg-white"} group-hover:bg-gray-50`}><div className="flex items-center justify-center w-full h-full"><Checkbox checked={selectionMode === "all" || selectedCustomers.includes(customer.id)} onCheckedChange={(c) => handleSelectCustomer(customer.id, !!c)} /></div></TableCell>
                                            {orderedColumns.map((col) => columnVisibility[col.key] && (
                                                <TableCell
                                                    key={col.key}
                                                    style={{ width: columnWidths[col.key] || 100, minWidth: columnWidths[col.key] || 100, maxWidth: columnWidths[col.key] || 100 }}
                                                    className={`overflow-hidden text-ellipsis whitespace-nowrap ${col.key === "company" ? `sticky left-[48px] z-30 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${selectionMode === "all" || selectedCustomers.includes(customer.id) ? "bg-blue-50" : "bg-white"} group-hover:bg-gray-50` : ""}`}
                                                >
                                                    {renderCell(customer, col)}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </DndContext>
                </div>

                <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600 font-medium">Total: {totalRecords}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Rows:</span>
                            <Select value={recordsPerPage.toString()} onValueChange={(v) => { setRecordsPerPage(parseInt(v)); setCurrentPage(1); }}>
                                <SelectTrigger className="w-[65px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="30">30</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalRecords={totalRecords} startRecord={totalRecords === 0 ? 0 : startIndex + 1} endRecord={endIndex} compact />
                </div>
                <div className="text-xs text-gray-400 text-center">↑↓ Navigate • Drag headers • Fix columns</div>

                <ImportWizard open={showImportWizard} onClose={() => setShowImportWizard(false)} module="customers" onSuccess={(count) => console.log(`Imported ${count}`)} />
                <AddCustomerPanel open={showAddPanel} onClose={() => setShowAddPanel(false)} onSuccess={() => { }} />
            </div>
        </TooltipProvider>
    );
}
