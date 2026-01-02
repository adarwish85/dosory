import { NextRequest, NextResponse } from "next/server";
import { SAService } from "@/lib/services/sa-service";

export async function GET(req: NextRequest) {
    try {
        const logs = await SAService.getAuditLogs();
        return NextResponse.json({ logs });
    } catch (error: any) {
        console.error("SA Audit Logs Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch audit logs" },
            { status: 500 }
        );
    }
}
