"use client";

import { PermissionGuard } from "@/components/permission-guard";

export default function InvoicesLayout({ children }: { children: React.ReactNode }) {
    return <PermissionGuard module="invoices">{children}</PermissionGuard>;
}
