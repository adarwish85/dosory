import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { BillingService } from "@/lib/services/billing-service";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ tenantId: string }> }
) {
    try {
        const { tenantId } = await params;

        // Basic auth check (should be enhanced for production internal APIs)
        // For now, assuming this is called by admin or secure task

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
            storageUsedGB
        });

        return NextResponse.json({
            success: true,
            tenantId,
            computed: {
                usersCount,
                storageUsedGB
            }
        });

    } catch (error: any) {
        console.error("Recompute Usage Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
