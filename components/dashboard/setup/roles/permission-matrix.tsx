"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useRoles } from "@/lib/hooks";
import { PERMISSION_MODULES } from "@/lib/rbac/definitions";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface PermissionMatrixProps {
    onSaveSuccess?: () => void;
}

export function PermissionMatrix({ onSaveSuccess }: PermissionMatrixProps) {
    const { roles, loading: rolesLoading, updateRole } = useRoles();
    const [localRoles, setLocalRoles] = useState<Role[]>([]);
    const [saving, setSaving] = useState(false);
    const [modifiedRoleIds, setModifiedRoleIds] = useState<Set<string>>(new Set());

    // Sync local state with fetched roles efficiently
    useEffect(() => {
        if (!rolesLoading && roles.length > 0) {
            // Only update if we haven't modified anything yet, or strictly for initialization
            if (modifiedRoleIds.size === 0) {
                setLocalRoles(JSON.parse(JSON.stringify(roles)));
            }
        }
    }, [roles, rolesLoading, modifiedRoleIds.size]);

    const handlePermissionToggle = (roleId: string, permId: string) => {
        setLocalRoles((prevRoles) =>
            prevRoles.map((role) => {
                if (role.id !== roleId) return role;

                const currentPerms = role.permissions || [];
                const hasPerm = currentPerms.includes(permId);
                const newPerms = hasPerm
                    ? currentPerms.filter((p) => p !== permId)
                    : [...currentPerms, permId];

                // Mark role as modified
                setModifiedRoleIds((prev) => new Set(prev).add(roleId));

                return { ...role, permissions: newPerms };
            })
        );
    };

    const handleToggleRow = (permId: string, shouldSelect: boolean) => {
        setLocalRoles((prevRoles) =>
            prevRoles.map((role) => {
                // If checking, add if missing. If unchecking, remove if present.
                const currentPerms = role.permissions || [];
                const hasPerm = currentPerms.includes(permId);

                if (shouldSelect && !hasPerm) {
                    setModifiedRoleIds((prev) => new Set(prev).add(role.id));
                    return { ...role, permissions: [...currentPerms, permId] };
                }
                if (!shouldSelect && hasPerm) {
                    setModifiedRoleIds((prev) => new Set(prev).add(role.id));
                    return { ...role, permissions: currentPerms.filter((p) => p !== permId) };
                }
                return role;
            })
        );
    };

    const handleToggleColumn = (roleId: string, shouldSelect: boolean) => {
        const allPermissionIds = PERMISSION_MODULES.flatMap((m) =>
            m.actions.map((a) => `${m.id}-${a.id}`)
        );

        setLocalRoles((prevRoles) =>
            prevRoles.map((role) => {
                if (role.id !== roleId) return role;

                setModifiedRoleIds((prev) => new Set(prev).add(roleId));
                return {
                    ...role,
                    permissions: shouldSelect ? [...allPermissionIds] : [],
                };
            })
        );
    };

    const handleSave = async () => {
        if (modifiedRoleIds.size === 0) {
            toast.info("No changes to save.");
            return;
        }

        setSaving(true);
        try {
            // Filter roles that have been modified
            const rolesToUpdate = localRoles.filter((r) => modifiedRoleIds.has(r.id));

            // Execute all updates in parallel
            await Promise.all(
                rolesToUpdate.map((role) =>
                    updateRole(role.id, { permissions: role.permissions })
                )
            );

            toast.success(`Updated ${rolesToUpdate.length} roles successfully.`);
            setModifiedRoleIds(new Set());
            onSaveSuccess?.();
            // Re-sync happens via useEffect when parent refetches, but we clear modified flag
        } catch (error) {
            console.error("Failed to save matrix", error);
            toast.error("Failed to save permission changes.");
        } finally {
            setSaving(false);
        }
    };

    if (rolesLoading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    // Flatten logic for easy rendering
    const allActions = PERMISSION_MODULES.flatMap((module) =>
        module.actions.map((action) => ({
            ...action,
            moduleId: module.id,
            moduleLabel: module.label,
            permId: `${module.id}-${action.id}`,
        }))
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <div className="text-sm text-yellow-800">
                    <span className="font-semibold">⚠️ Caution:</span> You are editing permissions for multiple roles directly. Changes are not saved until you click the button below.
                </div>
                <Button onClick={handleSave} disabled={modifiedRoleIds.size === 0 || saving} className="gap-2">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Save className="h-4 w-4" />
                    Save Changes ({modifiedRoleIds.size})
                </Button>
            </div>

            <div className="rounded-lg border overflow-hidden bg-white shadow-sm overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-700 font-semibold">
                        <tr>
                            <th className="p-3 border-b min-w-[250px] sticky left-0 bg-gray-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                Permission
                            </th>
                            {localRoles.map((role) => (
                                <th key={role.id} className="p-3 border-b border-l text-center min-w-[120px]">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="truncate max-w-[100px]" title={role.name}>{role.name}</span>
                                        <div className="flex items-center gap-1">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Checkbox
                                                            checked={role.permissions?.length === allActions.length}
                                                            onCheckedChange={(c) => handleToggleColumn(role.id, !!c)}
                                                            className="h-3.5 w-3.5"
                                                        />
                                                    </TooltipTrigger>
                                                    <TooltipContent>Select/Deselect All for Role</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {PERMISSION_MODULES.map((module) => (
                            <>
                                {/* Module Header Row */}
                                <tr key={module.id} className="bg-gray-100">
                                    <td className="p-2 pl-3 font-semibold text-gray-800 sticky left-0 bg-gray-100 z-10 border-y shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        {module.label}
                                    </td>
                                    {localRoles.map((role) => (
                                        <td key={role.id} className="p-2 border-y border-l bg-gray-100"></td>
                                    ))}
                                </tr>

                                {/* Permission Rows */}
                                {module.actions.map((action) => {
                                    const permId = `${module.id}-${action.id}`;
                                    // Check if ALL roles have this permission
                                    const allRolesHave = localRoles.every(r => (r.permissions || []).includes(permId));
                                    // Check if SOME roles have this permission
                                    const someRolesHave = localRoles.some(r => (r.permissions || []).includes(permId));

                                    return (
                                        <tr key={permId} className="hover:bg-gray-50 transition-colors group">
                                            <td className="p-3 border-b sticky left-0 bg-white group-hover:bg-gray-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-600">{action.label}</span>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Checkbox
                                                                    checked={allRolesHave}
                                                                    // Indeterminate logic usually requires ref, but Shadcn Checkbox supports 'indeterminate' string if configured, 
                                                                    // or we simulate. Shadcn Checkbox assumes boolean | 'indeterminate'. 
                                                                    // Let's just use checked for allRolesHave, and if not checked but someRolesHave, user can click to select all.
                                                                    onCheckedChange={(c) => handleToggleRow(permId, !!c)}
                                                                    className={cn("h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity", (allRolesHave || someRolesHave) && "opacity-100")}
                                                                />
                                                            </TooltipTrigger>
                                                            <TooltipContent>Select/Deselect All Roles</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </td>
                                            {localRoles.map((role) => {
                                                const isChecked = (role.permissions || []).includes(permId);
                                                return (
                                                    <td key={role.id} className="p-3 border-b border-l text-center relative">
                                                        <div className="flex justify-center">
                                                            <Checkbox
                                                                checked={isChecked}
                                                                onCheckedChange={() => handlePermissionToggle(role.id, permId)}
                                                            />
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
