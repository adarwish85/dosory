import { NextRequest, NextResponse } from "next/server";
import { EntitlementService } from "@/lib/services/entitlement-service";
import { requireSuperAdmin, requireRole } from "@/lib/auth/requireSuperAdmin";
import { SuperAdminRole } from "@/lib/rbac/super-admin";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ tenantId: string }> }
) {
    const auth = await requireSuperAdmin(req);
    if (!auth.success) return auth.response;

    const roleError = requireRole(auth.user, [SuperAdminRole.BillingAdmin, SuperAdminRole.PlatformAdmin]);
    if (roleError) return roleError;

    try {
        const { tenantId } = await params;
        const entitlements = await EntitlementService.resolveTenantEntitlements(tenantId);

        return NextResponse.json({
            success: true,
            entitlements
        });
    } catch (error: any) {
        console.error("Recompute Usage Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
