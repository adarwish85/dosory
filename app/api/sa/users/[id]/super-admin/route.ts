import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { requireSuperAdmin, requireRole } from "@/lib/auth/requireSuperAdmin";
import { SuperAdminRole } from "@/lib/rbac/super-admin";
import { AuditService } from "@/lib/services/audit-service";

/**
 * Toggle Super Admin status for a user.
 * 
 * UNIFIED AUTH: Uses Firebase Custom Claims as single source of truth.
 * 
 * This endpoint sets the isSuperAdmin claim on the user's Firebase Auth record.
 * After setting claims, the target user must log out and back in for changes to take effect.
 * 
 * Only PlatformAdmin can grant/revoke super admin access.
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireSuperAdmin(req);
    if (!auth.success) return auth.response;

    // Only PlatformAdmin can modify super admin status
    const roleError = requireRole(auth.user, [SuperAdminRole.PlatformAdmin]);
    if (roleError) return roleError;

    try {
        const { id: targetUid } = await params;
        const body = await req.json();
        const { isSuperAdmin, superRole } = body;

        if (typeof isSuperAdmin !== "boolean") {
            return NextResponse.json({ error: "isSuperAdmin boolean required" }, { status: 400 });
        }

        // Verify target user exists
        try {
            await adminAuth.getUser(targetUid);
        } catch (error: any) {
            if (error.code === "auth/user-not-found") {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }
            throw error;
        }

        // Build claims - use Firebase Auth Custom Claims as single source of truth
        const claims: Record<string, any> = {};

        if (isSuperAdmin) {
            claims.isSuperAdmin = true;
            claims.superRole = superRole || SuperAdminRole.ContentAdmin;
        } else {
            // Remove super admin access entirely
            claims.isSuperAdmin = false;
            claims.superRole = null;
        }

        // Set custom claims on Firebase Auth
        await adminAuth.setCustomUserClaims(targetUid, claims);

        // Log the action
        await AuditService.log({
            action: isSuperAdmin ? "grant_super_admin" : "revoke_super_admin",
            targetType: "user",
            targetId: targetUid,
            actorId: auth.user.uid,
            actorRole: auth.user.superRole,
            payload: { claims }
        });

        return NextResponse.json({
            success: true,
            message: "Super admin status updated. User must log out and back in for changes to take effect.",
            claims
        });
    } catch (error: any) {
        console.error("SA Toggle SuperAdmin Error:", error);
        return NextResponse.json({ error: error.message || "Failed to update super admin status" }, { status: 500 });
    }
}
