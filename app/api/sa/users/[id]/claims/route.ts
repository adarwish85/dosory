import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { requireSuperAdmin, requireRole } from "@/lib/auth/requireSuperAdmin";
import { SuperAdminRole } from "@/lib/rbac/super-admin";
import { AuditService } from "@/lib/services/audit-service";

/**
 * Internal API to set Super Admin custom claims on a user.
 * Only accessible by PlatformAdmin.
 * 
 * POST /api/sa/users/[id]/claims
 * Body: { isSuperAdmin: boolean, superRole?: string }
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireSuperAdmin(req);
    if (!auth.success) return auth.response;

    // Only PlatformAdmin can modify user claims
    const roleError = requireRole(auth.user, [SuperAdminRole.PlatformAdmin]);
    if (roleError) return roleError;

    try {
        const { id: targetUid } = await params;
        const body = await req.json();
        const { isSuperAdmin, superRole } = body;

        // Validate inputs
        if (typeof isSuperAdmin !== "boolean") {
            return NextResponse.json(
                { error: "isSuperAdmin boolean required" },
                { status: 400 }
            );
        }

        // Build claims object
        const claims: Record<string, any> = {
            isSuperAdmin
        };

        if (isSuperAdmin && superRole) {
            const validRoles = ["PlatformAdmin", "ContentAdmin", "SupportAgent", "BillingAdmin", "SecurityAdmin"];
            if (!validRoles.includes(superRole)) {
                return NextResponse.json(
                    { error: `Invalid superRole. Must be one of: ${validRoles.join(", ")}` },
                    { status: 400 }
                );
            }
            claims.superRole = superRole;
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

        // Set custom claims
        await adminAuth.setCustomUserClaims(targetUid, claims);

        // Log the action
        await AuditService.log({
            action: isSuperAdmin ? "grant_super_admin_claims" : "revoke_super_admin_claims",
            targetType: "user",
            targetId: targetUid,
            actorId: auth.user.uid,
            actorRole: auth.user.superRole,
            payload: { claims }
        });

        return NextResponse.json({
            success: true,
            message: "Custom claims updated. User must log out and log back in for changes to take effect.",
            claims
        });
    } catch (error: any) {
        console.error("Set User Claims Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * GET /api/sa/users/[id]/claims
 * Retrieve current custom claims for a user.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireSuperAdmin(req);
    if (!auth.success) return auth.response;

    const roleError = requireRole(auth.user, [SuperAdminRole.PlatformAdmin, SuperAdminRole.SecurityAdmin]);
    if (roleError) return roleError;

    try {
        const { id: targetUid } = await params;

        const user = await adminAuth.getUser(targetUid);
        const claims = user.customClaims || {};

        return NextResponse.json({
            uid: user.uid,
            email: user.email,
            claims
        });
    } catch (error: any) {
        if (error.code === "auth/user-not-found") {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        console.error("Get User Claims Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
