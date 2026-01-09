import { NextRequest, NextResponse } from "next/server";
import { BillingService } from "@/lib/services/billing-service";
import { requireSuperAdmin, requireRole } from "@/lib/auth/requireSuperAdmin";
import { SuperAdminRole } from "@/lib/rbac/super-admin";

export async function GET(req: NextRequest) {
    const auth = await requireSuperAdmin(req);
    if (!auth.success) return auth.response;

    const roleError = requireRole(auth.user, [SuperAdminRole.BillingAdmin, SuperAdminRole.PlatformAdmin]);
    if (roleError) return roleError;

    try {
        const exceeded = await BillingService.getTenantsExceedingLimits();
        return NextResponse.json({ exceeded });
    } catch (error: any) {
        console.error("Get Exceeded Limits Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
