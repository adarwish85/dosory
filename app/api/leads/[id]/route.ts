import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUser } from "@/lib/auth/getAuthenticatedUser";
import { TenantEntitlements } from "@/lib/entitlements/tenantEntitlements";
import { logAudit } from "@/lib/services/audit-service-server";
import { FieldValue } from "firebase-admin/firestore";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await getAuthenticatedUser(req);
        if (!auth.isAuthenticated || !auth.orgId || !auth.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const data = await req.json();

        // Verify Ownership
        const docRef = adminDb.collection("leads").doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return NextResponse.json({ error: "Lead not found" }, { status: 404 });
        }

        const currentData = docSnap.data();
        if (currentData?.orgId !== auth.orgId) {
            return NextResponse.json({ error: "Unauthorized access to resource" }, { status: 403 });
        }

        // Enforce Entitlements
        try {
            await TenantEntitlements.ensureWriteAccess(auth.orgId);
        } catch (err: unknown) {
            const error = err as { message?: string; code?: string };
            return NextResponse.json({ error: error.message || "Unknown error", code: error.code }, { status: 403 });
        }

        // Update
        const updates = {
            ...data,
            updatedAt: FieldValue.serverTimestamp(),
        };

        // If name changes, update name_lower
        if (updates.name) {
            updates.name_lower = updates.name.toLowerCase();
        }

        // Prevent updating critical fields
        delete updates.id;
        delete updates.orgId;
        delete updates.createdAt;
        delete updates.createdBy;

        await docRef.update(updates);

        // Audit
        await logAudit({
            actorId: auth.userId,
            action: "update",
            targetType: "lead",
            targetId: id,
            payload: { updates: Object.keys(updates), orgId: auth.orgId },
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Error updating lead:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await getAuthenticatedUser(req);
        if (!auth.isAuthenticated || !auth.orgId || !auth.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Verify Ownership
        const docRef = adminDb.collection("leads").doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return NextResponse.json({ error: "Lead not found" }, { status: 404 });
        }

        const currentData = docSnap.data();
        if (currentData?.orgId !== auth.orgId) {
            return NextResponse.json({ error: "Unauthorized access to resource" }, { status: 403 });
        }

        // Enforce Entitlements
        try {
            await TenantEntitlements.ensureWriteAccess(auth.orgId);
        } catch (err: unknown) {
            const error = err as { message?: string; code?: string };
            return NextResponse.json({ error: error.message || "Unknown error", code: error.code }, { status: 403 });
        }

        await docRef.delete();

        // Audit
        await logAudit({
            actorId: auth.userId,
            action: "delete",
            targetType: "lead",
            targetId: id,
            payload: { name: currentData?.name, orgId: auth.orgId }, // Pass orgId in payload as it's not in interface
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Error deleting lead:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
