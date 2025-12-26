"use client";

import { useState, useMemo, useCallback, useRef, useEffect, KeyboardEvent } from "react";
import { ContactDialog } from "@/components/dashboard/customers/contacts/contact-dialog";
import { useCustomer } from "@/components/dashboard/customers/customer-context";
import { useContacts } from "@/lib/hooks/use-customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
    Search, RotateCcw, Loader2, ChevronDown, CheckSquare, ArrowUpDown, ArrowUp, ArrowDown,
    LayoutList, FolderOpen, BookmarkPlus, Save, Star, Trash, MoreVertical, X, Plus,
    Download, Upload, Columns, GripVertical, ExternalLink, Pencil, Mail, Phone,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, Eye, EyeOff
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem,
    DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSub, DropdownMenuSubTrigger,
    DropdownMenuSubContent, DropdownMenuPortal
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// DND Kit imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Types
type SelectionMode = "none" | "page" | "all";
type SortDirection = "asc" | "desc" | null;
type RowDensity = "compact" | "comfortable";
type ColumnKey = "name" | "email" | "position" | "phone" | "portal" | "primary" | "lastActivity";
type FilterField = "portal" | "primary";

interface ColumnDef { key: ColumnKey; label: string; defaultVisible: boolean; required?: boolean; sortable?: boolean; width?: number; }

// Saved View type
interface ContactsSavedView {
    id: string;
    name: string;
    columnVisibility: Record<ColumnKey, boolean>;
    columnOrder: ColumnKey[];
    sortKey: ColumnKey | null;
    sortDirection: SortDirection;
    rowDensity: RowDensity;
    recordsPerPage: number;
    columnWidths?: Record<string, number>;
    isDefault?: boolean;
    createdAt: number;
}

const CONTACTS_SAVED_VIEWS_KEY = "contacts_saved_views";

// Default pixel widths
const DEFAULT_COLUMN_WIDTHS: Record<ColumnKey, number> = {
    name: 220,
    email: 200,
    position: 120,
    phone: 140,
    portal: 80,
    primary: 80,
    lastActivity: 140,
};

const DEFAULT_COLUMNS: ColumnDef[] = [
    { key: "name", label: "Full Name", defaultVisible: true, required: true, sortable: true, width: 220 },
    { key: "email", label: "Email", defaultVisible: true, sortable: true, width: 200 },
    { key: "position", label: "Position", defaultVisible: true, sortable: true, width: 120 },
    { key: "phone", label: "Phone", defaultVisible: true, width: 140 },
    { key: "portal", label: "Portal", defaultVisible: true, width: 80 },
    { key: "primary", label: "Primary", defaultVisible: true, width: 80 },
    { key: "lastActivity", label: "Last Activity", defaultVisible: false, sortable: true, width: 140 },
];

const ROW_DENSITY_STYLES: Record<RowDensity, string> = { compact: "py-1 text-xs", comfortable: "py-3 text-sm" };

const getDefaultVisibleColumns = (): Record<ColumnKey, boolean> => {
    const v: Record<string, boolean> = {};
    DEFAULT_COLUMNS.forEach(col => { v[col.key] = col.defaultVisible; });
    return v as Record<ColumnKey, boolean>;
};

// Highlight text component
function HighlightText({ text, search }: { text: string; search: string }) {
    if (!search.trim() || !text) return <>{text}</>;
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return <>{parts.map((part, i) => regex.test(part) ? <mark key={i} className="bg-yellow-200 px-0.5 rounded">{part}</mark> : <span key={i}>{part}</span>)}</>;
}

// Format last activity timestamp
function formatLastActivity(timestamp: any): string {
    if (!timestamp) return "-";
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return `${Math.floor(diffDays / 30)} months ago`;
    } catch { return "-"; }
}

