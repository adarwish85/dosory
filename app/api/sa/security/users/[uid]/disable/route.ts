import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, requireRole } from "@/lib/auth/requireSuperAdmin";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { SuperAdminRole } from "@/lib/rbac/super-admin";
import { logAudit } from "@/lib/services/audit-service-server";
import * as admin from "firebase-admin";

export async function PATCH(req: NextRequest, context: { params: Promise<{ uid: string }> }) {
    const authResult = await requireSuperAdmin(req);
    if (!authResult.success) return authResult.response;

    // Only PlatformAdmin can disable users
    const roleError = requireRole(authResult.user, [SuperAdminRole.PlatformAdmin]);
    if (roleError) return roleError;

    const { uid } = await context.params;

    try {
        const body = await req.json();
        const { status } = body; // 'active' | 'disabled'

        if (!status || (status !== "active" && status !== "disabled")) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        // Prevent disabling self?
        if (uid === authResult.user.uid && status === "disabled") {
            return NextResponse.json({ error: "Cannot disable yourself" }, { status: 403 });
        }

        // Retrieve current doc to know role (for restoration if enabling) or validation
        const docRef = adminDb.collection("superAdmins").doc(uid);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        const currentUserData = docSnap.data();

        // 1. Update superAdmins doc
        await docRef.update({
            status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 2. Update Custom Claims
        if (status === "disabled") {
            // Remove claims to revoke access
            await adminAuth.setCustomUserClaims(uid, {
                isSuperAdmin: false,
            });
            // Revoke tokens to force immediate logout
            await adminAuth.revokeRefreshTokens(uid);
        } else {
            // Restore claims
            const role = currentUserData?.role || SuperAdminRole.SupportAgent; // fallback safety
            await adminAuth.setCustomUserClaims(uid, {
                isSuperAdmin: true,
                superRole: role,
            });
        }

        // 3. Log Audit
        await logAudit({
            actorId: authResult.user.uid,
            action: status === "disabled" ? "DISABLE_ADMIN" : "ENABLE_ADMIN",
            targetId: uid,
            targetType: "super_admin",
            payload: { status },
        });

        return NextResponse.json({ message: `User ${status === "disabled" ? "disabled" : "enabled"} successfully` });
    } catch (error: unknown) {
        console.error("Error updating status:", error);
        return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
    }
}
