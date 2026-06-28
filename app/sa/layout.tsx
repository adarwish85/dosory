"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { SuperAdminSidebar } from "@/components/sa/sa-sidebar";
import { Loader2, ShieldAlert, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";

/**
 * Super Admin Layout Guard
 * 
 * SINGLE SOURCE OF TRUTH: Firebase Auth Custom Claims
 * 
 * This layout checks `isSuperAdmin` from Firebase ID token claims.
 * 
 * FLOW:
 * 1. Get fresh token with getIdToken(true)
 * 2. Verify claims via /api/internal/superadmin/whoami
 * 3. If isSuperAdmin === true, allow access
 * 4. Otherwise, show Access Denied with refresh/grant options
 * 
 * IMPORTANT:
 * - No Firestore listeners run until access is verified
 * - Children are NOT rendered until isAuthorized === true
 */

interface TokenClaims {
    uid: string;
    email: string | null;
    isSuperAdmin: boolean;
    superRole: string | null;
    issuedAt: string;
    expiresAt: string;
    signInProvider: string;
}

export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { t } = useTranslation();

    // Auth state
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [checking, setChecking] = useState(true);

    // Debug state
    const [serverClaims, setServerClaims] = useState<TokenClaims | null>(null);
    const [clientClaims, setClientClaims] = useState<Record<string, any> | null>(null);

    // Dev grant state
    const [grantEmail, setGrantEmail] = useState("");
    const [granting, setGranting] = useState(false);
    const [grantResult, setGrantResult] = useState<{ success: boolean; message: string } | null>(null);

    const isDev = process.env.NODE_ENV === "development";

    /**
     * Check access by:
     * 1. Force-refreshing the Firebase ID token
     * 2. Verifying with server-side /whoami endpoint
     */
    const checkAccess = useCallback(async (forceRefresh: boolean = false) => {
        if (!user) {
            setChecking(false);
            router.push("/login");
            return;
        }

        setChecking(true);
        setAuthError(null);
        setGrantResult(null);

        try {
            // Step 1: Force refresh token from Firebase
            console.log("[SA Layout] Getting fresh token...");
            const idToken = await user.getIdToken(forceRefresh);

            // Also get token result for client-side claims
            const tokenResult = await user.getIdTokenResult(forceRefresh);
            setClientClaims(tokenResult.claims);

            console.log("[SA Layout] Client claims:", {
                isSuperAdmin: tokenResult.claims.isSuperAdmin,
                superRole: tokenResult.claims.superRole
            });

            // Step 2: Verify with server
            console.log("[SA Layout] Verifying with server...");
            const response = await fetch("/api/internal/superadmin/whoami", {
                headers: { "Authorization": `Bearer ${idToken}` }
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || t("sa.layout.failedToVerifyToken"));
            }

            const claims = await response.json() as TokenClaims;
            setServerClaims(claims);

            console.log("[SA Layout] Server claims:", {
                isSuperAdmin: claims.isSuperAdmin,
                superRole: claims.superRole
            });

            // Step 3: Check authorization
            if (claims.isSuperAdmin === true) {
                setIsAuthorized(true);
                setAuthError(null);
                console.log("[SA Layout] Access granted");
                return;
            }

            // Not authorized
            console.warn(`[SA Layout] Access denied for ${user.email}`);
            setAuthError(t("sa.layout.noAccess"));
            setIsAuthorized(false);

        } catch (error: any) {
            console.error("[SA Layout] Error:", error);
            setAuthError(t("sa.layout.verificationFailed", { message: error.message }));
            setIsAuthorized(false);
        } finally {
            setChecking(false);
        }
    }, [user, router, t]);

    /**
     * Dev-only: Grant Super Admin access to an email
     */
    const handleGrantAccess = async () => {
        if (!grantEmail) return;

        setGranting(true);
        setGrantResult(null);

        try {
            const response = await fetch("/api/internal/superadmin/set-claims", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: grantEmail,
                    isSuperAdmin: true,
                    superRole: "PlatformAdmin"
                })
            });

            const result = await response.json();

            if (!response.ok) {
                setGrantResult({ success: false, message: result.error });
                return;
            }

            setGrantResult({
                success: true,
                message: t("sa.layout.claimsSet", { email: grantEmail })
            });

        } catch (error: any) {
            setGrantResult({ success: false, message: error.message });
        } finally {
            setGranting(false);
        }
    };

    // Initial check on mount or user change
    useEffect(() => {
        if (loading) return;

        // Set default email for grant form
        if (user?.email) {
            setGrantEmail(user.email);
        }

        checkAccess(true);
    }, [user, loading, checkAccess]);

    const handleRefreshAccess = () => {
        checkAccess(true);
    };

    const handleSignOut = async () => {
        const { auth } = await import("@/lib/firebase");
        await auth.signOut();
        router.push("/login");
    };

    // =========================================================================
    // RENDER: Loading State
    // =========================================================================
    if (loading || (checking && !authError)) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-background gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                    {loading ? t("common.loading") : t("sa.layout.verifyingAccess")}
                </span>
            </div>
        );
    }

    // =========================================================================
    // RENDER: Access Denied
    // CRITICAL: No children (and thus no Firestore listeners) are rendered here
    // =========================================================================
    if (authError || !isAuthorized) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4">
                <Card className="w-full max-w-lg">
                    <CardHeader className="text-center">
                        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-2" />
                        <CardTitle className="text-red-600">{t("sa.layout.accessDenied")}</CardTitle>
                        <CardDescription>
                            {authError || t("sa.layout.noAccess")}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {/* Action Buttons */}
                        <div className="flex gap-3 justify-center">
                            <Button onClick={handleRefreshAccess} disabled={checking}>
                                <RefreshCw className={`mr-2 h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
                                {t("sa.layout.refreshAccess")}
                            </Button>
                            <Button onClick={handleSignOut} variant="outline">
                                {t("sa.layout.signOut")}
                            </Button>
                        </div>

                        {/* Claims Debug Info */}
                        <div className="bg-muted rounded-lg p-3 text-xs font-mono space-y-1">
                            <p className="font-semibold text-foreground">{t("sa.layout.tokenClaims")}</p>
                            {serverClaims ? (
                                <>
                                    <p>uid: {serverClaims.uid}</p>
                                    <p>email: {serverClaims.email}</p>
                                    <p className={serverClaims.isSuperAdmin ? "text-green-600" : "text-red-600"}>
                                        isSuperAdmin: {String(serverClaims.isSuperAdmin)}
                                    </p>
                                    <p>superRole: {serverClaims.superRole || "none"}</p>
                                    <p className="text-muted-foreground">provider: {serverClaims.signInProvider}</p>
                                </>
                            ) : clientClaims ? (
                                <>
                                    <p>email: {user?.email}</p>
                                    <p className={clientClaims.isSuperAdmin ? "text-green-600" : "text-red-600"}>
                                        isSuperAdmin: {String(clientClaims.isSuperAdmin ?? "undefined")}
                                    </p>
                                    <p>superRole: {String(clientClaims.superRole) || "none"}</p>
                                </>
                            ) : (
                                <p className="text-muted-foreground">{t("sa.layout.noClaimsData")}</p>
                            )}
                        </div>

                        {/* Dev-only: Grant Access Form */}
                        {isDev && (
                            <div className="border-t pt-4 mt-4">
                                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                                    <span className="text-yellow-600">[DEV]</span> {t("sa.layout.grantSuperAdmin")}
                                </p>
                                <div className="flex gap-2">
                                    <Input
                                        type="email"
                                        placeholder={t("sa.layout.emailPlaceholder")}
                                        value={grantEmail}
                                        onChange={(e) => setGrantEmail(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button
                                        onClick={handleGrantAccess}
                                        disabled={granting || !grantEmail}
                                        size="sm"
                                    >
                                        {granting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("sa.layout.grant")}
                                    </Button>
                                </div>
                                {grantResult && (
                                    <p className={`text-xs mt-2 flex items-center gap-1 ${grantResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                        {grantResult.success ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                        {grantResult.message}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Help Text */}
                        <p className="text-xs text-muted-foreground text-center">
                            {t("sa.layout.tokenCacheHelp")}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // =========================================================================
    // RENDER: Authorized - Now children (with Firestore access) can render
    // =========================================================================
    return (
        <div className="flex h-screen bg-background">
            <SuperAdminSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-14 border-b flex items-center px-6 bg-background/50 backdrop-blur justify-between">
                    <div className="font-medium text-sm">{t("sa.layout.dashboard")}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium">
                            {serverClaims?.superRole || t("sa.layout.adminBadge")}
                        </span>
                        {user?.email}
                    </div>
                </header>
                <main className="flex-1 overflow-auto bg-muted/5 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
