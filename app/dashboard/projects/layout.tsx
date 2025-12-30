"use client";

import { PermissionGuard } from "@/components/permission-guard";

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
    return <PermissionGuard module="projects">{children}</PermissionGuard>;
}
