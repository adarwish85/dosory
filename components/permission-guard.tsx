"use client";

import { usePermissions, canAccessModule } from "@/lib/hooks/use-permissions";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PermissionGuardProps {
    module: string; // e.g., 'customers', 'invoices'
    children: React.ReactNode;
    requireAdmin?: boolean; // if true, forces isAdmin check
}

export function PermissionGuard({ module, children, requireAdmin = false }: PermissionGuardProps) {
    const { permissions, isAdmin, loading } = usePermissions();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    // Superadmin/Admin override
    if (isAdmin) {
        return <>{children}</>;
    }

    // If requireAdmin is true and user is not admin (checked above), deny
    if (requireAdmin) {
        return <AccessDenied message="This area requires administrator access." />;
    }

    // Check specific module permission
    if (!canAccessModule(permissions, isAdmin, module)) {
        return <AccessDenied message={`You do not have permission to access the ${module} module.`} />;
    }

    return <>{children}</>;
}

function AccessDenied({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center p-8">
            <div className="bg-red-50 p-4 rounded-full mb-4">
                <ShieldAlert className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
            <p className="text-gray-500 max-w-md mb-8">{message}</p>
            <div className="flex gap-4">
                <Button variant="outline" asChild>
                    <Link href="/dashboard">Go Home</Link>
                </Button>
            </div>
        </div>
    );
}
