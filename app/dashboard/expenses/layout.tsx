"use client";

import { PermissionGuard } from "@/components/permission-guard";

export default function ExpensesLayout({ children }: { children: React.ReactNode }) {
    return <PermissionGuard module="expenses">{children}</PermissionGuard>;
}
