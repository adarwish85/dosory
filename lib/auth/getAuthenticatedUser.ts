import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { ImpersonationService } from "@/lib/impersonation/impersonationService";
import { SuperAdminRole } from "@/lib/rbac/super-admin";

export interface AuthContext {
    isAuthenticated: boolean;
    userId?: string; // The EFFECTIVE user ID (impersonated or real)
    email?: string;
    orgId?: string; // The EFFECTIVE org ID (impersonated or real)
    role?: string;

    // Impersonation Metadata
    isImpersonating: boolean;
    actor?: {
        uid: string;
        email: string;
        role: SuperAdminRole;
        sessionId: string;
    };

    error?: string;
    status?: number;
}

/**
 * Unified Authentication Helper.
 *
 * Supports:
 * 1. Standard Bearer Token (Firebase ID Token)
 * 2. Impersonation Session Header (x-impersonation-session-id)
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<AuthContext> {
    try {
        // 1. Check for Impersonation Header
        const impersonationSessionId = req.headers.get("x-impersonation-session-id");

        if (impersonationSessionId) {
            const session = await ImpersonationService.validateSession(impersonationSessionId);
            if (session) {
                // Return Impersonated Context
                return {
                    isAuthenticated: true,
                    // If targetUserId is set, we act as that user.
                    // If NOT set, we act as the tenant owner? Or we just have the orgId?
                    // Usually we need a userId for most operations.
                    // If targetUserId is missing, we might need to fetch the owner ID or create a temp ID.
                    // For now, let's assume if targetUserId is missing, we leave userId undefined
                    // BUT many APIs require userId.
                    // Strategy: If impersonating tenant-only, allow actions that don't need distinct userId,
                    // or use a placeholder "impersonator" ID.
                    userId: session.targetUserId || `impersonator_${session.actorUid}`,
                    orgId: session.targetTenantId,
                    email: `impersonated+${session.targetTenantId}@dosory.com`, // Placeholder email
                    role: "admin", // Impersonators usually get admin power on the tenant

                    isImpersonating: true,
                    actor: {
                        uid: session.actorUid,
                        email: session.actorEmail,
                        role: session.actorRole,
                        sessionId: session.id,
                    },
                };
            } else {
                // Invalid or expired session
                return {
                    isAuthenticated: false,
                    isImpersonating: false,
                    error: "Impersonation session expired or invalid",
                    status: 401,
                };
            }
        }

        // 2. Standard Bearer Token Fallback
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return {
                isAuthenticated: false,
                isImpersonating: false,
                error: "Missing Authorization header",
                status: 401,
            };
        }

        const token = authHeader.split("Bearer ")[1];
        try {
            const decodedToken = await adminAuth.verifyIdToken(token);
            const uid = decodedToken.uid;

            let orgId = decodedToken.orgId as string | undefined;

            // Fallback: If orgId is missing in token, fetch from Firestore
            if (!orgId) {
                const userDoc = await adminDb.collection("users").doc(uid).get();
                if (userDoc.exists) {
                    orgId = userDoc.data()?.orgId;
                }
            }

            return {
                isAuthenticated: true,
                userId: uid,
                email: decodedToken.email,
                orgId: orgId,
                role: (decodedToken.role as string) || "user",

                isImpersonating: false,
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            return {
                isAuthenticated: false,
                isImpersonating: false,
                error: "Invalid token: " + errorMessage,
                status: 401,
            };
        }
    } catch (error: unknown) {
        console.error("Auth helper error:", error);
        return { isAuthenticated: false, isImpersonating: false, error: "Authentication failed", status: 500 };
    }
}
