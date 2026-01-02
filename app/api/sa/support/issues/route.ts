import { NextRequest, NextResponse } from "next/server";
import { SAService } from "@/lib/services/sa-service";

export async function GET(req: NextRequest) {
    try {
        const issues = await SAService.getSupportIssues();
        return NextResponse.json({ issues });
    } catch (error: any) {
        console.error("SA Support Issues Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch support issues" },
            { status: 500 }
        );
    }
}
