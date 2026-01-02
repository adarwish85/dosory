import { NextRequest, NextResponse } from "next/server";
import { SAService } from "@/lib/services/sa-service";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { isSuperAdmin, actorId } = body;

        if (typeof isSuperAdmin !== "boolean" || !actorId) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        await SAService.toggleSuperAdmin(id, isSuperAdmin, actorId);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("SA Toggle SuperAdmin Error:", error);
        return NextResponse.json(
            { error: "Failed to update super admin status" },
            { status: 500 }
        );
    }
}
