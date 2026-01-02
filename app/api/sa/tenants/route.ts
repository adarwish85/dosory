import { NextRequest, NextResponse } from "next/server";
import { SAService } from "@/lib/services/sa-service";

export async function GET(req: NextRequest) {
    try {
        const tenants = await SAService.getTenants();
        return NextResponse.json({ tenants });
    } catch (error: any) {
        console.error("SA Tenants Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch tenants" },
            { status: 500 }
        );
    }
}
