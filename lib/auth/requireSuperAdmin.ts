import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { SuperAdminRole } from "@/lib/rbac/super-admin";

export interface AuthenticatedSuperAdmin {
    uid: string;
    email: string;
    isSuperAdmin: true;
    superRole: SuperAdminRole;
}

export interface AuthResult {
    success: true;
    user: AuthenticatedSuperAdmin;
}

export interface AuthError {
    success: false;
    response: NextResponse;
}

/**
 * Server-side authentication guard for Super Admin API routes.
 * 
 * MUST be called at the start of EVERY SA API handler.
 * 
 * Validates:
 * 1. Authorization header is present and valid
 * 2. Token is verified by Firebase Admin SDK
 * 3. User has isSuperAdmin custom claim set to true
 * 
 * Returns user info with superRole on success.
 * Returns appropriate 401/403 response on failure.
 */
export async function requireSuperAdmin(req: NextRequest): Promise<AuthResult | AuthError> {
    try {
        // Extract Authorization header
        const authHeader = req.headers.get("Authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return {
                success: false,
                response: NextResponse.json(
                    { error: "Unauthorized: Missing or invalid authorization header" },
                    { status: 401 }
                )
            };
        }

        const token = authHeader.substring(7); // Remove "Bearer " prefix

        // Verify token with Firebase Admin SDK
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (verifyError: any) {
            console.error("Token verification failed:", verifyError.message);
            return {
                success: false,
                response: NextResponse.json(
                    { error: "Unauthorized: Invalid or expired token" },
                    { status: 401 }
                )
            };
        }

        // Check for isSuperAdmin custom claim
        if (decodedToken.isSuperAdmin !== true) {
            console.warn(`Access denied for user ${decodedToken.email}: Not a super admin`);
            return {
                success: false,
                response: NextResponse.json(
                    { error: "Forbidden: Super admin access required" },
                    { status: 403 }
                )
            };
        }

        // Extract super role (default to PlatformAdmin if not set)
        const superRole = (decodedToken.superRole as SuperAdminRole) || SuperAdminRole.PlatformAdmin;

        return {
            success: true,
            user: {
                uid: decodedToken.uid,
                email: decodedToken.email || "",
                isSuperAdmin: true,
                superRole
            }
        };
    } catch (error: any) {
        console.error("Auth guard error:", error);
        return {
            success: false,
            response: NextResponse.json(
                { error: "Internal server error during authentication" },
                { status: 500 }
            )
        };
    }
}

/**
 * Check if authenticated super admin has required role.
 * PlatformAdmin has access to all resources.
 */
export function requireRole(
    user: AuthenticatedSuperAdmin,
    allowedRoles: SuperAdminRole[]
): NextResponse | null {
    // PlatformAdmin has full access
    if (user.superRole === SuperAdminRole.PlatformAdmin) {
        return null;
    }

    if (!allowedRoles.includes(user.superRole)) {
        return NextResponse.json(
            { error: `Forbidden: Requires one of these roles: ${allowedRoles.join(", ")}` },
            { status: 403 }
        );
    }

    return null;
}
