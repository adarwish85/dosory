"use client";

import { usePermissions, hasPermission } from "./use-permissions";
import type { Permission } from "@/lib/rbac/definitions";

/**
 * Hook to check permissions in React components.
 * Thin wrapper over usePermissions() that exposes a can() helper.
 *
 * Permission codes are the dash-format strings derived from PERMISSION_MODULES
 * (e.g. "invoices-create", "leads-view-own", "tickets-reply"). These match what
 * role-form.tsx persists to staff.permissions and what hasPermission() checks.
 *
 * @example
 *   const { can } = usePermission();
 *   if (can("invoices-create")) { ... }
 */
export function usePermission() {
    const { permissions, isAdmin, roleId, loading } = usePermissions();

    const can = (permissionCode: Permission) => {
        if (loading) return false;
        return hasPermission(permissions, isAdmin, permissionCode);
    };

    return {
        can,
        loading,
        role: roleId,
    };
}
