import { NextRequest, NextResponse } from "next/server";
import { SAService } from "@/lib/services/sa-service";
import { requireSuperAdmin, requireRole } from "@/lib/auth/requireSuperAdmin";
import { SuperAdminRole } from "@/lib/rbac/super-admin";

export async function GET(req: NextRequest) {
    const auth = await requireSuperAdmin(req);
    if (!auth.success) return auth.response;

    // Role check: Only BillingAdmin or PlatformAdmin can access plans
    const roleError = requireRole(auth.user, [SuperAdminRole.BillingAdmin, SuperAdminRole.PlatformAdmin]);
    if (roleError) return roleError;

    try {
        const plans = await SAService.getPlans();
        return NextResponse.json({ plans });
    } catch (error: any) {
        console.error("SA Plans Error:", error);
        return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
    }
}
