import { NextRequest, NextResponse } from "next/server";
import { BillingService } from "@/lib/services/billing-service";
import { requireSuperAdmin, requireRole } from "@/lib/auth/requireSuperAdmin";
import { SuperAdminRole } from "@/lib/rbac/super-admin";
import { PlanStatus } from "@/lib/types/billing";

export async function GET(req: NextRequest) {
    const auth = await requireSuperAdmin(req);
    if (!auth.success) return auth.response;

    const roleError = requireRole(auth.user, [SuperAdminRole.BillingAdmin, SuperAdminRole.PlatformAdmin]);
    if (roleError) return roleError;

    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") as PlanStatus | null;
        const q = searchParams.get("q") || undefined;

        const plans = await BillingService.getPlans({
            status: status || undefined,
            q
        });

        return NextResponse.json({ plans });
    } catch (error: any) {
        console.error("Get Plans Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const auth = await requireSuperAdmin(req);
    if (!auth.success) return auth.response;

    const roleError = requireRole(auth.user, [SuperAdminRole.BillingAdmin, SuperAdminRole.PlatformAdmin]);
    if (roleError) return roleError;

    try {
        const body = await req.json();
        const plan = await BillingService.createPlan(body, auth.user.uid);
        return NextResponse.json({ plan }, { status: 201 });
    } catch (error: any) {
        console.error("Create Plan Error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
