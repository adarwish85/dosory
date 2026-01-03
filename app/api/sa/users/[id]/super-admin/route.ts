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
        const { isSuperAdmin } = body;

        if (typeof isSuperAdmin !== "boolean") {
            return NextResponse.json({ error: "isSuperAdmin boolean required" }, { status: 400 });
        }

        await SAService.toggleSuperAdmin(id, isSuperAdmin, auth.user.uid);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("SA Toggle SuperAdmin Error:", error);
        return NextResponse.json({ error: "Failed to update super admin status" }, { status: 500 });
    }
}
