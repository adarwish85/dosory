"use client";

import { PermissionGuard } from "@/components/permission-guard";

export default function ContractsLayout({ children }: { children: React.ReactNode }) {
    return <PermissionGuard module="contracts">{children}</PermissionGuard>;
}
