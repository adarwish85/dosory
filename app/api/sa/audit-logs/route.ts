import { NextRequest, NextResponse } from "next/server";
import { SAService } from "@/lib/services/sa-service";
import { requireSuperAdmin, requireRole } from "@/lib/auth/requireSuperAdmin";
import { SuperAdminRole } from "@/lib/rbac/super-admin";

export async function GET(req: NextRequest) {
    const auth = await requireSuperAdmin(req);
    if (!auth.success) return auth.response;

    // Role check: Only SecurityAdmin or PlatformAdmin can access audit logs
    const roleError = requireRole(auth.user, [SuperAdminRole.SecurityAdmin, SuperAdminRole.PlatformAdmin]);
    if (roleError) return roleError;

    try {
        const logs = await SAService.getAuditLogs();
        return NextResponse.json({ logs });
    } catch (error: any) {
        console.error("SA Audit Logs Error:", error);
        return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
    }
}
