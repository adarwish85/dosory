import { NextRequest, NextResponse } from "next/server";
import { SAService } from "@/lib/services/sa-service";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";

export async function GET(req: NextRequest) {
    // Enforce Super Admin authentication
    const auth = await requireSuperAdmin(req);
    if (!auth.success) return auth.response;

    try {
        const stats = await SAService.getOverviewStats();
        return NextResponse.json(stats);
    } catch (error: any) {
        console.error("SA Overview Error:", error);
        return NextResponse.json({ error: "Failed to fetch overview" }, { status: 500 });
    }
}
