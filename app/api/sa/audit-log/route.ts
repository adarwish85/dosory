import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import { AuditService } from "@/lib/services/audit-service";

/**
 * POST /api/sa/audit-log
 * 
 * Create an audit log entry from client-side services.
 * This allows client components to log audit events without
 * importing firebase-admin directly.
 */
export async function POST(req: NextRequest) {
    const auth = await requireSuperAdmin(req);
    if (!auth.success) return auth.response;

    try {
        const body = await req.json();
        const { action, targetType, targetId, userId, payload } = body;

        if (!action || !targetType || !targetId) {
            return NextResponse.json(
                { error: "Missing required fields: action, targetType, targetId" },
                { status: 400 }
            );
        }

        const logId = await AuditService.log({
            action,
            targetType,
            targetId,
            actorId: userId || auth.user.uid,
            actorRole: auth.user.superRole,
            payload: payload || {}
        });

        return NextResponse.json({ success: true, id: logId });
    } catch (error: any) {
        console.error("Audit log error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create audit log" },
            { status: 500 }
        );
    }
}
