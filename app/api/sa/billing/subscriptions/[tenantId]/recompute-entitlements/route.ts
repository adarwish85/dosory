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

        if (!entitlements) {
            return NextResponse.json({ error: "Could not compute entitlements" }, { status: 400 });
        }

        return NextResponse.json({ entitlements });
    } catch (error: any) {
        console.error("Recompute Entitlements Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
