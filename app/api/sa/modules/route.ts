import { NextRequest, NextResponse } from "next/server";
import { SAService } from "@/lib/services/sa-service";
import { requireSuperAdmin, requireRole } from "@/lib/auth/requireSuperAdmin";
import { SuperAdminRole } from "@/lib/rbac/super-admin";

export async function GET(req: NextRequest) {
    const auth = await requireSuperAdmin(req);
    if (!auth.success) return auth.response;

    try {
        const modules = await SAService.getModules();
        return NextResponse.json({ modules });
    } catch (error: any) {
        console.error("SA Modules Error:", error);
        return NextResponse.json({ error: "Failed to fetch modules" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const auth = await requireSuperAdmin(req);
    if (!auth.success) return auth.response;

    // Role check: Only PlatformAdmin can toggle modules
    const roleError = requireRole(auth.user, [SuperAdminRole.PlatformAdmin]);
    if (roleError) return roleError;

    try {
        const body = await req.json();
        const { moduleKey, isEnabled } = body;

        if (!moduleKey || typeof isEnabled !== "boolean") {
            return NextResponse.json({ error: "Missing moduleKey or isEnabled" }, { status: 400 });
        }

        await SAService.toggleModule(moduleKey, isEnabled, auth.user.uid);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("SA Module Toggle Error:", error);
        return NextResponse.json({ error: "Failed to toggle module" }, { status: 500 });
    }
}