// Inline Edit Cell
function InlineEditCell({ value, onSave, searchQuery }: { value: string; onSave: (value: string) => void; searchQuery: string; }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => { if (isEditing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [isEditing]);
    const handleSave = () => { if (editValue !== value) onSave(editValue); setIsEditing(false); };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") handleSave(); else if (e.key === "Escape") { setEditValue(value); setIsEditing(false); } };
    if (isEditing) return <Input ref={inputRef} value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} className="h-7 text-sm" />;
    return <span onDoubleClick={() => setIsEditing(true)} className="cursor-text hover:bg-gray-100 px-1 py-0.5 rounded inline-block min-w-[20px]" title="Double-click to edit"><HighlightText text={value || "-"} search={searchQuery} /></span>;
}

// Draggable Header Component
function DraggableColumnHeader({
    column, sortKey, sortDirection, onSort, isVisible, width, onResize
}: {
    column: ColumnDef; sortKey: ColumnKey | null; sortDirection: SortDirection; onSort: (key: ColumnKey) => void;
    isVisible: boolean; width: number; onResize: (e: React.MouseEvent, key: ColumnKey) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.key });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, width, minWidth: width };
    if (!isVisible) return null;
    const isActive = sortKey === column.key;
    const isSticky = column.key === "name";
    return (
        <TableHead ref={setNodeRef} style={style} className={`relative font-semibold text-gray-900 bg-gray-100 ${isSticky ? "sticky left-[48px] z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r" : "border-r border-gray-200"}`}>
            <div className="flex items-center gap-1 w-full">
                <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded shrink-0"><GripVertical className="h-3 w-3 text-gray-400" /></button>
                {column.sortable ? (
                    <button onClick={() => onSort(column.key)} className="flex items-center gap-1 hover:text-blue-600 truncate">
                        <span className="truncate">{column.label}</span>
                        {isActive ? (sortDirection === "asc" ? <ArrowUp className="h-3 w-3 shrink-0" /> : <ArrowDown className="h-3 w-3 shrink-0" />) : <ArrowUpDown className="h-3 w-3 opacity-30 shrink-0" />}
                    </button>
                ) : <span className="truncate">{column.label}</span>}
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-20" onMouseDown={(e) => onResize(e, column.key)} />
        </TableHead>
    );
}

// Selection Banner Component
function SelectionBanner({ selectionMode, selectedCount, pageCount, totalCount, onSelectAll, onClearSelection }: {
    selectionMode: SelectionMode; selectedCount: number; pageCount: number; totalCount: number; onSelectAll: () => void; onClearSelection: () => void;
}) {
    if (selectionMode === "none" || selectedCount === 0) return null;
    return (
        <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-2 flex items-center justify-center gap-2 text-sm">
            <CheckSquare className="h-4 w-4 text-blue-600" />
            {selectionMode === "page" ? (
                <><span className="text-blue-800">All <strong>{selectedCount}</strong> on page selected.</span>{totalCount > pageCount && <button onClick={onSelectAll} className="text-blue-600 font-medium hover:underline">Select all {totalCount}</button>}</>
            ) : (
                <><span className="text-blue-800">All <strong>{totalCount}</strong> selected.</span><button onClick={onClearSelection} className="text-blue-600 font-medium hover:underline">Clear</button></>
            )}
        </div>
    );
}

