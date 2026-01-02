import { NextRequest, NextResponse } from "next/server";
import { SAService } from "@/lib/services/sa-service";

export async function GET(req: NextRequest) {
    try {
        const stats = await SAService.getOverviewStats();
        return NextResponse.json(stats);
    } catch (error: any) {
        console.error("SA Overview Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch overview stats" },
            { status: 500 }
        );
    }
}
