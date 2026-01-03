"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { SuperAdminSidebar } from "@/components/sa/sa-sidebar";
import { Loader2, ShieldAlert } from "lucide-react";

export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        if (loading) return;

        async function checkAccess() {
            if (!user) {
                router.push("/login");
                return;
            }

            try {
                // Force refresh to get latest custom claims
                const token = await user.getIdTokenResult(true);

                // STRICT: Require isSuperAdmin custom claim
                if (token.claims.isSuperAdmin !== true) {
                    console.warn(`Access denied for ${user.email}: Not a super admin`);
                    setAuthError("You do not have Super Admin access.");
                    // Redirect after short delay to show error
                    setTimeout(() => router.push("/dashboard"), 2000);
                    return;
                }

                setIsAuthorized(true);
            } catch (error) {
                console.error("Error checking super admin access:", error);
                setAuthError("Failed to verify access. Please try again.");
            }
        }

        checkAccess();
    }, [user, loading, router]);

    // Show loading state
    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
            </div>
        );
    }

    // Show access denied error
    if (authError) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-background gap-4">
                <ShieldAlert className="h-16 w-16 text-red-500" />
                <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
                <p className="text-muted-foreground">{authError}</p>
                <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
            </div>
        );
    }

    // Show verifying state
    if (!isAuthorized) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Verifying super admin access...</span>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-background">
            <SuperAdminSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-14 border-b flex items-center px-6 bg-background/50 backdrop-blur justify-between">
                    <div className="font-medium text-sm">Dashboard</div>
                    <div className="text-xs text-muted-foreground">Logged in as {user?.email}</div>
                </header>
                <main className="flex-1 overflow-auto bg-muted/5 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
