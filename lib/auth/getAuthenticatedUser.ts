
import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { ImpersonationService } from "@/lib/impersonation/impersonationService";
import { SuperAdminRole } from "@/lib/rbac/super-admin";

export interface AuthContext {
    isAuthenticated: boolean;
    userId?: string;     // The EFFECTIVE user ID (impersonated or real)
    email?: string;
    orgId?: string;      // The EFFECTIVE org ID (impersonated or real)
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
                        sessionId: session.id
                    }
                };
            } else {
                // Invalid or expired session
                return {
                    isAuthenticated: false,
                    isImpersonating: false,
                    error: "Impersonation session expired or invalid",
                    status: 401
                };
            }
        }

        // 2. Standard Bearer Token Fallback
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return { isAuthenticated: false, isImpersonating: false, error: "Missing Authorization header", status: 401 };
        }

        const token = authHeader.split("Bearer ")[1];
        try {
            const decodedToken = await adminAuth.verifyIdToken(token);
            const uid = decodedToken.uid;

            // We usually fetch the user profile to get orgId, 
            // OR we rely on custom claims if we set them.
            // For now, let's fetch the user profile from Firestore to be safe and consistent with existing logic?
            // Existing logic in `create-staff` didn't fetch user... wait `create-staff` was the admin api.
            // Existing logic in `invite` fetched user `adminDb.collection("users").doc(uid)`.

            // To be truly unified, we should fetch the user doc here.
            // BUT this might be expensive for every request. 
            // Optimization: Custom Claims. 
            // If custom claims `orgId` exists, use it.

            const orgId = decodedToken.orgId as string | undefined;
            // If no orgId in token, we might need to fetch.
            // For this implementation, let's rely on token first.

            return {
                isAuthenticated: true,
                userId: uid,
                email: decodedToken.email,
                orgId: orgId, // Might be undefined if not in claims
                role: decodedToken.role as string || "user",

                isImpersonating: false
            };

        } catch (error: any) {
            return { isAuthenticated: false, isImpersonating: false, error: "Invalid token: " + error.message, status: 401 };
        }
    } catch (error: any) {
        console.error("Auth helper error:", error);
        return { isAuthenticated: false, isImpersonating: false, error: "Authentication failed", status: 500 };
    }
}
