import { NextRequest, NextResponse } from "next/server";
import { BillingService } from "@/lib/services/billing-service";
import { requireSuperAdmin, requireRole } from "@/lib/auth/requireSuperAdmin";
import { SuperAdminRole } from "@/lib/rbac/super-admin";
import { AddonStatus } from "@/lib/types/billing";

export async function GET(req: NextRequest) {
    const auth = await requireSuperAdmin(req);
    if (!auth.success) return auth.response;

    const roleError = requireRole(auth.user, [SuperAdminRole.BillingAdmin, SuperAdminRole.PlatformAdmin]);
    if (roleError) return roleError;

    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") as AddonStatus | null;

        const addons = await BillingService.getAddons({
            status: status || undefined
        });

        return NextResponse.json({ addons });
    } catch (error: any) {
        console.error("Get Addons Error:", error);
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

        if (!body.name || !body.type) {
            return NextResponse.json({ error: "Name and type are required" }, { status: 400 });
        }

        const addon = await BillingService.createAddon(body, auth.user.uid);
        return NextResponse.json({ addon }, { status: 201 });
    } catch (error: any) {
        console.error("Create Addon Error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
