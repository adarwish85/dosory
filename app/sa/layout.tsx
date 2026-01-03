"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { SuperAdminSidebar } from "@/components/sa/sa-sidebar";
import { Loader2, ShieldAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Super Admin Layout Guard
 * 
 * SINGLE SOURCE OF TRUTH: Firebase Auth Custom Claims
 * 
 * This layout checks `isSuperAdmin` from Firebase ID token claims.
 * After setting custom claims via scripts/setSuperAdminClaims.ts,
 * the user MUST:
 *   1. Sign out completely
 *   2. Sign back in
 * OR
 *   1. Click "Refresh Access" to force token refresh
 * 
 * Firebase tokens cache for ~1 hour. getIdTokenResult(true) forces
 * a refresh from Firebase servers.
 */
export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [checking, setChecking] = useState(false);
    const [debugInfo, setDebugInfo] = useState<string>("");

    const checkAccess = async (forceRefresh: boolean = false) => {
        if (!user) {
            router.push("/login");
            return;
        }

        setChecking(true);
        setAuthError(null);

        try {
            // Force refresh to get latest custom claims from Firebase
            // The 'true' parameter forces Firebase to fetch fresh claims
            const tokenResult = await user.getIdTokenResult(forceRefresh);
            const claims = tokenResult.claims;

            // Debug: Log claims for troubleshooting
            console.log("[SA Layout] Token claims:", {
                isSuperAdmin: claims.isSuperAdmin,
                superRole: claims.superRole,
                email: user.email,
                tokenTime: tokenResult.issuedAtTime
            });

            // Store debug info for display if needed
            setDebugInfo(`Claims: isSuperAdmin=${claims.isSuperAdmin}, superRole=${claims.superRole || 'none'}`);

            // SINGLE SOURCE OF TRUTH: Firebase custom claims
            if (claims.isSuperAdmin === true) {
                setIsAuthorized(true);
                setAuthError(null);
                return;
            }

            // Not a super admin
            console.warn(`[SA Layout] Access denied for ${user.email}: isSuperAdmin claim is ${claims.isSuperAdmin}`);
            setAuthError("You do not have Super Admin access. Ensure claims are set and try 'Refresh Access'.");
            setIsAuthorized(false);

        } catch (error: any) {
            console.error("[SA Layout] Error checking access:", error);
            setAuthError(`Failed to verify access: ${error.message}`);
            setIsAuthorized(false);
        } finally {
            setChecking(false);
        }
    };

    useEffect(() => {
        if (loading) return;

        // Initial check with force refresh
        checkAccess(true);
    }, [user, loading]);

    const handleRefreshAccess = () => {
        checkAccess(true);
    };

    const handleSignOut = async () => {
        const { auth } = await import("@/lib/firebase");
        await auth.signOut();
        router.push("/login");
    };

    // Show loading state
    if (loading || (checking && !authError)) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-background gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                    {loading ? "Loading..." : "Verifying super admin access..."}
                </span>
            </div>
        );
    }

    // Show access denied error with retry options
    if (authError || !isAuthorized) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-background gap-4 p-4">
                <ShieldAlert className="h-16 w-16 text-red-500" />
                <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
                <p className="text-muted-foreground text-center max-w-md">
                    {authError || "You do not have Super Admin access."}
                </p>

                <div className="flex gap-3 mt-4">
                    <Button onClick={handleRefreshAccess} disabled={checking} variant="default">
                        <RefreshCw className={`mr-2 h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
                        Refresh Access
                    </Button>
                    <Button onClick={handleSignOut} variant="outline">
                        Sign Out & Re-login
                    </Button>
                </div>

                <p className="text-xs text-muted-foreground mt-4 text-center max-w-md">
                    If you just received Super Admin access, click "Refresh Access" or sign out and back in.
                    Firebase tokens cache for up to 1 hour.
                </p>

                {debugInfo && (
                    <p className="text-xs text-muted-foreground font-mono mt-2 bg-muted px-2 py-1 rounded">
                        {debugInfo}
                    </p>
                )}
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
