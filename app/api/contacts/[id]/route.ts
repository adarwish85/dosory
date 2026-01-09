import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import admin from "@/lib/firebase-admin";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        // 1. Auth Check
        const { getAuthenticatedUser } = await import("@/lib/auth/getAuthenticatedUser");
        const auth = await getAuthenticatedUser(request);

        if (!auth.isAuthenticated || !auth.userId) {
            return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
        }

        // 2. Fetch contact to verify ownership
        const contactRef = adminDb.collection("contacts").doc(id);
        const contactDoc = await contactRef.get();

        if (!contactDoc.exists) {
            return NextResponse.json({ error: "Contact not found" }, { status: 404 });
        }

        const contactData = contactDoc.data();
        const contactOrgId = contactData?.orgId;

        // 3. Enforce orgId match
        if (auth.orgId && auth.orgId !== contactOrgId) {
            return NextResponse.json({ error: "Organization mismatch" }, { status: 403 });
        }

        // 4. Entitlement Check
        const { TenantEntitlements } = await import("@/lib/entitlements/tenantEntitlements");
        try {
            await TenantEntitlements.ensureWriteAccess(contactOrgId);
        } catch (error: unknown) {
            const err = error as { message?: string; code?: string };
            return NextResponse.json(
                { error: err.message || "Write access denied", code: err.code },
                { status: 403 }
            );
        }

        // 5. Update Contact
        const { orgId, createdAt, createdBy, customerId, ...updateData } = body;

        await contactRef.update({
            ...updateData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Error updating contact:", error);
        const err = error as { message?: string };
        return NextResponse.json({ error: err.message || "Failed to update contact" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 1. Auth Check
        const { getAuthenticatedUser } = await import("@/lib/auth/getAuthenticatedUser");
        const auth = await getAuthenticatedUser(request);

        if (!auth.isAuthenticated || !auth.userId) {
            return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
        }

        // 2. Fetch contact to verify ownership
        const contactRef = adminDb.collection("contacts").doc(id);
        const contactDoc = await contactRef.get();

        if (!contactDoc.exists) {
            return NextResponse.json({ error: "Contact not found" }, { status: 404 });
        }

        const contactData = contactDoc.data();
        const contactOrgId = contactData?.orgId;

        // 3. Enforce orgId match
        if (auth.orgId && auth.orgId !== contactOrgId) {
            return NextResponse.json({ error: "Organization mismatch" }, { status: 403 });
        }

        // 4. Entitlement Check
        const { TenantEntitlements } = await import("@/lib/entitlements/tenantEntitlements");
        try {
            await TenantEntitlements.ensureWriteAccess(contactOrgId);
        } catch (error: unknown) {
            const err = error as { message?: string; code?: string };
            return NextResponse.json(
                { error: err.message || "Write access denied", code: err.code },
                { status: 403 }
            );
        }

        // 5. Delete Contact
        await contactRef.delete();

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Error deleting contact:", error);
        const err = error as { message?: string };
        return NextResponse.json({ error: err.message || "Failed to delete contact" }, { status: 500 });
    }
}
