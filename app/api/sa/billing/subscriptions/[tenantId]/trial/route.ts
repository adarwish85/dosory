import { NextRequest, NextResponse } from "next/server";
import { BillingService } from "@/lib/services/billing-service";
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
        const body = await req.json();
        const { days } = body;

        if (!days || typeof days !== "number" || days <= 0) {
            return NextResponse.json({ error: "Valid days number required" }, { status: 400 });
        }

        await BillingService.startTrial(tenantId, days, auth.user.uid);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Start Trial Error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
