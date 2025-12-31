"use client";

import { useState, useMemo, useCallback, useRef, useEffect, KeyboardEvent } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Search,
    RotateCcw,
    Loader2,
    Download,
    Trash2,
    ChevronDown,
    Columns,
    LayoutList,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Pencil,
    ExternalLink,
    Trash,
    Users,
    DollarSign,
    Building2,
    Mail,
    Phone,
} from "lucide-react";
import { useCustomers } from "@/lib/hooks";
import { CUSTOMER_GROUPS } from "@/lib/constants";
import { format } from "date-fns";
import Link from "next/link";
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
import { toast } from "sonner";

interface CustomersTableProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customers: any[];
    loading: boolean;
}

type ColumnKey = "id" | "company" | "email" | "phone" | "status" | "groups" | "createdAt";
type RowDensity = "compact" | "comfortable" | "spacious";
type SelectionMode = "none" | "page" | "all";

interface ColumnDef {
    key: ColumnKey;
    label: string;
    defaultVisible: boolean;
    required?: boolean;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
    { key: "id", label: "#", defaultVisible: true },
    { key: "company", label: "Company", defaultVisible: true, required: true },
    { key: "email", label: "Email", defaultVisible: true },
    { key: "phone", label: "Phone", defaultVisible: true },
    { key: "status", label: "Active", defaultVisible: true },
    { key: "groups", label: "Groups", defaultVisible: true },
    { key: "createdAt", label: "Date Created", defaultVisible: true },
];

const ROW_DENSITY_STYLES: Record<RowDensity, string> = {
    compact: "py-1 text-xs",
    comfortable: "py-2 text-sm",
    spacious: "py-4 text-sm",
};

// Highlight text helper
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

