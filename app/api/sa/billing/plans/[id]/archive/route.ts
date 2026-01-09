import { NextRequest, NextResponse } from "next/server";
import { BillingService } from "@/lib/services/billing-service";
import { requireSuperAdmin, requireRole } from "@/lib/auth/requireSuperAdmin";
import { SuperAdminRole } from "@/lib/rbac/super-admin";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireSuperAdmin(req);
    if (!auth.success) return auth.response;

    const roleError = requireRole(auth.user, [SuperAdminRole.BillingAdmin, SuperAdminRole.PlatformAdmin]);
    if (roleError) return roleError;

    try {
        const { id } = await params;
        await BillingService.archivePlan(id, auth.user.uid);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Archive Plan Error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
