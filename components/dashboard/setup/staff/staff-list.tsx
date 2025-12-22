"use client";

import { useState } from "react";
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
    const [bulkActionLoading, setBulkActionLoading] = useState(false);
    const { staff, loading, updateStaff, deleteStaff } = useStaff();
    const { roles } = useRoles();

    const filteredStaff = staff.filter(s =>
        s.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getRoleName = (roleId: string) => {
        const role = roles.find(r => r.id === roleId);
        return role?.name || "-";
    };

    const formatLastLogin = (timestamp: { toDate: () => Date } | null | undefined) => {
        if (!timestamp) return "Never";
        try {
            return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
        } catch {
            return "Never";
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
            setSelectedIds(new Set(filteredStaff.map(s => s.id)));
        }
    };

    const handleBulkActivate = async () => {
        setBulkActionLoading(true);
        try {
            await Promise.all(
                Array.from(selectedIds).map(id => updateStaff(id, { status: "active" }))
            );
            toast.success(`${selectedIds.size} staff members activated`);
            setSelectedIds(new Set());
        } catch (error) {
            toast.error("Failed to activate some staff members");
        } finally {
            setBulkActionLoading(false);
        }
    };

    const handleBulkDeactivate = async () => {
        setBulkActionLoading(true);
        try {
            await Promise.all(
                Array.from(selectedIds).map(id => updateStaff(id, { status: "inactive" }))
            );
            toast.success(`${selectedIds.size} staff members deactivated`);
            setSelectedIds(new Set());
        } catch (error) {
            toast.error("Failed to deactivate some staff members");
        } finally {
            setBulkActionLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        setBulkActionLoading(true);
        try {
            await Promise.all(
                Array.from(selectedIds).map(id => deleteStaff(id))
            );
            toast.success(`${selectedIds.size} staff members deleted`);
            setSelectedIds(new Set());
        } catch (error) {
            toast.error("Failed to delete some staff members");
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
            <div className="flex items-center gap-2">
                <AddStaffDialog />

                {selectedIds.size > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" disabled={bulkActionLoading}>
                                {bulkActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Bulk Actions ({selectedIds.size})
                                <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={handleBulkActivate}>
                                <UserCheck className="mr-2 h-4 w-4 text-green-600" />
                                Activate Selected
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleBulkDeactivate}>
                                <UserX className="mr-2 h-4 w-4 text-orange-600" />
                                Deactivate Selected
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setDeleteDialogOpen(true)}
                                className="text-red-600"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Selected
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Select defaultValue="25">
                            <SelectTrigger className="w-[70px]">
                                <SelectValue placeholder="25" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline">Export</Button>
                        <Button variant="outline" size="icon"><RefreshCw className="h-4 w-4" /></Button>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="border rounded-md bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={filteredStaff.length > 0 && selectedIds.size === filteredStaff.length}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </TableHead>
                                <TableHead className="font-bold text-gray-900">Full Name</TableHead>
                                <TableHead className="font-bold text-gray-900">Email</TableHead>
                                <TableHead className="font-bold text-gray-900">Role</TableHead>
                                <TableHead className="font-bold text-gray-900">Last Login</TableHead>
                                <TableHead className="font-bold text-gray-900">Active</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStaff.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                        {searchQuery ? "No staff match your search." : "No staff members found."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredStaff.map((member) => (
                                    <TableRow key={member.id} className="group">
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.has(member.id)}
                                                onCheckedChange={() => toggleSelection(member.id)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={member.profileImageUrl} />
                                                    <AvatarFallback className="bg-gray-200 text-gray-600">
                                                        {member.firstName?.charAt(0) || "?"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <Link href={`/dashboard/setup/staff/${encodeURIComponent(member.id)}`} className="font-semibold text-gray-900 hover:text-blue-600">
                                                        {member.firstName} {member.lastName}
                                                    </Link>
                                                    {member.isAdmin && (
                                                        <Badge className="bg-purple-100 text-purple-600 border-0 w-fit text-xs">Admin</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-700">{member.email}</TableCell>
                                        <TableCell className="text-gray-700">{getRoleName(member.roleId)}</TableCell>
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
            </div>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selectedIds.size} staff member(s)?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. The selected staff members will be permanently removed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {bulkActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
