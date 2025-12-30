"use client";

import { useState, useEffect, useMemo, useCallback, useRef, KeyboardEvent } from "react";
import { useCustomer } from "@/components/dashboard/customers/customer-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuCheckboxItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
    Search,
    Plus,
    SquarePen,
    Trash2,
    MoreVertical,
    ChevronDown,
    LayoutList,
    Download,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    RotateCcw,
    Loader2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-react";
import { collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";

// Types
type SortDirection = "asc" | "desc" | null;
type RowDensity = "compact" | "comfortable";
type ColumnKey = "description" | "addedFrom" | "dateAdded";

interface Note {
    id: string;
    description: string;
    addedFrom: string;
    dateAdded: string;
    createdAt?: Timestamp;
}

interface ColumnDef {
    key: ColumnKey;
    label: string;
    defaultVisible: boolean;
    sortable?: boolean;
    width?: number;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
    { key: "description", label: "Description", defaultVisible: true, sortable: true, width: 400 },
    { key: "addedFrom", label: "Added From", defaultVisible: true, sortable: true, width: 200 },
    { key: "dateAdded", label: "Date Added", defaultVisible: true, sortable: true, width: 180 },
];

const ROW_DENSITY_STYLES: Record<RowDensity, string> = { compact: "py-1 text-xs", comfortable: "py-3 text-sm" };

// Highlight text component
function HighlightText({ text, search }: { text: string; search: string }) {
    if (!search.trim() || !text) return <>{text}</>;
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return (
        <>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <mark key={i} className="bg-yellow-200 px-0.5 rounded">
                        {part}
                    </mark>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </>
    );
}

// Pagination component
function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    totalRecords,
    startRecord,
    endRecord,
}: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalRecords: number;
    startRecord: number;
    endRecord: number;
}) {
    return (
        <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
                Showing {startRecord} to {endRecord} of {totalRecords}
            </span>
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                >
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 py-1 bg-gray-100 rounded text-sm font-medium">
                    {currentPage} / {totalPages}
                </span>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                >
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

export default function NotesPage() {
    const { customerId, loading: customerLoading } = useCustomer();
    const { user } = useAuth();
    const tableRef = useRef<HTMLDivElement>(null);

    // Data State
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);

    // Creation State
    const [newNoteText, setNewNoteText] = useState("");
    const [saving, setSaving] = useState(false);
    const [showNewNote, setShowNewNote] = useState(false);

    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");

    // Table State
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage, setRecordsPerPage] = useState(25);
    const [columnVisibility, setColumnVisibility] = useState<Record<ColumnKey, boolean>>({
        description: true,
        addedFrom: true,
        dateAdded: true,
    });
    const [sortKey, setSortKey] = useState<ColumnKey | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [rowDensity, setRowDensity] = useState<RowDensity>("comfortable");
    const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Load notes from Firestore
    useEffect(() => {
        if (!customerId) {
            setLoading(false);
            return;
        }
        const notesRef = collection(db, "customers", customerId, "notes");
        const unsubscribe = onSnapshot(
            notesRef,
            (snapshot) => {
                const notesData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Note[];
                setNotes(notesData);
                setLoading(false);
            },
            (err) => {
                console.error("Error loading notes:", err);
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, [customerId]);

    // CRUD handlers
    const handleSaveNewNote = async () => {
        if (!newNoteText.trim() || !customerId) return;
        setSaving(true);
        try {
            const notesRef = collection(db, "customers", customerId, "notes");
            await addDoc(notesRef, {
                description: newNoteText,
                addedFrom: user?.email || "System",
                dateAdded: new Date().toLocaleString(),
                createdAt: Timestamp.now(),
            });
            setNewNoteText("");
            setShowNewNote(false);
            toast.success("Note added successfully");
        } catch (error) {
            console.error("Error saving note:", error);
            toast.error("Failed to save note");
        } finally {
            setSaving(false);
        }
    };

    const saveEdit = async (id: string) => {
        if (!customerId) return;
        try {
            const noteRef = doc(db, "customers", customerId, "notes", id);
            await updateDoc(noteRef, { description: editText });
            setEditingId(null);
            toast.success("Note updated");
        } catch (error) {
            console.error("Error updating note:", error);
            toast.error("Failed to update note");
        }
    };

    const deleteNote = async (id: string) => {
        if (!customerId) return;
        try {
            const noteRef = doc(db, "customers", customerId, "notes", id);
            await deleteDoc(noteRef);
            setSelectedIds((prev) => prev.filter((i) => i !== id));
            toast.success("Note deleted");
        } catch (error) {
            console.error("Error deleting note:", error);
            toast.error("Failed to delete note");
        }
    };

    const handleBulkDelete = async () => {
        if (!customerId || selectedIds.length === 0) return;
        try {
            await Promise.all(selectedIds.map((id) => deleteDoc(doc(db, "customers", customerId, "notes", id))));
            setSelectedIds([]);
            toast.success(`Deleted ${selectedIds.length} notes`);
        } catch (error) {
            toast.error("Failed to delete notes");
        }
    };

    // Export
    const handleExport = () => {
        const dataToExport = selectedIds.length > 0 ? notes.filter((n) => selectedIds.includes(n.id)) : processedNotes;
        const csv = [
            "Description,Added From,Date Added",
            ...dataToExport.map((n) => `"${n.description.replace(/"/g, '""')}","${n.addedFrom}","${n.dateAdded}"`),
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "notes-export.csv";
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Exported successfully");
    };

    // Sort handler
    const handleSort = (key: ColumnKey) => {
        if (sortKey === key) {
            setSortDirection((prev) => (prev === "asc" ? "desc" : prev === "desc" ? null : "asc"));
            if (sortDirection === "desc") setSortKey(null);
        } else {
            setSortKey(key);
            setSortDirection("asc");
        }
    };

    // Toggle column
    const toggleColumn = (key: ColumnKey) => setColumnVisibility((prev) => ({ ...prev, [key]: !prev[key] }));

    // Process notes
    const processedNotes = useMemo(() => {
        let result = [...notes];
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(
                (n) =>
                    n.description?.toLowerCase().includes(lowerQuery) || n.addedFrom?.toLowerCase().includes(lowerQuery)
            );
        }
        if (sortKey && sortDirection) {
            result.sort((a, b) => {
                let aVal: any, bVal: any;
                switch (sortKey) {
                    case "description":
                        aVal = a.description?.toLowerCase() || "";
                        bVal = b.description?.toLowerCase() || "";
                        break;
                    case "addedFrom":
                        aVal = a.addedFrom?.toLowerCase() || "";
                        bVal = b.addedFrom?.toLowerCase() || "";
                        break;
                    case "dateAdded":
                        aVal = a.createdAt?.toMillis?.() || 0;
                        bVal = b.createdAt?.toMillis?.() || 0;
                        break;
                    default:
                        return 0;
                }
                if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
                if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [notes, searchQuery, sortKey, sortDirection]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(processedNotes.length / recordsPerPage));
    const startIndex = (currentPage - 1) * recordsPerPage;
    const paginatedNotes = processedNotes.slice(startIndex, startIndex + recordsPerPage);
    const startRecord = processedNotes.length === 0 ? 0 : startIndex + 1;
    const endRecord = Math.min(startIndex + recordsPerPage, processedNotes.length);

    // Selection handlers
    const handleSelectAll = () => {
        setSelectedIds(processedNotes.map((n) => n.id));
    };
    const handleClearSelection = () => {
        setSelectedIds([]);
    };
    const handleSelectPage = () => {
        setSelectedIds(paginatedNotes.map((n) => n.id));
    };
    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    };
    const isAllSelected = paginatedNotes.length > 0 && paginatedNotes.every((n) => selectedIds.includes(n.id));
    const isSomeSelected = paginatedNotes.some((n) => selectedIds.includes(n.id)) && !isAllSelected;

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLDivElement>) => {
            if (focusedRowIndex === null || paginatedNotes.length === 0) return;
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setFocusedRowIndex(Math.min(focusedRowIndex + 1, paginatedNotes.length - 1));
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setFocusedRowIndex(Math.max(focusedRowIndex - 1, 0));
                    break;
                case " ":
                    e.preventDefault();
                    toggleSelect(paginatedNotes[focusedRowIndex].id);
                    break;
                case "Delete":
                    e.preventDefault();
                    setDeletingId(paginatedNotes[focusedRowIndex].id);
                    break;
                case "Enter":
                    e.preventDefault();
                    setEditingId(paginatedNotes[focusedRowIndex].id);
                    setEditText(paginatedNotes[focusedRowIndex].description);
                    break;
            }
        },
        [focusedRowIndex, paginatedNotes]
    );

    const visibleColumns = DEFAULT_COLUMNS.filter((c) => columnVisibility[c.key]);

    if (customerLoading || loading) {
        return (
            <div className="p-8 flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading notes...
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="space-y-4" onKeyDown={handleKeyDown} tabIndex={0} ref={tableRef}>
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Notes</h1>
                    <Button
                        className="bg-gray-900 text-white hover:bg-gray-800"
                        onClick={() => setShowNewNote(!showNewNote)}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        {showNewNote ? "Cancel" : "New Note"}
                    </Button>
                </div>

                {/* New Note Form */}
                {showNewNote && (
                    <div className="bg-white rounded-lg border p-4 space-y-3">
                        <Textarea
                            placeholder="Enter note description..."
                            className="min-h-[100px]"
                            value={newNoteText}
                            onChange={(e) => setNewNoteText(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowNewNote(false);
                                    setNewNoteText("");
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                onClick={handleSaveNewNote}
                                disabled={saving || !newNoteText.trim()}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    "Save Note"
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Compact Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Actions Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <MoreVertical className="h-4 w-4 mr-1" />
                                Actions
                                <ChevronDown className="ml-1 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={handleExport}>
                                <Download className="h-4 w-4 mr-2" />
                                Export {selectedIds.length > 0 ? `(${selectedIds.length})` : "All"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {selectedIds.length > 0 && (
                                <DropdownMenuItem onClick={handleBulkDelete} className="text-red-600">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Selected ({selectedIds.length})
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Display Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <LayoutList className="h-4 w-4 mr-1" />
                                Display
                                <ChevronDown className="ml-1 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48">
                            <DropdownMenuLabel>Density</DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                                value={rowDensity}
                                onValueChange={(v) => setRowDensity(v as RowDensity)}
                            >
                                <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Columns</DropdownMenuLabel>
                            {DEFAULT_COLUMNS.map((col) => (
                                <DropdownMenuCheckboxItem
                                    key={col.key}
                                    checked={columnVisibility[col.key]}
                                    onCheckedChange={() => toggleColumn(col.key)}
                                >
                                    {col.label}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Refresh */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                    setSearchQuery("");
                                    setSortKey(null);
                                    setSortDirection(null);
                                    setSelectedIds([]);
                                }}
                            >
                                <RotateCcw className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Reset filters</TooltipContent>
                    </Tooltip>

                    <div className="flex-1" />

                    {/* Records Per Page */}
                    <Select
                        value={String(recordsPerPage)}
                        onValueChange={(v) => {
                            setRecordsPerPage(Number(v));
                            setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[70px]">
                            <SelectValue />
                        </SelectTrigger>
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
                        <Input
                            placeholder="Search..."
                            className="pl-9"
                            autoComplete="new-password"
                            name="notes-search-nofill"
                            data-lpignore="true"
                            data-1p-ignore="true"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Top Pagination */}
                {processedNotes.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalRecords={processedNotes.length}
                        startRecord={startRecord}
                        endRecord={endRecord}
                    />
                )}

                {/* Selection Banner */}
                {selectedIds.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center justify-between">
                        <span className="text-blue-800 text-sm font-medium">
                            {selectedIds.length} note{selectedIds.length > 1 ? "s" : ""} selected
                        </span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleSelectAll}>
                                Select All ({processedNotes.length})
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleClearSelection}>
                                Clear
                            </Button>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/80">
                                <TableHead className="w-12 bg-gray-100/50">
                                    <Checkbox
                                        checked={isAllSelected}
                                        ref={(el) => {
                                            if (el) (el as any).indeterminate = isSomeSelected;
                                        }}
                                        onCheckedChange={(checked) => {
                                            if (checked) handleSelectPage();
                                            else handleClearSelection();
                                        }}
                                    />
                                </TableHead>
                                {visibleColumns.map((col) => (
                                    <TableHead
                                        key={col.key}
                                        className="font-semibold text-gray-900 bg-gray-100/50"
                                        style={{ minWidth: col.width }}
                                    >
                                        {col.sortable ? (
                                            <Button
                                                variant="ghost"
                                                className="h-8 px-2 -ml-2 font-semibold hover:bg-gray-200"
                                                onClick={() => handleSort(col.key)}
                                            >
                                                {col.label}
                                                {sortKey === col.key ? (
                                                    sortDirection === "asc" ? (
                                                        <ArrowUp className="ml-1 h-4 w-4" />
                                                    ) : (
                                                        <ArrowDown className="ml-1 h-4 w-4" />
                                                    )
                                                ) : (
                                                    <ArrowUpDown className="ml-1 h-4 w-4 opacity-40" />
                                                )}
                                            </Button>
                                        ) : (
                                            col.label
                                        )}
                                    </TableHead>
                                ))}
                                <TableHead className="w-24 font-semibold text-gray-900 bg-gray-100/50">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedNotes.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={visibleColumns.length + 2}
                                        className="text-center py-8 text-gray-500"
                                    >
                                        {searchQuery
                                            ? "No notes match your search."
                                            : "No notes found. Add a note to get started."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedNotes.map((note, index) => (
                                    <TableRow
                                        key={note.id}
                                        className={`group hover:bg-gray-50 ${focusedRowIndex === index ? "bg-blue-50" : ""} ${selectedIds.includes(note.id) ? "bg-blue-50/50" : ""}`}
                                        onClick={() => setFocusedRowIndex(index)}
                                    >
                                        <TableCell className={ROW_DENSITY_STYLES[rowDensity]}>
                                            <Checkbox
                                                checked={selectedIds.includes(note.id)}
                                                onCheckedChange={() => toggleSelect(note.id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </TableCell>
                                        {visibleColumns.map((col) => (
                                            <TableCell
                                                key={col.key}
                                                className={`${ROW_DENSITY_STYLES[rowDensity]} max-w-md`}
                                            >
                                                {col.key === "description" &&
                                                    (editingId === note.id ? (
                                                        <div className="space-y-2">
                                                            <Textarea
                                                                value={editText}
                                                                onChange={(e) => setEditText(e.target.value)}
                                                                className="min-h-[80px]"
                                                            />
                                                            <div className="flex gap-2 justify-end">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => setEditingId(null)}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    className="bg-gray-900 hover:bg-gray-800 text-white"
                                                                    onClick={() => saveEdit(note.id)}
                                                                >
                                                                    Save
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="whitespace-pre-wrap text-gray-700 line-clamp-3">
                                                            <HighlightText
                                                                text={note.description}
                                                                search={searchQuery}
                                                            />
                                                        </div>
                                                    ))}
                                                {col.key === "addedFrom" && (
                                                    <span className="text-gray-600">
                                                        <HighlightText
                                                            text={note.addedFrom || "-"}
                                                            search={searchQuery}
                                                        />
                                                    </span>
                                                )}
                                                {col.key === "dateAdded" && (
                                                    <span className="text-gray-600 text-xs">{note.dateAdded}</span>
                                                )}
                                            </TableCell>
                                        ))}
                                        <TableCell className={`${ROW_DENSITY_STYLES[rowDensity]} overflow-visible`}>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => {
                                                                setEditingId(note.id);
                                                                setEditText(note.description);
                                                            }}
                                                        >
                                                            <SquarePen className="h-4 w-4 text-gray-500" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Edit</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => setDeletingId(note.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600" />
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

                {/* Bottom Pagination */}
                {processedNotes.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalRecords={processedNotes.length}
                        startRecord={startRecord}
                        endRecord={endRecord}
                    />
                )}

                {/* Delete Confirmation */}
                <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Note?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete this note.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => {
                                    if (deletingId) deleteNote(deletingId);
                                    setDeletingId(null);
                                }}
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </TooltipProvider>
    );
}
