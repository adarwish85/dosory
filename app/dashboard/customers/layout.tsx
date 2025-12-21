"use client";

import { PermissionGuard } from "@/components/permission-guard";

export default function CustomersLayout({ children }: { children: React.ReactNode }) {
    return (
        <PermissionGuard module="customers">
            {children}
        </PermissionGuard>
    );
}
