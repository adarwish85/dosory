import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, requireRole } from "@/lib/auth/requireSuperAdmin";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { SuperAdminRole } from "@/lib/rbac/super-admin";
import { logAudit } from "@/lib/services/audit-service-server";
import * as admin from "firebase-admin";

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ uid: string }> } // Updated to Promise based type for Next.js 15+
) {
    const authResult = await requireSuperAdmin(req);
    if (!authResult.success) return authResult.response;

    // Only PlatformAdmin can change roles
    const roleError = requireRole(authResult.user, [SuperAdminRole.PlatformAdmin]);
    if (roleError) return roleError;

    const { uid } = await context.params;

    try {
        const body = await req.json();
        const { role } = body;

        if (!role) {
            return NextResponse.json({ error: "Missing role" }, { status: 400 });
        }

        // Prevent self-demotion if it's the last PlatformAdmin?
        // Implementation detail: check if user is acting on own UID and changing from PlatformAdmin to something else.
        if (
            uid === authResult.user.uid &&
            authResult.user.superRole === SuperAdminRole.PlatformAdmin &&
            role !== SuperAdminRole.PlatformAdmin
        ) {
            // Check count of platform admins
            const snapshot = await adminDb
                .collection("superAdmins")
                .where("role", "==", SuperAdminRole.PlatformAdmin)
                .where("status", "==", "active")
                .get();

            if (snapshot.size <= 1) {
                return NextResponse.json({ error: "Cannot demote the last Platform Admin" }, { status: 403 });
            }
        }

        // 1. Update superAdmins doc
        await adminDb.collection("superAdmins").doc(uid).update({
            role,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 2. Update Custom Claims
        await adminAuth.setCustomUserClaims(uid, {
            isSuperAdmin: true,
            superRole: role,
        });

        // 3. Log Audit
        await logAudit({
            actorId: authResult.user.uid,
            action: "CHANGE_ROLE",
            targetId: uid,
            targetType: "super_admin",
            payload: {
                oldRole: "unknown", // optimization: could transport old role in body or fetch it
                newRole: role,
            },
        });

        return NextResponse.json({ message: "Role updated successfully" });
    } catch (error: unknown) {
        console.error("Error updating role:", error);
        return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
    }
}
