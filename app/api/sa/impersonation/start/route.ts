
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import { ImpersonationService } from "@/lib/impersonation/impersonationService";
import { SuperAdminRole } from "@/lib/rbac/super-admin";

export async function POST(req: NextRequest) {
    // 1. Verify Super Admin
    const authResult = await requireSuperAdmin(req);
    if (!authResult.success) return authResult.response;

    const { user } = authResult;

    try {
        const body = await req.json();
        const { tenantId, userId, reason } = body;

        if (!tenantId || !reason) {
            return NextResponse.json({ error: "Tenant ID and Reason are required" }, { status: 400 });
        }

        // 2. Access Control
        // BillingAdmin cannot impersonate
        if (user.superRole === SuperAdminRole.BillingAdmin) {
            return NextResponse.json({ error: "Billing Admins cannot impersonate" }, { status: 403 });
        }

        // ContentAdmin cannot impersonate
        if (user.superRole === SuperAdminRole.ContentAdmin) {
            return NextResponse.json({ error: "Content Admins cannot impersonate" }, { status: 403 });
        }

        // 3. Start Session
        const session = await ImpersonationService.startSession(
            user.uid,
            user.email,
            user.superRole,
            tenantId,
            reason,
            userId
        );

        return NextResponse.json({
            success: true,
            sessionId: session.id,
            session
        });

    } catch (error: any) {
        console.error("Start Impersonation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
