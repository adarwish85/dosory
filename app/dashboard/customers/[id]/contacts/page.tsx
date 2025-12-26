"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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
    LayoutList, FolderOpen, BookmarkPlus, Save, Star, Trash, MoreVertical, X
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
    DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

// Saved View types
interface ContactsSavedView {
    id: string;
    name: string;
    sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
    rowsPerPage: number;
    isDefault?: boolean;
    createdAt: number;
}

const CONTACTS_SAVED_VIEWS_KEY = "contacts_saved_views";

export default function ContactsPage() {
    const { customer, loading: customerLoading, customerId } = useCustomer();
    const { contacts, loading: contactsLoading, deleteContact, updateContact } = useContacts({ customerId: customerId || undefined });

    // UI State
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editingContact, setEditingContact] = useState<any>(null); // For edit dialog
    const [portalAccessContact, setPortalAccessContact] = useState<any>(null); // For portal setup dialog

    // Saved Views state
    const [savedViews, setSavedViews] = useState<ContactsSavedView[]>([]);
    const [viewsLoaded, setViewsLoaded] = useState(false);
    const [showSaveViewDialog, setShowSaveViewDialog] = useState(false);
    const [newViewName, setNewViewName] = useState("");
    const [activeViewId, setActiveViewId] = useState<string | null>(null);

    // Load saved views
    useEffect(() => {
        try {
            const stored = localStorage.getItem(CONTACTS_SAVED_VIEWS_KEY);
            if (stored) {
                const views = JSON.parse(stored) as ContactsSavedView[];
                setSavedViews(views);
                const defaultView = views.find(v => v.isDefault);
                if (defaultView) {
                    if (defaultView.sortConfig) setSortConfig(defaultView.sortConfig);
                    if (defaultView.rowsPerPage) setRowsPerPage(defaultView.rowsPerPage);
                    setActiveViewId(defaultView.id);
                }
            }
        } catch (e) { console.error("Failed to load saved views", e); }
        finally { setViewsLoaded(true); }
    }, []);

    // Save views to localStorage
    useEffect(() => {
        if (viewsLoaded) {
            localStorage.setItem(CONTACTS_SAVED_VIEWS_KEY, JSON.stringify(savedViews));
        }
    }, [savedViews, viewsLoaded]);

    // View handlers
    const applyView = useCallback((view: ContactsSavedView) => {
        if (view.sortConfig) setSortConfig(view.sortConfig);
        setRowsPerPage(view.rowsPerPage);
        setActiveViewId(view.id);
        setCurrentPage(1);
    }, []);

    const saveCurrentView = useCallback((name: string, setAsDefault: boolean = false) => {
        const newView: ContactsSavedView = {
            id: crypto.randomUUID(),
            name,
            sortConfig,
            rowsPerPage,
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
    }, [sortConfig, rowsPerPage]);

    const deleteView = useCallback((viewId: string) => {
        setSavedViews(prev => prev.filter(v => v.id !== viewId));
        if (activeViewId === viewId) setActiveViewId(null);
    }, [activeViewId]);

    const setViewAsDefault = useCallback((viewId: string) => {
        setSavedViews(prev => prev.map(v => ({
            ...v,
            isDefault: v.id === viewId ? !v.isDefault : false
        })));
    }, []);

    const loading = customerLoading || contactsLoading;

    // Filter & Sort Logic
    const processedContacts = useMemo(() => {
        let result = [...contacts];

        // Filter
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(c =>
                c.firstName?.toLowerCase().includes(lowerQuery) ||
                c.lastName?.toLowerCase().includes(lowerQuery) ||
                c.email?.toLowerCase().includes(lowerQuery) ||
                c.position?.toLowerCase().includes(lowerQuery)
            );
        }

        // Sort
        if (sortConfig) {
            result.sort((a: any, b: any) => {
                const aValue = a[sortConfig.key] || "";
                const bValue = b[sortConfig.key] || "";

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [contacts, searchQuery, sortConfig]);

    // Pagination Logic
    const totalPages = Math.ceil(processedContacts.length / rowsPerPage);
    const paginatedContacts = processedContacts.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    // Selection Logic
    const isAllSelected = paginatedContacts.length > 0 && paginatedContacts.every(c => selectedIds.includes(c.id));
    const isSomeSelected = paginatedContacts.some(c => selectedIds.includes(c.id)) && !isAllSelected;

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const currentIds = paginatedContacts.map(c => c.id);
            setSelectedIds(prev => Array.from(new Set([...prev, ...currentIds])));
        } else {
            const currentIds = paginatedContacts.map(c => c.id);
            setSelectedIds(prev => prev.filter(id => !currentIds.includes(id)));
        }
    };

    const handleSelectRow = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
        }
    };

    // Sorting Handler
    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return current.direction === 'asc' ? { key, direction: 'desc' } : null;
            }
            return { key, direction: 'asc' };
        });
    };

    // Actions
    const handleDelete = async (contactId: string) => {
        setDeletingId(contactId);
        try {
            await deleteContact(contactId);
            toast.success("Contact deleted successfully");
            setSelectedIds(prev => prev.filter(id => id !== contactId));
        } catch (error) {
            console.error("Error deleting contact:", error);
            toast.error("Failed to delete contact");
        } finally {
            setDeletingId(null);
        }
    };

    const handleTogglePortalAccess = async (contact: any) => {
        const currentPortalAccess = contact.portalAccess || false;

        if (currentPortalAccess) {
            // Turning OFF - just update portalAccess
            try {
                await updateContact(contact.id, { portalAccess: false });
                toast.success("Portal access disabled");
            } catch (error) {
                console.error("Error toggling portal access:", error);
                toast.error("Failed to update portal access");
            }
        } else {
            // Turning ON - check if contact has portal config (permissions set or password was set before)
            const hasPortalConfig = contact.permissions && contact.permissions.length > 0;

            if (hasPortalConfig) {
                // Just reactivate - user had config before
                try {
                    await updateContact(contact.id, { portalAccess: true });
                    toast.success("Portal access enabled");
                } catch (error) {
                    console.error("Error toggling portal access:", error);
                    toast.error("Failed to update portal access");
                }
            } else {
                // Open dialog at step 2 to configure portal access
                setPortalAccessContact(contact);
            }
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} contacts?`)) return;

        try {
            await Promise.all(selectedIds.map(id => deleteContact(id)));
            toast.success("Contacts deleted successfully");
            setSelectedIds([]);
        } catch (error) {
            console.error("Bulk delete error:", error);
            toast.error("Failed to delete contacts");
        }
    };

    const handleBulkStatus = async (status: 'active' | 'inactive') => {
        try {
            await Promise.all(selectedIds.map(id => updateContact(id, { status })));
            toast.success(`Contacts marked as ${status}`);
            setSelectedIds([]);
        } catch (error) {
            console.error("Bulk status error:", error);
            toast.error("Failed to update contacts");
        }
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Contacts</h2>
            </div>

            <div className="rounded-md border bg-white p-4 shadow-sm">

                {/* Actions Toolbar */}
                <div className="mb-4">
                    <ContactDialog
                        customerId={customerId || undefined}
                        customerName={customer?.company}
                    />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        {/* Pagination Size */}
                        <Select value={String(rowsPerPage)} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[70px]">
                                <SelectValue placeholder="25" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Bulk Actions */}
                        {selectedIds.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="flex items-center gap-2 text-purple-600 border-purple-200 bg-purple-50 hover:bg-purple-100">
                                        Bulk Actions ({selectedIds.length}) <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    <DropdownMenuItem onClick={() => handleBulkStatus('active')}>
                                        Mark as Active
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleBulkStatus('inactive')}>
                                        Mark as Inactive
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleBulkDelete} className="text-red-600 focus:text-red-600">
                                        Delete Selected
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        <Button variant="outline" className="text-gray-600">Export</Button>

                        {/* Display / Saved Views Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className={`gap-2 ${activeViewId ? "border-purple-200 text-purple-600" : "text-gray-600"}`}>
                                    <LayoutList className="h-4 w-4" /> Display
                                    {savedViews.length > 0 && <Badge variant="secondary" className="ml-1 px-1 py-0 h-4 bg-purple-100 text-purple-700">{savedViews.length}</Badge>}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
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
                                    <DropdownMenuItem onClick={() => { setActiveViewId(null); setSortConfig(null); setRowsPerPage(25); }}>
                                        <X className="mr-2 h-4 w-4" /> Reset to Default
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button variant="outline" size="icon" className="text-gray-600 w-9 px-0" onClick={() => window.location.reload()}>
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search..."
                            className="pl-9"
                            autoComplete="off"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Selection Banner */}
                {selectedIds.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-2 flex items-center gap-2 text-sm mb-4">
                        <CheckSquare className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-800">
                            <strong>{selectedIds.length}</strong> contacts selected.
                        </span>
                        <button onClick={() => setSelectedIds([])} className="text-blue-600 font-medium hover:underline ml-2">
                            Clear Selection
                        </button>
                    </div>
                )}

                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="w-[40px] px-4 font-semibold text-gray-900 bg-gray-100/50">
                                <Checkbox
                                    checked={isAllSelected}
                                    onCheckedChange={handleSelectAll}
                                    className={isSomeSelected ? "opacity-50" : ""}
                                />
                            </TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50 cursor-pointer hover:bg-gray-200/50 transition-colors" onClick={() => handleSort('firstName')}>
                                <div className="flex items-center gap-1">
                                    Full Name
                                    {sortConfig?.key === 'firstName' ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                                </div>
                            </TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50 cursor-pointer hover:bg-gray-200/50 transition-colors" onClick={() => handleSort('email')}>
                                <div className="flex items-center gap-1">
                                    Email
                                    {sortConfig?.key === 'email' ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                                </div>
                            </TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50 cursor-pointer hover:bg-gray-200/50 transition-colors" onClick={() => handleSort('position')}>
                                <div className="flex items-center gap-1">
                                    Position
                                    {sortConfig?.key === 'position' ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                                </div>
                            </TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Phone</TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Portal</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedContacts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                    {searchQuery ? "No contacts match your search." : `No contacts found for ${customer?.company || "this customer"}. Add a contact to get started.`}
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedContacts.map((contact) => (
                                <TableRow key={contact.id} className={selectedIds.includes(contact.id) ? "bg-blue-50/30" : ""}>
                                    <TableCell className="px-4 py-3">
                                        <Checkbox
                                            checked={selectedIds.includes(contact.id)}
                                            onCheckedChange={(c) => handleSelectRow(contact.id, !!c)}
                                        />
                                    </TableCell>
                                    <TableCell className="min-w-[200px] py-3">
                                        <div className="flex items-center gap-3 group">
                                            <Avatar className="h-9 w-9 bg-gray-200">
                                                <AvatarFallback className="bg-gray-200 text-gray-500 text-xs">
                                                    {contact.firstName?.[0]}{contact.lastName?.[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900 flex items-center gap-2">
                                                    {contact.firstName} {contact.lastName}
                                                    {contact.isPrimary && (
                                                        <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded uppercase tracking-wide font-semibold">Primary</span>
                                                    )}
                                                </span>
                                                <div className="hidden group-hover:flex items-center gap-2 mt-0.5 text-xs">
                                                    <button
                                                        className="text-gray-600 hover:text-blue-600 hover:underline"
                                                        onClick={() => setEditingContact(contact)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <span className="text-gray-300">|</span>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <button
                                                                className="text-gray-600 hover:text-red-600 hover:underline"
                                                                disabled={deletingId === contact.id}
                                                            >
                                                                Delete
                                                            </button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Are you sure you want to delete {contact.firstName}?
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => handleDelete(contact.id)}>Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 text-gray-700">{contact.email}</TableCell>
                                    <TableCell className="py-4 text-gray-700">{contact.position || "-"}</TableCell>
                                    <TableCell className="py-4 text-gray-700">{contact.phone || "-"}</TableCell>
                                    <TableCell className="py-4">
                                        <Switch
                                            checked={contact.portalAccess || false}
                                            className="data-[state=checked]:bg-blue-600 scale-90"
                                            onCheckedChange={() => handleTogglePortalAccess(contact)}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                <div className="flex items-center justify-between pt-4 border-t mt-4">
                    <div className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, processedContacts.length)} of {processedContacts.length} contacts
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                        >
                            Previous
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }).map((_, i) => (
                                <Button
                                    key={i}
                                    variant={currentPage === i + 1 ? "secondary" : "ghost"}
                                    size="sm"
                                    className={`h-8 w-8 p-0 ${currentPage === i + 1 ? "bg-gray-200 text-gray-900 font-medium" : "text-gray-500"}`}
                                    onClick={() => setCurrentPage(i + 1)}
                                >
                                    {i + 1}
                                </Button>
                            ))}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>

            {/* Save View Dialog */}
            <Dialog open={showSaveViewDialog} onOpenChange={setShowSaveViewDialog}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Save className="h-5 w-5" /> Save Current View</DialogTitle>
                        <DialogDescription>Save your current sort and pagination preferences.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="view-name">View Name</Label>
                            <Input id="view-name" placeholder="e.g. Sorted by Name" value={newViewName} onChange={(e) => setNewViewName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newViewName.trim()) saveCurrentView(newViewName.trim()); }} />
                        </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-col gap-2">
                        <div className="flex gap-2 w-full">
                            <Button className="flex-1" disabled={!newViewName.trim()} onClick={() => saveCurrentView(newViewName.trim())}>Save New</Button>
                        </div>
                        <Button variant="outline" className="w-full" disabled={!newViewName.trim()} onClick={() => saveCurrentView(newViewName.trim(), true)}>Save as Default View</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Controlled Edit Contact Dialog */}
            {editingContact && (
                <ContactDialog
                    customerId={customerId || undefined}
                    customerName={customer?.company}
                    contact={editingContact}
                    open={!!editingContact}
                    onOpenChange={(open) => { if (!open) setEditingContact(null); }}
                    onSuccess={() => setEditingContact(null)}
                />
            )}

            {/* Portal Access Setup Dialog - Opens at step 2 */}
            {portalAccessContact && (
                <ContactDialog
                    customerId={customerId || undefined}
                    customerName={customer?.company}
                    contact={{ ...portalAccessContact, portalAccess: true }}
                    open={!!portalAccessContact}
                    onOpenChange={(open) => { if (!open) setPortalAccessContact(null); }}
                    onSuccess={() => setPortalAccessContact(null)}
                    initialStep={2}
                />
            )}
        </div>
    );
}
