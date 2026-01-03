import { NextRequest, NextResponse } from "next/server";
import { SAService } from "@/lib/services/sa-service";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireSuperAdmin(req);
    if (!auth.success) return auth.response;

    try {
        const { id } = await params;
        const body = await req.json();
        const { status } = body;

        if (!status) {
            return NextResponse.json({ error: "Status required" }, { status: 400 });
        }

        await SAService.updateUserStatus(id, status, auth.user.uid);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("SA User Status Error:", error);
        return NextResponse.json({ error: "Failed to update user status" }, { status: 500 });
    }
}
