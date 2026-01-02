import { NextRequest, NextResponse } from "next/server";
import { SAService } from "@/lib/services/sa-service";

export async function GET(req: NextRequest) {
    try {
        const health = await SAService.getSystemHealth();
        return NextResponse.json({ services: health });
    } catch (error: any) {
        console.error("SA System Health Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch system health" },
            { status: 500 }
        );
    }
}
