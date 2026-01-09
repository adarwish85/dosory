import { NextRequest, NextResponse } from "next/server";
import { SAService } from "@/lib/services/sa-service";
import { requireSuperAdmin, requireRole } from "@/lib/auth/requireSuperAdmin";
import { SuperAdminRole } from "@/lib/rbac/super-admin";

export async function GET(req: NextRequest) {
    const auth = await requireSuperAdmin(req);
    if (!auth.success) return auth.response;

    // Role check: SecurityAdmin or PlatformAdmin can access system health
    const roleError = requireRole(auth.user, [
        SuperAdminRole.SecurityAdmin,
        SuperAdminRole.PlatformAdmin
    ]);
    if (roleError) return roleError;

    try {
        const services = await SAService.getSystemHealth();
        return NextResponse.json({ services });
    } catch (error: any) {
        console.error("SA System Health Error:", error);
        return NextResponse.json({ error: "Failed to fetch system health" }, { status: 500 });
    }
}
