import { NextRequest, NextResponse } from "next/server";
import { SAService } from "@/lib/services/sa-service";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";

export async function GET(req: NextRequest) {
    const auth = await requireSuperAdmin(req);
    if (!auth.success) return auth.response;

    try {
        const users = await SAService.getUsers();
        return NextResponse.json({ users });
    } catch (error: any) {
        console.error("SA Users Error:", error);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}
