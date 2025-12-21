"use client";

import { PermissionGuard } from "@/components/permission-guard";

export default function SetupLayout({ children }: { children: React.ReactNode }) {
    return (
        <PermissionGuard module="settings">
            {children}
        </PermissionGuard>
    );
}
