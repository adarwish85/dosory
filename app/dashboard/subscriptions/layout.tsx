"use client";

import { PermissionGuard } from "@/components/permission-guard";

export default function SubscriptionsLayout({ children }: { children: React.ReactNode }) {
    return (
        <PermissionGuard module="admin" requireAdmin>
            {children}
        </PermissionGuard>
    );
}
