"use client";

import { PermissionGuard } from "@/components/permission-guard";

export default function UtilitiesLayout({ children }: { children: React.ReactNode }) {
    return (
        <PermissionGuard module="admin" requireAdmin>
            {children}
        </PermissionGuard>
    );
}
