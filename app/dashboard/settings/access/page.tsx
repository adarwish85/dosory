"use client";

import { RoleManager } from "@/components/settings/rbac/RoleManager";

export default function AccessControlPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Access Control (RBAC)</h2>
                <p className="text-muted-foreground">Manage roles and permissions for your organization members.</p>
            </div>

            <RoleManager />
        </div>
    );
}
