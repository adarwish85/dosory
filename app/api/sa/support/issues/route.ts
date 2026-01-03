import { NextRequest, NextResponse } from "next/server";
import { SAService } from "@/lib/services/sa-service";
import { requireSuperAdmin, requireRole } from "@/lib/auth/requireSuperAdmin";
import { SuperAdminRole } from "@/lib/rbac/super-admin";

export async function GET(req: NextRequest) {
    const auth = await requireSuperAdmin(req);
    if (!auth.success) return auth.response;

    // Role check: SupportAgent, SecurityAdmin, or PlatformAdmin can access support issues
    const roleError = requireRole(auth.user, [
        SuperAdminRole.SupportAgent,
        SuperAdminRole.SecurityAdmin,
        SuperAdminRole.PlatformAdmin
    ]);
    if (roleError) return roleError;

    try {
        const issues = await SAService.getSupportIssues();
        return NextResponse.json({ issues });
    } catch (error: any) {
        console.error("SA Support Issues Error:", error);
        return NextResponse.json({ error: "Failed to fetch support issues" }, { status: 500 });
    }
}
