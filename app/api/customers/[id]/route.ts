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

        // 2. Fetch customer to verify ownership
        const customerRef = adminDb.collection("customers").doc(id);
        const customerDoc = await customerRef.get();

        if (!customerDoc.exists) {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }

        const customerData = customerDoc.data();
        const customerOrgId = customerData?.orgId;

        // 3. Enforce orgId match
        if (auth.orgId && auth.orgId !== customerOrgId) {
            return NextResponse.json({ error: "Organization mismatch" }, { status: 403 });
        }

        // 4. Entitlement Check
        const { TenantEntitlements } = await import("@/lib/entitlements/tenantEntitlements");
        try {
            await TenantEntitlements.ensureWriteAccess(customerOrgId);
        } catch (error: unknown) {
            const err = error as { message?: string; code?: string };
            return NextResponse.json(
                { error: err.message || "Write access denied", code: err.code },
                { status: 403 }
            );
        }

        // 5. Update Customer
        const { orgId, createdAt, createdBy, ...updateData } = body;

        await customerRef.update({
            ...updateData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Error updating customer:", error);
        const err = error as { message?: string };
        return NextResponse.json({ error: err.message || "Failed to update customer" }, { status: 500 });
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

        // 2. Fetch customer to verify ownership
        const customerRef = adminDb.collection("customers").doc(id);
        const customerDoc = await customerRef.get();

        if (!customerDoc.exists) {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }

        const customerData = customerDoc.data();
        const customerOrgId = customerData?.orgId;

        // 3. Enforce orgId match
        if (auth.orgId && auth.orgId !== customerOrgId) {
            return NextResponse.json({ error: "Organization mismatch" }, { status: 403 });
        }

        // 4. Entitlement Check
        const { TenantEntitlements } = await import("@/lib/entitlements/tenantEntitlements");
        try {
            await TenantEntitlements.ensureWriteAccess(customerOrgId);
        } catch (error: unknown) {
            const err = error as { message?: string; code?: string };
            return NextResponse.json(
                { error: err.message || "Write access denied", code: err.code },
                { status: 403 }
            );
        }

        // 5. Delete Customer
        await customerRef.delete();

        // Optionally: Also delete related contacts?
        // For now, we leave them orphaned or handle via cascading logic elsewhere.

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Error deleting customer:", error);
        const err = error as { message?: string };
        return NextResponse.json({ error: err.message || "Failed to delete customer" }, { status: 500 });
    }
}
