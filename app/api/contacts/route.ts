import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import admin from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { customerId, ...contactData } = body;

        if (!customerId) {
            return NextResponse.json({ error: "Customer ID required" }, { status: 400 });
        }

        // 1. Auth Check
        const { getAuthenticatedUser } = await import("@/lib/auth/getAuthenticatedUser");
        const auth = await getAuthenticatedUser(request);

        if (!auth.isAuthenticated || !auth.userId) {
            return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
        }

        // 2. Verify parent customer ownership
        const customerDoc = await adminDb.collection("customers").doc(customerId).get();
        if (!customerDoc.exists) {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }

        const customerOrgId = customerDoc.data()?.orgId;

        // Enforce orgId match
        if (auth.orgId && auth.orgId !== customerOrgId) {
            return NextResponse.json({ error: "Organization mismatch" }, { status: 403 });
        }

        const orgId = customerOrgId || auth.orgId;

        // 3. Entitlement Check
        const { TenantEntitlements } = await import("@/lib/entitlements/tenantEntitlements");
        try {
            await TenantEntitlements.ensureWriteAccess(orgId);
        } catch (error: unknown) {
            const err = error as { message?: string; code?: string };
            return NextResponse.json(
                { error: err.message || "Write access denied", code: err.code },
                { status: 403 }
            );
        }

        // 4. Create Contact
        const docRef = await adminDb.collection("contacts").add({
            ...contactData,
            customerId,
            orgId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: auth.userId,
        });

        return NextResponse.json({ success: true, id: docRef.id });
    } catch (error: unknown) {
        console.error("Error creating contact:", error);
        const err = error as { message?: string };
        return NextResponse.json({ error: err.message || "Failed to create contact" }, { status: 500 });
    }
}
