"use client";

import { PermissionGuard } from "@/components/permission-guard";

export default function SalesLayout({ children }: { children: React.ReactNode }) {
    // Sales module uses 'invoices' permission group
    return (
        <PermissionGuard module="invoices">
            {children}
        </PermissionGuard>
    );
}
