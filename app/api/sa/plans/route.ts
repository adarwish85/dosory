import { NextRequest, NextResponse } from "next/server";
import { SAService } from "@/lib/services/sa-service";

export async function GET(req: NextRequest) {
    try {
        const plans = await SAService.getPlans();
        return NextResponse.json({ plans });
    } catch (error: any) {
        console.error("SA Plans Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch plans" },
            { status: 500 }
        );
    }
}
