import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import admin from "@/lib/firebase-admin";
import { slugify } from "@/lib/utils/slugify";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // 1. Auth & Impersonation Check
        const { getAuthenticatedUser } = await import("@/lib/auth/getAuthenticatedUser");
        const auth = await getAuthenticatedUser(request);

        if (!auth.isAuthenticated || !auth.userId) {
            return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
        }

        // Get orgId from auth context or body
        const orgId = auth.orgId || body.orgId;
        if (!orgId) {
            return NextResponse.json({ error: "Organization ID required" }, { status: 400 });
        }

        // 2. Entitlement Check
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

        // 3. Create Customer
        const { orgId: _orgId, ...customerData } = body;

        const docRef = await adminDb.collection("customers").add({
            ...customerData,
            orgId,
            slug: slugify(customerData.company),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: auth.userId,
        });

        // 4. Update onboarding state (optional, silently fail)
        try {
            await adminDb
                .collection("users")
                .doc(auth.userId)
                .collection("onboarding")
                .doc("state")
                .update({ "steps.firstRecord": true });
        } catch {
            // Onboarding doc may not exist
        }

        return NextResponse.json({ success: true, id: docRef.id });
    } catch (error: unknown) {
        console.error("Error creating customer:", error);
        const err = error as { message?: string };
        return NextResponse.json({ error: err.message || "Failed to create customer" }, { status: 500 });
    }
}
