import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { BillingService } from "@/lib/services/billing-service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
    // Internal service-to-service route (no UI caller). Gate with the shared-secret
    // header used by /api/internal/superadmin/set-claims. Deny-by-default: a missing/wrong
    // secret OR an unconfigured INTERNAL_ADMIN_SECRET both return 403 (fails closed, and —
    // unlike set-claims — no NODE_ENV=development bypass, so the gate is locally verifiable).
    const secret = request.headers.get("x-internal-admin-secret");
    const expectedSecret = process.env.INTERNAL_ADMIN_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
        return NextResponse.json({ error: "Forbidden: invalid or missing internal secret" }, { status: 403 });
    }

    try {
        const { tenantId } = await params;

        if (!tenantId) {
            return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
        }

        // Recompute Users Count
        // Counting docs in 'staff' collection for this org
        const staffSnapshot = await adminDb
            .collection("staff")
            .where("orgId", "==", tenantId)
            // .where("status", "==", "active") // Optional: only count active staff?
            .count()
            .get();

        const usersCount = staffSnapshot.data().count;

        // Recompute Storage (Placeholder logic)
        // Ideally we would aggregate size from a 'files' collection
        // const filesSnapshot = ...
        // const storageUsedGB = ...

        // Using existing storage usage to avoid resetting to 0 if we can't calc it
        const currentUsage = await BillingService.getTenantUsage(tenantId);
        const storageUsedGB = currentUsage?.storageUsedGB || 0;

        // Update usage
        await BillingService.updateTenantUsage(tenantId, {
            usersCount,
            storageUsedGB,
        });

        return NextResponse.json({
            success: true,
            tenantId,
            computed: {
                usersCount,
                storageUsedGB,
            },
        });
    } catch (error) {
        console.error("Recompute Usage Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
