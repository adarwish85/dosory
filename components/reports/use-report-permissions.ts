"use client";

import { useUserProfile } from "@/components/hooks/use-user-profile";

export interface ReportPermissions {
    canViewSales: boolean;
    canViewMarketing: boolean;
    canViewOperations: boolean;
    canViewHR: boolean;
    canViewAccounting: boolean;
    canExport: boolean;
}

export function useReportPermissions(): ReportPermissions & { loading: boolean } {
    const { profile, loading } = useUserProfile();

    // TODO: Implement real granular permission check against profile.permissions or role
    // For now, if user is admin or owner, give all access.
    // If we have a custom role, we should check distinct permissions.

    const isAdmin = profile?.role === "admin";

    return {
        loading,
        canViewSales: isAdmin, // || hasPermission("reports.sales.view")
        canViewMarketing: isAdmin,
        canViewOperations: isAdmin,
        canViewHR: isAdmin,
        canViewAccounting: isAdmin,
        canExport: isAdmin, // || hasPermission("reports.export")
    };
}
