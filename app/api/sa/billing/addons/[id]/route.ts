import { NextRequest, NextResponse } from "next/server";
import { BillingService } from "@/lib/services/billing-service";
import { requireSuperAdmin, requireRole } from "@/lib/auth/requireSuperAdmin";
import { SuperAdminRole } from "@/lib/rbac/super-admin";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireSuperAdmin(req);
    if (!auth.success) return auth.response;

    const roleError = requireRole(auth.user, [SuperAdminRole.BillingAdmin, SuperAdminRole.PlatformAdmin]);
    if (roleError) return roleError;

    try {
        const { id } = await params;
        const addon = await BillingService.getAddon(id);

        if (!addon) {
            return NextResponse.json({ error: "Addon not found" }, { status: 404 });
        }

        return NextResponse.json({ addon });
    } catch (error: any) {
        console.error("Get Addon Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireSuperAdmin(req);
    if (!auth.success) return auth.response;

    const roleError = requireRole(auth.user, [SuperAdminRole.BillingAdmin, SuperAdminRole.PlatformAdmin]);
    if (roleError) return roleError;

    try {
        const { id } = await params;
        const body = await req.json();

        await BillingService.updateAddon(id, body, auth.user.uid);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Update Addon Error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
