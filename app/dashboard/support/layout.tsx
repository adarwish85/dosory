"use client";

import { PermissionGuard } from "@/components/permission-guard";

export default function SupportLayout({ children }: { children: React.ReactNode }) {
    return (
        <PermissionGuard module="support">
            {children}
        </PermissionGuard>
    );
}
