import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import admin from "@/lib/firebase-admin";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 1. Auth & Impersonation Check
        const { getAuthenticatedUser } = await import("@/lib/auth/getAuthenticatedUser");
        const auth = await getAuthenticatedUser(request);

        if (!auth.isAuthenticated || !auth.userId) {
            return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
        }

        // 2. Fetch staff to verify ownership and get Auth UID
        const staffRef = adminDb.collection("staff").doc(id);
        const staffDoc = await staffRef.get();

        if (!staffDoc.exists) {
            return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
        }

        const staffData = staffDoc.data();
        const staffOrgId = staffData?.orgId;
        const authUid = staffData?.authUid;

        // 3. Enforce orgId match
        // If impersonating, auth.orgId is the target tenant.
        if (auth.orgId && auth.orgId !== staffOrgId) {
            return NextResponse.json({ error: "Organization mismatch" }, { status: 403 });
        }

        // 4. Delete Firestore Document (Staff)
        await staffRef.delete();

        // 5. Delete/Disable Firebase Auth User & Users Collection Doc
        if (authUid) {
            try {
                await adminAuth.deleteUser(authUid);
            } catch (authError: any) {
                console.warn(`Failed to delete Auth user ${authUid}:`, authError);
                // Continue, as the staff record is gone
            }

            try {
                await adminDb.collection("users").doc(authUid).delete();
            } catch (dbError) {
                console.warn(`Failed to delete users doc ${authUid}:`, dbError);
            }
        }

        // 6. Decrement Usage
        if (staffOrgId) {
            const { BillingService } = await import("@/lib/services/billing-service");
            await BillingService.incrementUsage(staffOrgId, "usersCount", -1);
        }

        // 7. Audit Log
        try {
            const { logAudit } = await import("@/lib/services/audit-service-server");
            await logAudit({
                actorId: auth.userId,
                action: "staff:delete",
                targetId: id,
                targetType: "staff",
                payload: { ...staffData, deletedAt: new Date().toISOString(), orgId: staffOrgId },
            });
        } catch (auditError) {
            console.error("Audit log failed", auditError);
        }

        return NextResponse.json({ success: true, message: "Staff member deleted" });

    } catch (error: any) {
        console.error("Error deleting staff:", error);
        return NextResponse.json({ error: error.message || "Failed to delete staff" }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        // 1. Auth & Impersonation Check
        const { getAuthenticatedUser } = await import("@/lib/auth/getAuthenticatedUser");
        const auth = await getAuthenticatedUser(request);

        if (!auth.isAuthenticated || !auth.userId) {
            return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
        }

        // 2. Fetch staff to verify ownership
        const staffRef = adminDb.collection("staff").doc(id);
        const staffDoc = await staffRef.get();

        if (!staffDoc.exists) {
            return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
        }

        const staffData = staffDoc.data();
        const staffOrgId = staffData?.orgId;
        const authUid = staffData?.authUid;

        // 3. Enforce orgId match
        if (auth.orgId && auth.orgId !== staffOrgId) {
            return NextResponse.json({ error: "Organization mismatch" }, { status: 403 });
        }

        // 4. Entitlement Checks (Ensure Write Access)
        const { TenantEntitlements } = await import("@/lib/entitlements/tenantEntitlements");
        try {
            await TenantEntitlements.ensureWriteAccess(staffOrgId);
        } catch (error: any) {
            return NextResponse.json({ error: error.message, code: error.code }, { status: 403 });
        }

        // 5. Update Firestore Document
        const { orgId, createdAt, ...updateData } = body;

        await staffRef.update({
            ...updateData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 6. Sync with Auth User & Users Collection
        if (authUid) {
            // Sync status (disable/enable)
            if (updateData.status === 'inactive') {
                await adminAuth.updateUser(authUid, { disabled: true });
            } else if (updateData.status === 'active') {
                await adminAuth.updateUser(authUid, { disabled: false });
            }

            // Sync role?
            // If roleId changed, we might want to update the 'users' doc.
            // But 'users' doc uses 'admin' | 'staff'. 
            // 'staff' doc uses 'roleId' (employee, pm, admin).
            // If roleId becomes 'admin', we should set users doc role to 'admin'?
            if (updateData.roleId) {
                const newRole = updateData.roleId === 'admin' ? 'admin' : 'staff';
                await adminDb.collection("users").doc(authUid).update({
                    role: newRole,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                // Also update custom claims if needed?
                // setCustomUserClaims(authUid, { role: newRole, orgId: staffOrgId })
                await adminAuth.setCustomUserClaims(authUid, {
                    role: newRole,
                    orgId: staffOrgId
                });
            }
        }

        // 7. Audit Log
        try {
            const { logAudit } = await import("@/lib/services/audit-service-server");
            await logAudit({
                actorId: auth.userId,
                action: "staff:update",
                targetId: id,
                targetType: "staff",
                payload: { updateData, previous: staffData, orgId: staffOrgId },
            });
        } catch (auditError) {
            console.error("Audit log failed", auditError);
        }

        return NextResponse.json({ success: true, message: "Staff member updated" });

    } catch (error: any) {
        console.error("Error updating staff:", error);
        if (error.code === "SUBSCRIPTION_REQUIRED" || error.code === "USAGE_LIMIT_EXCEEDED") {
            return NextResponse.json({ error: error.message, code: error.code }, { status: 403 });
        }
        return NextResponse.json({ error: error.message || "Failed to update staff" }, { status: 500 });
    }
}
