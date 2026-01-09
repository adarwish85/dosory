"use client";

import { PermissionGuard } from "@/components/permission-guard";

export default function TasksLayout({ children }: { children: React.ReactNode }) {
    return <PermissionGuard module="tasks">{children}</PermissionGuard>;
}
