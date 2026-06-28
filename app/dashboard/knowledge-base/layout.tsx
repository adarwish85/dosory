"use client";

import { PermissionGuard } from "@/components/permission-guard";

export default function KnowledgeBaseLayout({ children }: { children: React.ReactNode }) {
    return <PermissionGuard module="knowledge">{children}</PermissionGuard>;
}

