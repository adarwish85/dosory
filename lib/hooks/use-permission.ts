"use client";

import { useUserProfile } from "@/components/hooks/use-user-profile";
import { can } from "@/lib/rbac/access";

/**
 * Hook to check permissions in React components.
 * @example
 * const { can } = usePermission();
 * if (can("finance.invoice.create")) { ... }
 */
export function usePermission() {
    const { profile, loading } = useUserProfile();

    const checkPermission = (permissionCode: string, resourceOwnerId?: string) => {
        if (loading || !profile) return false;
        return can(profile, permissionCode, resourceOwnerId);
    };

    return {
        can: checkPermission,
        loading,
        role: profile?.role,
    };
}
