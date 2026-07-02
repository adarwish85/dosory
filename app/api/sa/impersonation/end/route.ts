import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import { ImpersonationService } from "@/lib/impersonation/impersonationService";

export async function POST(req: NextRequest) {
    // Mirror impersonation/start: ending an impersonation session is a Super Admin
    // operation. Previously unauthenticated (anyone could end any active session).
    const authResult = await requireSuperAdmin(req);
    if (!authResult.success) return authResult.response;

    try {
        // We can end session by ID provided in body, or the one in the header
        const body = await req.json().catch(() => ({}));
        const headerSessionId = req.headers.get("x-impersonation-session-id");

        const sessionId = body.sessionId || headerSessionId;

        if (!sessionId) {
            return NextResponse.json({ error: "Session ID required" }, { status: 400 });
        }

        await ImpersonationService.endSession(sessionId, "manual");

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
