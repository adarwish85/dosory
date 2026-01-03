
import { NextRequest, NextResponse } from "next/server";
import { ImpersonationService } from "@/lib/impersonation/impersonationService";

export async function POST(req: NextRequest) {
    try {
        // We can end session by ID provided in body, or the one in the header
        const body = await req.json().catch(() => ({}));
        const headerSessionId = req.headers.get("x-impersonation-session-id");

        let sessionId = body.sessionId || headerSessionId;

        if (!sessionId) {
            return NextResponse.json({ error: "Session ID required" }, { status: 400 });
        }

        await ImpersonationService.endSession(sessionId, "manual");

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
