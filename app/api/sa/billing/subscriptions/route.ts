import { NextRequest, NextResponse } from "next/server";
import { BillingService } from "@/lib/services/billing-service";
import { requireSuperAdmin, requireRole } from "@/lib/auth/requireSuperAdmin";
import { SuperAdminRole } from "@/lib/rbac/super-admin";
import { SubscriptionStatus } from "@/lib/types/billing";

export async function GET(req: NextRequest) {
    const auth = await requireSuperAdmin(req);
    if (!auth.success) return auth.response;

    const roleError = requireRole(auth.user, [SuperAdminRole.BillingAdmin, SuperAdminRole.PlatformAdmin]);
    if (roleError) return roleError;

    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") as SubscriptionStatus | null;
        const planId = searchParams.get("planId") || undefined;
        const q = searchParams.get("q") || undefined;

        const subscriptions = await BillingService.getSubscriptions({
            status: status || undefined,
            planId,
            q
        });

        return NextResponse.json({ subscriptions });
    } catch (error: any) {
        console.error("Get Subscriptions Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
