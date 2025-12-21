"use client";

import { PermissionGuard } from "@/components/permission-guard";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
    return (
        <PermissionGuard module="reports">
            {children}
        </PermissionGuard>
    );
}