// Pagination Component
function Pagination({ currentPage, totalPages, onPageChange, totalRecords, startRecord, endRecord }: {
    currentPage: number; totalPages: number; onPageChange: (p: number) => void; totalRecords: number; startRecord: number; endRecord: number;
}) {
    const canPrev = currentPage > 1, canNext = currentPage < totalPages;
    return (
        <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-gray-500">Showing {startRecord} to {endRecord} of {totalRecords}</div>
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

// Quick View Card Component for Contact
function QuickViewCard({ contact }: { contact: any }) {
    return (
        <Card className="w-72 shadow-lg border-0">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                {contact.firstName?.charAt(0)}{contact.lastName?.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-base">{contact.firstName} {contact.lastName}</CardTitle>
                            {contact.position && <p className="text-sm text-gray-500">{contact.position}</p>}
                        </div>
                    </div>
                    {contact.isPrimary && <Badge className="bg-blue-100 text-blue-600 text-[10px]">Primary</Badge>}
                </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                    <Badge variant={contact.portalAccess?.enabled ? "default" : "secondary"} className="text-[10px]">
                        {contact.portalAccess?.enabled ? "Portal Active" : "No Portal"}
                    </Badge>
                </div>
                {contact.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3 text-gray-400" /><span className="truncate">{contact.email}</span></div>}
                {contact.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3 text-gray-400" /><span>{contact.phone}</span></div>}
                {contact.permissions && contact.permissions.length > 0 && (
                    <div>
                        <span className="text-gray-500 text-xs">Permissions:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {contact.permissions.slice(0, 4).map((p: string) => <Badge key={p} variant="outline" className="text-[9px] capitalize">{p}</Badge>)}
                            {contact.permissions.length > 4 && <Badge variant="outline" className="text-[9px]">+{contact.permissions.length - 4}</Badge>}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function ContactsPage() {
    const { customer, loading: customerLoading, customerId } = useCustomer();
    const { contacts, loading: contactsLoading, deleteContact, updateContact } = useContacts({ customerId: customerId || undefined });
    const tableRef = useRef<HTMLDivElement>(null);

    // UI State
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectionMode, setSelectionMode] = useState<SelectionMode>("none");
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage, setRecordsPerPage] = useState(25);
    const [columnVisibility, setColumnVisibility] = useState<Record<ColumnKey, boolean>>(getDefaultVisibleColumns);
    const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(DEFAULT_COLUMNS.map(c => c.key));
    const [sortKey, setSortKey] = useState<ColumnKey | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [rowDensity, setRowDensity] = useState<RowDensity>("comfortable");
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(DEFAULT_COLUMN_WIDTHS);
    const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editingContact, setEditingContact] = useState<any>(null);
    const [portalAccessContact, setPortalAccessContact] = useState<any>(null);

    // Filters state
    const [portalFilter, setPortalFilter] = useState<"all" | "enabled" | "disabled">("all");
    const [primaryFilter, setPrimaryFilter] = useState<"all" | "primary" | "regular">("all");
    const [showFilters, setShowFilters] = useState(false);

    // Duplicate warning state
    const [duplicateWarning, setDuplicateWarning] = useState<{ type: "email" | "phone"; contact: any } | null>(null);

    // Saved Views state
    const [savedViews, setSavedViews] = useState<ContactsSavedView[]>([]);
    const [viewsLoaded, setViewsLoaded] = useState(false);
    const [showSaveViewDialog, setShowSaveViewDialog] = useState(false);
    const [newViewName, setNewViewName] = useState("");
    const [activeViewId, setActiveViewId] = useState<string | null>(null);

    // DND sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Load saved views
    useEffect(() => {
        try {
            const stored = localStorage.getItem(CONTACTS_SAVED_VIEWS_KEY);
            if (stored) {
                const views = JSON.parse(stored) as ContactsSavedView[];
                setSavedViews(views);
                const defaultView = views.find(v => v.isDefault);
                if (defaultView) applyView(defaultView);
            }
        } catch (e) { console.error("Failed to load saved views", e); }
        finally { setViewsLoaded(true); }
    }, []);

    // Save views to localStorage
    useEffect(() => {
        if (viewsLoaded) localStorage.setItem(CONTACTS_SAVED_VIEWS_KEY, JSON.stringify(savedViews));
    }, [savedViews, viewsLoaded]);

    // Column resize handler
    const handleColumnResize = useCallback((e: React.MouseEvent, key: ColumnKey) => {
        e.preventDefault();
        const startX = e.pageX;
        const startWidth = columnWidths[key] || 100;
        const onMouseMove = (moveEvent: MouseEvent) => {
            const diff = moveEvent.pageX - startX;
            setColumnWidths(prev => ({ ...prev, [key]: Math.max(50, startWidth + diff) }));
        };
        const onMouseUp = () => { document.removeEventListener("mousemove", onMouseMove); document.removeEventListener("mouseup", onMouseUp); };
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    }, [columnWidths]);

    // View handlers
    const applyView = useCallback((view: ContactsSavedView) => {
        setColumnVisibility(view.columnVisibility);
        setColumnOrder(view.columnOrder);
        setSortKey(view.sortKey);
        setSortDirection(view.sortDirection);
        setRowDensity(view.rowDensity);
        if (view.columnWidths) setColumnWidths(view.columnWidths);
        if (view.recordsPerPage) setRecordsPerPage(view.recordsPerPage);
        setActiveViewId(view.id);
        setCurrentPage(1);
    }, []);

    const updateCurrentView = useCallback(() => {
        if (!activeViewId) return;
        setSavedViews(prev => prev.map(v => v.id === activeViewId ? { ...v, columnVisibility, columnOrder, sortKey, sortDirection, rowDensity, columnWidths, recordsPerPage } : v));
        setShowSaveViewDialog(false);
    }, [activeViewId, columnVisibility, columnOrder, sortKey, sortDirection, rowDensity, columnWidths, recordsPerPage]);

    const saveCurrentView = useCallback((name: string, setAsDefault: boolean = false) => {
        const newView: ContactsSavedView = {
            id: crypto.randomUUID(), name, columnVisibility, columnOrder, sortKey, sortDirection, rowDensity, recordsPerPage, columnWidths, isDefault: setAsDefault, createdAt: Date.now()
        };
        setSavedViews(prev => setAsDefault ? [...prev.map(v => ({ ...v, isDefault: false })), newView] : [...prev, newView]);
        setActiveViewId(newView.id);
        setShowSaveViewDialog(false);
        setNewViewName("");
    }, [columnVisibility, columnOrder, sortKey, sortDirection, rowDensity, recordsPerPage, columnWidths]);

    const deleteView = useCallback((id: string) => {
        setSavedViews(prev => prev.filter(v => v.id !== id));
        if (activeViewId === id) setActiveViewId(null);
    }, [activeViewId]);

    const setViewAsDefault = useCallback((id: string) => {
        setSavedViews(prev => prev.map(v => ({ ...v, isDefault: v.id === id ? !v.isDefault : false })));
    }, []);

    // Column drag end
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setColumnOrder(prev => {
                const oldIndex = prev.indexOf(active.id as ColumnKey);
                const newIndex = prev.indexOf(over.id as ColumnKey);
                return arrayMove(prev, oldIndex, newIndex);
            });
        }
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

    // Process contacts
    const processedContacts = useMemo(() => {
        let result = [...contacts];
        // Search filter
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(c =>
                `${c.firstName} ${c.lastName}`.toLowerCase().includes(lowerQuery) ||
                c.email?.toLowerCase().includes(lowerQuery) ||
                c.phone?.toLowerCase().includes(lowerQuery) ||
                c.position?.toLowerCase().includes(lowerQuery)
            );
        }
        // Portal filter
        if (portalFilter !== "all") {
            result = result.filter(c => portalFilter === "enabled" ? c.portalAccess?.enabled : !c.portalAccess?.enabled);
        }
        // Primary filter
        if (primaryFilter !== "all") {
            result = result.filter(c => primaryFilter === "primary" ? c.isPrimary : !c.isPrimary);
        }
        // Sort
        if (sortKey && sortDirection) {
            result.sort((a, b) => {
                let aVal: any, bVal: any;
                switch (sortKey) {
                    case "name": aVal = `${a.firstName} ${a.lastName}`.toLowerCase(); bVal = `${b.firstName} ${b.lastName}`.toLowerCase(); break;
                    case "email": aVal = a.email?.toLowerCase() || ""; bVal = b.email?.toLowerCase() || ""; break;
                    case "position": aVal = a.position?.toLowerCase() || ""; bVal = b.position?.toLowerCase() || ""; break;
                    case "lastActivity": aVal = a.updatedAt?.toMillis?.() || 0; bVal = b.updatedAt?.toMillis?.() || 0; break;
                    default: return 0;
                }
                if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
                if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [contacts, searchQuery, sortKey, sortDirection, portalFilter, primaryFilter]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(processedContacts.length / recordsPerPage));
    const startIndex = (currentPage - 1) * recordsPerPage;
    const paginatedContacts = processedContacts.slice(startIndex, startIndex + recordsPerPage);
    const startRecord = processedContacts.length === 0 ? 0 : startIndex + 1;
    const endRecord = Math.min(startIndex + recordsPerPage, processedContacts.length);

    // Selection handlers
    const handleSelectAll = () => { setSelectedIds(processedContacts.map(c => c.id)); setSelectionMode("all"); };
    const handleClearSelection = () => { setSelectedIds([]); setSelectionMode("none"); };
    const handleSelectPage = () => { setSelectedIds(paginatedContacts.map(c => c.id)); setSelectionMode("page"); };
    const handleSelectRow = (id: string, checked: boolean) => {
        if (checked) { setSelectedIds(prev => [...prev, id]); setSelectionMode("page"); }
        else { setSelectedIds(prev => prev.filter(x => x !== id)); if (selectedIds.length <= 1) setSelectionMode("none"); }
    };
    const isAllSelected = paginatedContacts.length > 0 && paginatedContacts.every(c => selectedIds.includes(c.id));
    const isSomeSelected = paginatedContacts.some(c => selectedIds.includes(c.id)) && !isAllSelected;

    // Delete handler
    const handleDelete = async (contactId: string) => {
        setDeletingId(contactId);
        try { await deleteContact(contactId); toast.success("Contact deleted"); setSelectedIds(prev => prev.filter(id => id !== contactId)); }
        catch (error) { console.error("Error deleting contact:", error); toast.error("Failed to delete contact"); }
        finally { setDeletingId(null); }
    };

    // Bulk delete
    const handleBulkDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} contacts?`)) return;
        try { await Promise.all(selectedIds.map(id => deleteContact(id))); toast.success("Contacts deleted"); setSelectedIds([]); setSelectionMode("none"); }
        catch (error) { console.error("Bulk delete error:", error); toast.error("Failed to delete contacts"); }
    };

    // Portal access toggle
    const handleTogglePortalAccess = async (contact: any) => {
        const currentPortalEnabled = contact.portalAccess?.enabled || false;
        if (currentPortalEnabled) {
            try { await updateContact(contact.id, { portalAccess: { ...(contact.portalAccess || {}), enabled: false } } as any); toast.success("Portal access disabled"); }
            catch (error) { console.error("Error toggling portal access:", error); toast.error("Failed to update portal access"); }
        } else {
            const hasPortalConfig = (contact.permissions && contact.permissions.length > 0) || (contact.portalAccess?.modules && contact.portalAccess.modules.length > 0);
            if (hasPortalConfig) {
                try { await updateContact(contact.id, { portalAccess: { ...(contact.portalAccess || {}), enabled: true } } as any); toast.success("Portal access enabled"); }
                catch (error) { console.error("Error toggling portal access:", error); toast.error("Failed to update portal access"); }
            } else { setPortalAccessContact(contact); }
        }
    };

    // Export CSV
    const handleExport = () => {
        const dataToExport = selectedIds.length > 0 ? processedContacts.filter(c => selectedIds.includes(c.id)) : processedContacts;
        const headers = ["First Name", "Last Name", "Email", "Phone", "Position", "Primary", "Portal Access"];
        const rows = dataToExport.map(c => [c.firstName, c.lastName, c.email, c.phone || "", c.position || "", c.isPrimary ? "Yes" : "No", c.portalAccess?.enabled ? "Yes" : "No"]);
        const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `contacts_${customer?.company || "export"}.csv`; a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${dataToExport.length} contacts`);
    };

    // Keyboard navigation
    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (focusedRowIndex === null) return;
        const contact = paginatedContacts[focusedRowIndex];
        if (!contact) return;
        switch (e.key) {
            case "ArrowUp": e.preventDefault(); setFocusedRowIndex(prev => Math.max(0, (prev ?? 0) - 1)); break;
            case "ArrowDown": e.preventDefault(); setFocusedRowIndex(prev => Math.min(paginatedContacts.length - 1, (prev ?? 0) + 1)); break;
            case "Enter": e.preventDefault(); setEditingContact(contact); break;
            case " ": e.preventDefault(); handleSelectRow(contact.id, !selectedIds.includes(contact.id)); break;
            case "Delete": e.preventDefault(); if (selectedIds.includes(contact.id)) handleBulkDelete(); else handleDelete(contact.id); break;
        }
    };

    // Ordered columns
    const orderedColumns = columnOrder.map(key => DEFAULT_COLUMNS.find(c => c.key === key)!).filter(Boolean);

    const isLoading = customerLoading || contactsLoading;

    return (
        <TooltipProvider>
            <div className="space-y-4" onKeyDown={handleKeyDown} tabIndex={0} ref={tableRef}>
                <h1 className="text-2xl font-bold">Contacts</h1>

                {/* Compact Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* New Contact */}
                    <ContactDialog customerId={customerId || undefined} customerName={customer?.company}>
                        <Button className="bg-gray-900 text-white hover:bg-gray-800"><Plus className="mr-2 h-4 w-4" />New Contact</Button>
                    </ContactDialog>

                    {/* Actions Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline"><MoreVertical className="h-4 w-4 mr-1" />Actions<ChevronDown className="ml-1 h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={handleExport}><Download className="h-4 w-4 mr-2" />Export {selectedIds.length > 0 ? `(${selectedIds.length})` : "All"}</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {selectedIds.length > 0 && <DropdownMenuItem onClick={handleBulkDelete} className="text-red-600"><Trash className="h-4 w-4 mr-2" />Delete Selected ({selectedIds.length})</DropdownMenuItem>}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Filters Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className={portalFilter !== "all" || primaryFilter !== "all" ? "border-blue-500 text-blue-600" : ""}>
                                <Filter className="h-4 w-4 mr-1" />Filters
                                {(portalFilter !== "all" || primaryFilter !== "all") && <Badge variant="secondary" className="ml-1 text-[10px] px-1">{[portalFilter !== "all" ? 1 : 0, primaryFilter !== "all" ? 1 : 0].reduce((a, b) => a + b, 0)}</Badge>}
                                <ChevronDown className="ml-1 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48">
                            <DropdownMenuLabel>Portal Access</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={portalFilter} onValueChange={(v) => setPortalFilter(v as any)}>
                                <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="enabled">Portal Enabled</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="disabled">No Portal</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Contact Type</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={primaryFilter} onValueChange={(v) => setPrimaryFilter(v as any)}>
                                <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="primary">Primary Only</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="regular">Regular Only</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                            {(portalFilter !== "all" || primaryFilter !== "all") && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => { setPortalFilter("all"); setPrimaryFilter("all"); }}>
                                        <X className="h-4 w-4 mr-2" />Clear All Filters
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Display Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline"><LayoutList className="h-4 w-4 mr-1" />Display<ChevronDown className="ml-1 h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                            <DropdownMenuLabel>Density</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={rowDensity} onValueChange={(v) => setRowDensity(v as RowDensity)}>
                                <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Columns</DropdownMenuLabel>
                            {DEFAULT_COLUMNS.map(col => (
                                <DropdownMenuCheckboxItem key={col.key} checked={columnVisibility[col.key]} onCheckedChange={() => toggleColumn(col.key)} disabled={col.required}>
                                    {col.label}
                                </DropdownMenuCheckboxItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Saved Views</DropdownMenuLabel>
                            {savedViews.map(view => (
                                <DropdownMenuItem key={view.id} className="flex items-center justify-between">
                                    <button onClick={() => applyView(view)} className={`flex-1 text-left ${activeViewId === view.id ? "font-semibold text-blue-600" : ""}`}>
                                        {view.isDefault && <Star className="h-3 w-3 inline mr-1 text-yellow-500 fill-yellow-500" />}{view.name}
                                    </button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical className="h-3 w-3" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => setViewAsDefault(view.id)}>{view.isDefault ? "Remove Default" : "Set as Default"}</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => deleteView(view.id)} className="text-red-600">Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            {activeViewId && <DropdownMenuItem onClick={updateCurrentView}><Save className="h-4 w-4 mr-2" />Update Active View</DropdownMenuItem>}
                            <DropdownMenuItem onClick={() => setShowSaveViewDialog(true)}><BookmarkPlus className="h-4 w-4 mr-2" />Save New View</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Refresh */}
                    <Button variant="outline" size="icon" onClick={() => window.location.reload()}><RotateCcw className="h-4 w-4" /></Button>

                    {/* Right side: Search + Records per page */}
                    <div className="flex-1" />
                    <Select value={String(recordsPerPage)} onValueChange={(v) => { setRecordsPerPage(Number(v)); setCurrentPage(1); }}>
                        <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input placeholder="Search..." className="pl-9" autoComplete="off" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                </div>

                {/* Top Pagination */}
                {processedContacts.length > 0 && (
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalRecords={processedContacts.length} startRecord={startRecord} endRecord={endRecord} />
                )}

                {/* Selection Banner */}
                <SelectionBanner selectionMode={selectionMode} selectedCount={selectedIds.length} pageCount={paginatedContacts.length} totalCount={processedContacts.length} onSelectAll={handleSelectAll} onClearSelection={handleClearSelection} />

                {/* Table */}
                <div className="rounded-md border bg-white overflow-x-auto">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <Table className="table-fixed">
                            <TableHeader>
                                <TableRow className="bg-gray-100 hover:bg-gray-100">
                                    <TableHead className="w-[48px] sticky left-0 z-40 bg-gray-100 border-r">
                                        <Checkbox checked={isAllSelected} onCheckedChange={(c) => c ? handleSelectPage() : handleClearSelection()} className={isSomeSelected ? "opacity-50" : ""} />
                                    </TableHead>
                                    <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                                        {orderedColumns.map(col => (
                                            <DraggableColumnHeader key={col.key} column={col} sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} isVisible={columnVisibility[col.key]} width={columnWidths[col.key] || col.width || 100} onResize={handleColumnResize} />
                                        ))}
                                    </SortableContext>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={orderedColumns.filter(c => columnVisibility[c.key]).length + 1} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                                ) : paginatedContacts.length === 0 ? (
                                    <TableRow><TableCell colSpan={orderedColumns.filter(c => columnVisibility[c.key]).length + 1} className="text-center py-8 text-gray-500">{searchQuery ? "No contacts match your search." : "No contacts found."}</TableCell></TableRow>
                                ) : (
                                    paginatedContacts.map((contact, index) => (
                                        <TableRow key={contact.id} className={`${selectedIds.includes(contact.id) ? "bg-blue-50/50" : ""} ${focusedRowIndex === index ? "ring-2 ring-inset ring-blue-400" : ""}`} onClick={() => setFocusedRowIndex(index)}>
                                            <TableCell className={`${ROW_DENSITY_STYLES[rowDensity]} sticky left-0 z-20 bg-white border-r`}>
                                                <Checkbox checked={selectedIds.includes(contact.id)} onCheckedChange={(c) => handleSelectRow(contact.id, !!c)} />
                                            </TableCell>
                                            {orderedColumns.map(col => {
                                                if (!columnVisibility[col.key]) return null;
                                                const width = columnWidths[col.key] || col.width || 100;
                                                const isNameCol = col.key === "name";
                                                return (
                                                    <TableCell key={col.key} className={`${ROW_DENSITY_STYLES[rowDensity]} ${isNameCol ? "sticky left-[48px] z-20 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r" : ""}`} style={{ width, maxWidth: width }}>
                                                        {col.key === "name" && (
                                                            <div className="flex items-center gap-3 group">
                                                                <Avatar className="h-8 w-8">
                                                                    <AvatarFallback className="bg-gray-200 text-gray-500 text-xs">{contact.firstName?.[0]}{contact.lastName?.[0]}</AvatarFallback>
                                                                </Avatar>
                                                                <div className="flex-1 min-w-0">
                                                                    <HoverCard openDelay={300}>
                                                                        <HoverCardTrigger asChild>
                                                                            <span className="font-medium text-gray-900 truncate block cursor-pointer hover:text-blue-600">
                                                                                <HighlightText text={`${contact.firstName} ${contact.lastName}`} search={searchQuery} />
                                                                            </span>
                                                                        </HoverCardTrigger>
                                                                        <HoverCardContent side="right" className="p-0"><QuickViewCard contact={contact} /></HoverCardContent>
                                                                    </HoverCard>
                                                                    {rowDensity === "comfortable" && (
                                                                        <div className="hidden group-hover:flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                                                                            <Tooltip><TooltipTrigger asChild><button className="hover:text-blue-600" onClick={() => setEditingContact(contact)}><Pencil className="h-2.5 w-2.5" /></button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
                                                                            <AlertDialog>
                                                                                <AlertDialogTrigger asChild><Tooltip><TooltipTrigger asChild><button className="hover:text-red-600" disabled={deletingId === contact.id}><Trash className="h-2.5 w-2.5" /></button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip></AlertDialogTrigger>
                                                                                <AlertDialogContent>
                                                                                    <AlertDialogHeader><AlertDialogTitle>Delete Contact</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete {contact.firstName}?</AlertDialogDescription></AlertDialogHeader>
                                                                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => handleDelete(contact.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                                                </AlertDialogContent>
                                                                            </AlertDialog>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {col.key === "email" && (
                                                            <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline truncate block"><HighlightText text={contact.email || "-"} search={searchQuery} /></a>
                                                        )}
                                                        {col.key === "phone" && (
                                                            contact.phone ? <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline"><HighlightText text={contact.phone} search={searchQuery} /></a> : <span className="text-gray-400">-</span>
                                                        )}
                                                        {col.key === "position" && (<span className="truncate block"><HighlightText text={contact.position || "-"} search={searchQuery} /></span>)}
                                                        {col.key === "portal" && (<Switch checked={contact.portalAccess?.enabled || false} className="data-[state=checked]:bg-blue-600 scale-90" onCheckedChange={() => handleTogglePortalAccess(contact)} />)}
                                                        {col.key === "primary" && (contact.isPrimary ? <Badge className="bg-blue-100 text-blue-600 text-[10px]">Primary</Badge> : <span className="text-gray-400">-</span>)}
                                                        {col.key === "lastActivity" && (<span className="text-gray-500 text-xs">{formatLastActivity(contact.updatedAt)}</span>)}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </DndContext>
                </div>

                {/* Bottom Pagination */}
                {processedContacts.length > 0 && (
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalRecords={processedContacts.length} startRecord={startRecord} endRecord={endRecord} />
                )}

                {/* Save View Dialog */}
                <Dialog open={showSaveViewDialog} onOpenChange={setShowSaveViewDialog}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Save View</DialogTitle><DialogDescription>Save your current settings as a reusable view.</DialogDescription></DialogHeader>
                        <div className="py-4"><Label>View Name</Label><Input value={newViewName} onChange={(e) => setNewViewName(e.target.value)} placeholder="My View" /></div>
                        <DialogFooter className="flex-col sm:flex-row gap-2">
                            <Button className="flex-1" disabled={!newViewName.trim()} onClick={() => saveCurrentView(newViewName.trim())}>Save New</Button>
                            <Button variant="outline" className="flex-1" disabled={!newViewName.trim()} onClick={() => saveCurrentView(newViewName.trim(), true)}>Save as Default</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit Contact Dialog */}
                {editingContact && (
                    <ContactDialog customerId={customerId || undefined} customerName={customer?.company} contact={editingContact} open={!!editingContact} onOpenChange={(open) => { if (!open) setEditingContact(null); }} onSuccess={() => setEditingContact(null)} />
                )}

                {/* Portal Access Setup Dialog */}
                {portalAccessContact && (
                    <ContactDialog customerId={customerId || undefined} customerName={customer?.company} contact={{ ...portalAccessContact, portalAccess: { ...(portalAccessContact.portalAccess || {}), enabled: true } }} open={!!portalAccessContact} onOpenChange={(open) => { if (!open) setPortalAccessContact(null); }} onSuccess={() => setPortalAccessContact(null)} initialStep={2} />
                )}
            </div>
        </TooltipProvider>
    );
}
