"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, Trash2, Loader2, ShieldCheck, Users, LayoutGrid, Table } from "lucide-react";
import { RoleForm } from "@/components/dashboard/setup/roles/role-form";
import { PermissionMatrix } from "@/components/dashboard/setup/roles/permission-matrix";
import { MigrateUsersDialog } from "@/components/dashboard/setup/roles/migrate-users-dialog";
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
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export default function RolesPage() {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"cards" | "matrix">("cards");
    const { roles, loading, deleteRole } = useRoles();
    const { staff } = useStaff();

    const filteredRoles = roles.filter((role) => role.name?.toLowerCase().includes(searchQuery.toLowerCase()));

    const getUserCount = (roleId: string) => {
        return staff.filter((s) => s.roleId === roleId).length;
    };

    const getPermissionSummary = (permissions: string[] = []) => {
        if (permissions.length === 0) return t("setup.rolesConfig.noPermissions");
        if (permissions.length <= 3) {
            return permissions.map((p) => p.split("-")[0]).join(", ");
        }
        return t("setup.rolesConfig.permissionsCount", { count: permissions.length });
    };

    const handleDelete = async (roleId: string, roleName: string) => {
        const userCount = getUserCount(roleId);
        if (userCount > 0) {
            toast.error(t("setup.rolesConfig.cannotDeleteAssigned", { name: roleName, count: userCount }));
            return;
        }

        try {
            await deleteRole(roleId);
            toast.success(t("setup.rolesConfig.roleDeleted", { name: roleName }));
        } catch (error) {
            console.error("Error deleting role:", error);
            toast.error(t("setup.rolesConfig.deleteFailed"));
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
                    <h1 className="text-2xl font-semibold text-gray-900">{t("setup.rolesConfig.title")}</h1>
                </div>
                <div className="flex items-center gap-3">
                    <MigrateUsersDialog />
                    <RoleForm />
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg border">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode("cards")}
                        className={cn(
                            "h-8 px-3 gap-2",
                            viewMode === "cards"
                                ? "bg-white shadow-sm text-gray-900 hover:bg-white"
                                : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <LayoutGrid className="h-4 w-4" />
                        {t("setup.rolesConfig.cards")}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode("matrix")}
                        className={cn(
                            "h-8 px-3 gap-2",
                            viewMode === "matrix"
                                ? "bg-white shadow-sm text-gray-900 hover:bg-white"
                                : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <Table className="h-4 w-4" />
                        {t("setup.rolesConfig.matrix")}
                    </Button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => window.location.reload()}
                        title={t("setup.rolesConfig.refresh")}
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder={t("setup.rolesConfig.searchRoles")}
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Content View */}
            {viewMode === "matrix" ? (
                <PermissionMatrix />
            ) : filteredRoles.length === 0 ? (
                <div className="bg-white rounded-lg border p-10 text-center">
                    <ShieldCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {searchQuery ? t("setup.rolesConfig.noRolesMatch") : t("setup.rolesConfig.noRolesYet")}
                    </h3>
                    <p className="text-gray-500 mb-4">
                        {searchQuery
                            ? t("setup.rolesConfig.tryDifferentSearch")
                            : t("setup.rolesConfig.createFirstRole")}
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
                                                        Are you sure you want to delete &quot;{role.name}&quot;?
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