// Quick Stats Bar
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function QuickStatsBar({ customers }: { customers: any[] }) {
    const activeCount = customers.filter((c) => c.status === "active").length;
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Total</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">{customers.length}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                    <Building2 className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Active</span>
                </div>
                <div className="text-2xl font-bold text-green-900">{activeCount}</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-yellow-600 mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Inactive</span>
                </div>
                <div className="text-2xl font-bold text-yellow-900">{customers.length - activeCount}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-purple-600 mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">With Groups</span>
                </div>
                <div className="text-2xl font-bold text-purple-900">
                    {customers.filter((c) => c.groups?.length > 0).length}
                </div>
            </div>
        </div>
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

// Selection Banner
function SelectionBanner({
    selectionMode,
    selectedCount,
    totalCount,
    onSelectAll,
    onClearSelection,
}: {
    selectionMode: SelectionMode;
    selectedCount: number;
    totalCount: number;
    onSelectAll: () => void;
    onClearSelection: () => void;
}) {
    if (selectionMode === "none" || selectedCount === 0) return null;
    return (
        <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-2 flex items-center justify-center gap-2 text-sm mb-2">
            <span className="text-blue-800">
                <strong>{selectedCount}</strong> selected.
            </span>
            {selectionMode === "page" && selectedCount < totalCount && (
                <button onClick={onSelectAll} className="text-blue-600 font-medium hover:underline">
                    Select all {totalCount}
                </button>
            )}
            <button onClick={onClearSelection} className="text-blue-600 font-medium hover:underline ml-2">
                Clear
            </button>
        </div>
    );
}

export function CustomersTable({ customers, loading }: CustomersTableProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
    const [selectionMode, setSelectionMode] = useState<SelectionMode>("none");
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage, setRecordsPerPage] = useState(25);
    const [columnVisibility, setColumnVisibility] = useState<Record<ColumnKey, boolean>>(() => {
        const v: Record<string, boolean> = {};
        DEFAULT_COLUMNS.forEach((col) => {
            v[col.key] = col.defaultVisible;
        });
        return v as Record<ColumnKey, boolean>;
    });
    const [rowDensity, setRowDensity] = useState<RowDensity>("comfortable");
    const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [showBulkDelete, setShowBulkDelete] = useState(false);
    const tableRef = useRef<HTMLDivElement>(null);

    const { updateCustomer, deleteCustomer } = useCustomers({ status: "all" });

    // Filter and paginate
    const filteredCustomers = useMemo(() => {
        return customers.filter(
            (customer) =>
                customer.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                customer.phone?.includes(searchQuery)
        );
    }, [customers, searchQuery]);

    const totalRecords = filteredCustomers.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + recordsPerPage, totalRecords);
    const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);
    const currentPageIds = paginatedCustomers.map((c) => c.id);
    const allFilteredIds = filteredCustomers.map((c) => c.id);

    const visibleColumns = DEFAULT_COLUMNS.filter((col) => columnVisibility[col.key]);
    const visibleColumnsCount = visibleColumns.length;

    // Handlers
    const handleStatusToggle = useCallback(
        async (id: string, currentStatus: string) => {
            await updateCustomer(id, { status: currentStatus === "active" ? "inactive" : "active" });
        },
        [updateCustomer]
    );

    const handleDelete = useCallback((id: string) => {
        setDeleteId(id);
    }, []);

    const handleConfirmDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteCustomer(deleteId);
            setDeleteId(null);
            toast.success("Customer deleted");
        } catch {
            toast.error("Failed to delete customer");
        }
    };

    const handleBulkDelete = useCallback(() => {
        if (selectedCustomers.length === 0) return;
        setShowBulkDelete(true);
    }, [selectedCustomers]);

    const handleConfirmBulkDelete = async () => {
        try {
            for (const id of selectedCustomers) await deleteCustomer(id);
            setSelectedCustomers([]);
            setSelectionMode("none");
            setShowBulkDelete(false);
            toast.success("Customers deleted");
        } catch {
            toast.error("Failed to delete some customers");
        }
    };

    const handleSelectAllOnPage = useCallback(() => {
        setSelectedCustomers(currentPageIds);
        setSelectionMode("page");
    }, [currentPageIds]);

    const handleSelectAllRecords = useCallback(() => {
        setSelectedCustomers(allFilteredIds);
        setSelectionMode("all");
    }, [allFilteredIds]);

    const handleClearSelection = useCallback(() => {
        setSelectedCustomers([]);
        setSelectionMode("none");
    }, []);

    const handleSelectCustomer = useCallback((customerId: string, checked: boolean) => {
        if (checked) setSelectedCustomers((prev) => [...prev, customerId]);
        else setSelectedCustomers((prev) => prev.filter((id) => id !== customerId));
    }, []);

    const isAllPageSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedCustomers.includes(id));
    const isSomeSelected = selectedCustomers.length > 0 && !isAllPageSelected;

    const toggleColumn = useCallback((key: ColumnKey) => {
        const col = DEFAULT_COLUMNS.find((c) => c.key === key);
        if (col?.required) return;
        setColumnVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const exportCustomers = useCallback(() => {
        const headers = ["ID", "Company", "Email", "Phone", "Status", "Groups", "Created"];
        const rows = filteredCustomers.map((c) => [
            c.id,
            c.company || "",
            c.email || "",
            c.phone || "",
            c.status || "",
            (c.groups || []).join(";"),
            c.createdAt?.toDate?.().toISOString() || "",
        ]);
        const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `customers_export_${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
    }, [filteredCustomers]);

    const formatDate = (timestamp: { toDate: () => Date } | null) => {
        if (!timestamp) return "-";
        try {
            return format(timestamp.toDate(), "dd/MM/yyyy");
        } catch {
            return "-";
        }
    };

    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLDivElement>) => {
            if (paginatedCustomers.length === 0) return;
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setFocusedRowIndex((prev) =>
                        prev === null ? 0 : Math.min(prev + 1, paginatedCustomers.length - 1)
                    );
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setFocusedRowIndex((prev) => (prev === null ? 0 : Math.max(prev - 1, 0)));
                    break;
                case " ":
                    e.preventDefault();
                    if (focusedRowIndex !== null) {
                        const c = paginatedCustomers[focusedRowIndex];
                        handleSelectCustomer(c.id, !selectedCustomers.includes(c.id));
                    }
                    break;
            }
        },
        [paginatedCustomers, focusedRowIndex, handleSelectCustomer, selectedCustomers]
    );

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentPage(1);
    }, [searchQuery]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="space-y-4">
                <QuickStatsBar customers={customers} />

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Show</span>
                        <Select
                            value={recordsPerPage.toString()}
                            onValueChange={(v) => {
                                setRecordsPerPage(parseInt(v));
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[70px] h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={exportCustomers}>
                            <Download className="mr-2 h-4 w-4" />
                            Export
                        </Button>
                        {selectedCustomers.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                                        <Badge className="mr-2 bg-blue-600">{selectedCustomers.length}</Badge>Bulk{" "}
                                        <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuLabel>With {selectedCustomers.length} selected</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-red-600" onClick={handleBulkDelete}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <Button variant="outline" size="icon" onClick={() => window.location.reload()}>
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon">
                                    <LayoutList className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Density</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuRadioGroup
                                    value={rowDensity}
                                    onValueChange={(v) => setRowDensity(v as RowDensity)}
                                >
                                    <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="spacious">Spacious</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon">
                                    <Columns className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>
                                    Columns ({visibleColumnsCount}/{DEFAULT_COLUMNS.length})
                                </DropdownMenuLabel>
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
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <SelectionBanner
                    selectionMode={selectionMode}
                    selectedCount={selectedCustomers.length}
                    totalCount={totalRecords}
                    onSelectAll={handleSelectAllRecords}
                    onClearSelection={handleClearSelection}
                />
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalRecords={totalRecords}
                    startRecord={totalRecords === 0 ? 0 : startIndex + 1}
                    endRecord={endIndex}
                />

                {/* Table */}
                <div
                    ref={tableRef}
                    tabIndex={0}
                    onKeyDown={handleKeyDown}
                    className="rounded-md border bg-white overflow-x-auto focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                <TableHead className="w-[40px]">
                                    <Checkbox
                                        checked={isAllPageSelected}
                                        ref={(el) => {
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            if (el) (el as any).indeterminate = isSomeSelected;
                                        }}
                                        onCheckedChange={(c) => (c ? handleSelectAllOnPage() : handleClearSelection())}
                                    />
                                </TableHead>
                                {columnVisibility.id && <TableHead className="w-[60px]">#</TableHead>}
                                {columnVisibility.company && (
                                    <TableHead className="font-semibold text-gray-900">Company</TableHead>
                                )}
                                {columnVisibility.email && <TableHead>Email</TableHead>}
                                {columnVisibility.phone && <TableHead>Phone</TableHead>}
                                {columnVisibility.status && <TableHead>Active</TableHead>}
                                {columnVisibility.groups && <TableHead>Groups</TableHead>}
                                {columnVisibility.createdAt && <TableHead>Date Created</TableHead>}
                                <TableHead className="w-24 text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedCustomers.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={visibleColumnsCount + 2}
                                        className="text-center py-10 text-muted-foreground"
                                    >
                                        {searchQuery ? "No customers match your search." : "No customers found."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedCustomers.map((customer, index) => (
                                    <TableRow
                                        key={customer.id}
                                        className={`group hover:bg-gray-50 ${selectedCustomers.includes(customer.id) ? "bg-blue-50/50" : ""} ${focusedRowIndex === index ? "ring-2 ring-inset ring-blue-500" : ""} ${ROW_DENSITY_STYLES[rowDensity]}`}
                                    >
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedCustomers.includes(customer.id)}
                                                onCheckedChange={(c) => handleSelectCustomer(customer.id, !!c)}
                                            />
                                        </TableCell>
                                        {columnVisibility.id && (
                                            <TableCell className="text-gray-500">{startIndex + index + 1}</TableCell>
                                        )}
                                        {columnVisibility.company && (
                                            <TableCell className="min-w-[200px] font-medium">
                                                <Link
                                                    href={`/dashboard/customers/${customer.id}`}
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    <HighlightText
                                                        text={customer.company || "-"}
                                                        search={searchQuery}
                                                    />
                                                </Link>
                                            </TableCell>
                                        )}
                                        {columnVisibility.email && (
                                            <TableCell>
                                                {customer.email ? (
                                                    <a
                                                        href={`mailto:${customer.email}`}
                                                        className="flex items-center gap-1 text-blue-600 hover:underline"
                                                    >
                                                        <Mail className="h-3 w-3" />
                                                        <HighlightText text={customer.email} search={searchQuery} />
                                                    </a>
                                                ) : (
                                                    "-"
                                                )}
                                            </TableCell>
                                        )}
                                        {columnVisibility.phone && (
                                            <TableCell>
                                                {customer.phone ? (
                                                    <a
                                                        href={`tel:${customer.phone}`}
                                                        className="flex items-center gap-1 text-green-600 hover:underline"
                                                    >
                                                        <Phone className="h-3 w-3" />
                                                        <HighlightText text={customer.phone} search={searchQuery} />
                                                    </a>
                                                ) : (
                                                    "-"
                                                )}
                                            </TableCell>
                                        )}
                                        {columnVisibility.status && (
                                            <TableCell>
                                                <Switch
                                                    checked={customer.status === "active"}
                                                    onCheckedChange={() =>
                                                        handleStatusToggle(customer.id, customer.status)
                                                    }
                                                />
                                            </TableCell>
                                        )}
                                        {columnVisibility.groups && (
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {customer.groups?.slice(0, 2).map((groupValue: string) => {
                                                        const groupLabel =
                                                            CUSTOMER_GROUPS.find((g) => g.value === groupValue)
                                                                ?.label || groupValue;
                                                        return (
                                                            <Badge
                                                                key={groupValue}
                                                                variant="secondary"
                                                                className="text-xs"
                                                            >
                                                                {groupLabel}
                                                            </Badge>
                                                        );
                                                    })}
                                                    {customer.groups?.length > 2 && (
                                                        <Badge variant="outline" className="text-xs">
                                                            +{customer.groups.length - 2}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                        )}
                                        {columnVisibility.createdAt && (
                                            <TableCell className="text-gray-500 text-xs">
                                                {formatDate(customer.createdAt)}
                                            </TableCell>
                                        )}
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Link href={`/dashboard/customers/${customer.id}`}>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                                                <ExternalLink className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </Link>
                                                    </TooltipTrigger>
                                                    <TooltipContent>View</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Link href={`/dashboard/customers/${customer.id}/settings`}>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </Link>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Edit</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                            onClick={() => handleDelete(customer.id)}
                                                        >
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

                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 font-medium">Total: {totalRecords}</div>
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
                <div className="text-xs text-gray-400 text-center">↑↓ Navigate • Space Select • Click to view</div>
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this customer?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the customer and all associated
                            data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selectedCustomers.length} customers?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. Selected customers will be permanently deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmBulkDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </TooltipProvider>
    );
}
