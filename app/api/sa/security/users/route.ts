import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import { adminDb } from "@/lib/firebase-admin";
import { SuperAdminUser } from "@/lib/rbac/super-admin";

export async function GET(req: NextRequest) {
    const auth = await requireSuperAdmin(req);
    if (!auth.success) return auth.response;

    // Any Super Admin can LIST users (read-only for non-PlatformAdmin verified in UI,
    // but we allow list access to everyone securely so they can see who is admin)

    try {
        const snapshot = await adminDb.collection("superAdmins").get();
        const users: SuperAdminUser[] = snapshot.docs.map(
            (doc) =>
                ({
                    uid: doc.id,
                    ...doc.data(),
                }) as SuperAdminUser
        );

        return NextResponse.json({ users });
    } catch (error: unknown) {
        console.error("Error fetching super admins:", error);
        return NextResponse.json({ error: "Failed to fetch super admins" }, { status: 500 });
    }
}

import { requireRole } from "@/lib/auth/requireSuperAdmin";
import { SuperAdminRole } from "@/lib/rbac/super-admin";
import { adminAuth } from "@/lib/firebase-admin";
import { logAudit } from "@/lib/services/audit-service-server";
import * as admin from "firebase-admin";

export async function POST(req: NextRequest) {
    const authResult = await requireSuperAdmin(req);
    if (!authResult.success) return authResult.response;

    // Only PlatformAdmin can add new admins
    const roleError = requireRole(authResult.user, [SuperAdminRole.PlatformAdmin]);
    if (roleError) return roleError;

    try {
        const body = await req.json();
        const { email, role } = body;

        if (!email || !role) {
            return NextResponse.json({ error: "Missing email or role" }, { status: 400 });
        }

        // 1. Resolve email to UID
        let userRecord;
        try {
            userRecord = await adminAuth.getUserByEmail(email);
        } catch {
            return NextResponse.json({ error: "User not found in Firebase Auth" }, { status: 404 });
        }

        const uid = userRecord.uid;

        // 2. Create doc in superAdmins
        await adminDb.collection("superAdmins").doc(uid).set({
            uid,
            email,
            role,
            status: "active",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 3. Set Custom Claims
        await adminAuth.setCustomUserClaims(uid, {
            isSuperAdmin: true,
            superRole: role,
        });

        // 4. Log Audit
        await logAudit({
            actorId: authResult.user.uid,
            action: "ADD_SUPER_ADMIN",
            targetId: uid,
            targetType: "super_admin",
            payload: { email, role },
        });

        return NextResponse.json({ message: "Super admin added successfully", uid });
    } catch (error: unknown) {
        console.error("Error adding super admin:", error);
        return NextResponse.json({ error: "Failed to add super admin" }, { status: 500 });
    }
}
