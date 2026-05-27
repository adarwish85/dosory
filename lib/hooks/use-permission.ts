"use client";

import { usePermissions, hasPermission } from "./use-permissions";

/**
 * Hook to check permissions in React components.
 * Thin wrapper over usePermissions() that exposes a can() helper.
 *
 * Permission strings use the flat underscore format (e.g. "invoices_create",
 * "leads_edit", "tickets_close") — matching lib/types.ts Permission union and
 * the values stored on the staff document.
 *
 * @example
 *   const { can } = usePermission();
 *   if (can("invoices_create")) { ... }
 */
export function usePermission() {
    const { permissions, isAdmin, roleId, loading } = usePermissions();

    const can = (permissionCode: string) => {
        if (loading) return false;
        return hasPermission(permissions, isAdmin, permissionCode);
    };

    return {
        can,
        loading,
        role: roleId,
    };
}
