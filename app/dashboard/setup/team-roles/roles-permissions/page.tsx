"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, Trash2, Loader2, ShieldCheck, Users } from "lucide-react";
import { RoleForm } from "@/components/dashboard/setup/roles/role-form";
import { useRoles, useStaff } from "@/lib/hooks";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function RolesPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const { roles, loading, deleteRole } = useRoles();
    const { staff } = useStaff();

    const filteredRoles = roles.filter((role) => role.name?.toLowerCase().includes(searchQuery.toLowerCase()));

    const getUserCount = (roleId: string) => {
        return staff.filter((s) => s.roleId === roleId).length;
    };

    const getPermissionSummary = (permissions: string[] = []) => {
        if (permissions.length === 0) return "No permissions";
        if (permissions.length <= 3) {
            return permissions.map((p) => p.split("-")[0]).join(", ");
        }
        return `${permissions.length} permissions`;
    };

    const handleDelete = async (roleId: string, roleName: string) => {
        const userCount = getUserCount(roleId);
        if (userCount > 0) {
            toast.error(`Cannot delete "${roleName}" - it has ${userCount} user(s) assigned.`);
            return;
        }

        try {
            await deleteRole(roleId);
            toast.success(`Role "${roleName}" deleted.`);
        } catch (error) {
            console.error("Error deleting role:", error);
            toast.error("Failed to delete role.");
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
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ShieldCheck className="h-6 w-6 text-gray-600" />
                    <h1 className="text-2xl font-semibold text-gray-900">Roles & Permissions</h1>
                </div>
                <RoleForm />
            </div>

            {/* Toolbar */}
            <div className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => window.location.reload()}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search roles..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Role Cards */}
            {filteredRoles.length === 0 ? (
                <div className="bg-white rounded-lg border p-10 text-center">
                    <ShieldCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {searchQuery ? "No roles match your search" : "No roles yet"}
                    </h3>
                    <p className="text-gray-500 mb-4">
                        {searchQuery
                            ? "Try a different search term."
                            : "Create your first role to manage staff permissions."}
                    </p>
                    {!searchQuery && <RoleForm />}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredRoles.map((role) => {
                        const userCount = getUserCount(role.id);
                        return (
                            <div
                                key={role.id}
                                className="bg-white rounded-lg border p-5 hover:shadow-md transition-shadow"
                            >
                                {/* Role Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 text-lg">{role.name}</h3>
                                        {role.description && (
                                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                                {role.description}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <RoleForm role={role} />
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <button className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Role</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to delete "{role.name}"?
                                                        {userCount > 0 && (
                                                            <span className="block mt-2 text-red-600 font-medium">
                                                                ⚠️ This role has {userCount} user(s) assigned.
                                                            </span>
                                                        )}
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleDelete(role.id, role.name)}
                                                        className="bg-red-600 hover:bg-red-700"
                                                    >
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-1.5 text-gray-600">
                                        <Users className="h-4 w-4" />
                                        <span>
                                            {userCount} user{userCount !== 1 ? "s" : ""}
                                        </span>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                        {getPermissionSummary(role.permissions)}
                                    </Badge>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
