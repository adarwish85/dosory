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
        const { action, addonId, quantity } = body;

        if (!action || !addonId) {
            return NextResponse.json({ error: "Action and addonId required" }, { status: 400 });
        }

        if (action === "add") {
            await BillingService.addAddonToSubscription(tenantId, addonId, quantity || 1, auth.user.uid);
        } else if (action === "remove") {
            await BillingService.removeAddonFromSubscription(tenantId, addonId, auth.user.uid);
        } else {
            return NextResponse.json({ error: "Invalid action. Use 'add' or 'remove'" }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Subscription Addon Error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
