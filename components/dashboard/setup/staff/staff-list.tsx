"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, Loader2, Trash2, UserCheck, UserX, ChevronDown } from "lucide-react";
import { AddStaffDialog } from "@/components/dashboard/setup/staff/add-staff-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useStaff, useRoles } from "@/lib/hooks";
import { useTranslation } from "@/lib/i18n";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export function StaffList() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);
    const { staff, loading, updateStaff, deleteStaff } = useStaff();
    const { roles } = useRoles();
    const { t } = useTranslation();

    // Deduplicate staff by email to handle potential duplicate records
    const uniqueStaff = useMemo(() => {
        const seen = new Set();
        return staff.filter((s) => {
            if (!s.email) return true; // Keep entries without email
            const email = s.email.toLowerCase();
            if (seen.has(email)) return false;
            seen.add(email);
            return true;
        });
    }, [staff]);

    const filteredStaff = uniqueStaff.filter(
        (s) =>
            s.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getRoleName = (roleId: string) => {
        const role = roles.find((r) => r.id === roleId);
        return role?.name || "-";
    };

    const formatLastLogin = (timestamp: { toDate: () => Date } | null | undefined) => {
        if (!timestamp) return t("setup.staff.never");
        try {
            return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
        } catch {
            return t("setup.staff.never");
        }
    };

    const handleStatusToggle = async (staffId: string, isActive: boolean) => {
        await updateStaff(staffId, { status: isActive ? "active" : "inactive" });
    };

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredStaff.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredStaff.map((s) => s.id)));
        }
    };

    const handleBulkActivate = async () => {
        setBulkActionLoading(true);
        try {
            await Promise.all(Array.from(selectedIds).map((id) => updateStaff(id, { status: "active" })));
            toast.success(t("setup.staff.toast.bulkActivated", { count: selectedIds.size }));
            setSelectedIds(new Set());
        } catch {
            toast.error(t("setup.staff.toast.bulkActivateFailed"));
        } finally {
            setBulkActionLoading(false);
        }
    };

    const handleBulkDeactivate = async () => {
        setBulkActionLoading(true);
        try {
            await Promise.all(Array.from(selectedIds).map((id) => updateStaff(id, { status: "inactive" })));
            toast.success(t("setup.staff.toast.bulkDeactivated", { count: selectedIds.size }));
            setSelectedIds(new Set());
        } catch {
            toast.error(t("setup.staff.toast.bulkDeactivateFailed"));
        } finally {
            setBulkActionLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        setBulkActionLoading(true);
        try {
            await Promise.all(Array.from(selectedIds).map((id) => deleteStaff(id)));
            toast.success(t("setup.staff.toast.bulkDeleted", { count: selectedIds.size }));
            setSelectedIds(new Set());
        } catch {
            toast.error(t("setup.staff.toast.bulkDeleteFailed"));
        } finally {
            setBulkActionLoading(false);
            setDeleteDialogOpen(false);
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
            {/* Header Actions Row - Mirrored from Leads Module UI */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <AddStaffDialog />

                    {selectedIds.size > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    disabled={bulkActionLoading}
                                    className="border-blue-200 bg-blue-50 text-blue-700"
                                >
                                    {bulkActionLoading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Badge className="mr-2 bg-blue-600">{selectedIds.size}</Badge>
                                    )}
                                    {t("setup.staff.bulkActions")}
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={handleBulkActivate}>
                                    <UserCheck className="mr-2 h-4 w-4 text-green-600" />
                                    {t("setup.staff.activateSelected")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleBulkDeactivate}>
                                    <UserX className="mr-2 h-4 w-4 text-orange-600" />
                                    {t("setup.staff.deactivateSelected")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-red-600">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t("setup.staff.deleteSelected")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-1 w-full max-w-md mx-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder={t("setup.staff.searchPlaceholder")}
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Select defaultValue="25">
                        <SelectTrigger className="w-[70px]">
                            <SelectValue placeholder="25" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline">{t("common.export")}</Button>
                    <Button variant="outline" size="icon">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="border rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-100 hover:bg-gray-100 border-b border-gray-200">
                            <TableHead className="w-12">
                                <Checkbox
                                    checked={filteredStaff.length > 0 && selectedIds.size === filteredStaff.length}
                                    onCheckedChange={toggleSelectAll}
                                />
                            </TableHead>
                            <TableHead className="font-bold text-gray-900">{t("setup.staff.table.fullName")}</TableHead>
                            <TableHead className="font-bold text-gray-900">{t("common.email")}</TableHead>
                            <TableHead className="font-bold text-gray-900">{t("setup.staff.table.role")}</TableHead>
                            <TableHead className="font-bold text-gray-900">{t("setup.staff.table.lastLogin")}</TableHead>
                            <TableHead className="font-bold text-gray-900">{t("setup.staff.table.active")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredStaff.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                    {searchQuery ? t("setup.staff.noMatch") : t("setup.staff.empty")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredStaff.map((member) => (
                                <TableRow key={member.id} className="group hover:bg-gray-50 transition-colors">
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedIds.has(member.id)}
                                            onCheckedChange={() => toggleSelection(member.id)}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={member.image || member.photoURL} />
                                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                                    {member.firstName?.charAt(0) || "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col gap-0.5">
                                                <Link
                                                    href={`/dashboard/setup/team-roles/staff/${encodeURIComponent(member.id)}`}
                                                    className="font-semibold text-gray-900 hover:text-blue-600 block line-clamp-1"
                                                >
                                                    {member.firstName} {member.lastName}
                                                </Link>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity h-4">
                                                    <Link
                                                        href={`/dashboard/setup/team-roles/staff/${encodeURIComponent(member.id)}`}
                                                        className="hover:text-blue-600 hover:underline px-0.5"
                                                    >
                                                        {t("common.view")}
                                                    </Link>
                                                    <span className="text-gray-300">|</span>
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            setSingleDeleteId(member.id);
                                                        }}
                                                        className="hover:text-red-600 hover:underline px-0.5"
                                                    >
                                                        {t("common.delete")}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-700">{member.email}</TableCell>
                                    <TableCell className="text-gray-700">
                                        {member.isAdmin ? (
                                            <Badge className="bg-purple-100 text-purple-700 border-0 hover:bg-purple-200">
                                                {t("setup.staff.administrator")}
                                            </Badge>
                                        ) : (
                                            getRoleName(member.roleId)
                                        )}
                                    </TableCell>
                                    <TableCell className="text-gray-500">{formatLastLogin(member.lastLogin)}</TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={member.status === "active"}
                                            onCheckedChange={(checked) => handleStatusToggle(member.id, checked)}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("setup.staff.bulkDeleteTitle", { count: selectedIds.size })}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("setup.staff.bulkDeleteDescription")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
                            {bulkActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("common.delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!singleDeleteId} onOpenChange={(open) => !open && setSingleDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("setup.staff.deleteTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("setup.staff.deleteDescription")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                if (singleDeleteId) {
                                    await deleteStaff(singleDeleteId);
                                    setSingleDeleteId(null);
                                    toast.success(t("setup.staff.toast.deleted"));
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {t("common.delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
