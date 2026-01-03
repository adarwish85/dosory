import { NextRequest, NextResponse } from "next/server";
import { SAService } from "@/lib/services/sa-service";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireSuperAdmin(req);
    if (!auth.success) return auth.response;

    try {
        const { id } = await params;
        const user = await SAService.getUser(id);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        return NextResponse.json({ user });
    } catch (error: any) {
        console.error("SA User Detail Error:", error);
        return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireSuperAdmin(req);
    if (!auth.success) return auth.response;

    try {
        const { id } = await params;
        const body = await req.json();
        await SAService.updateUser(id, body, auth.user.uid);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("SA User Update Error:", error);
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireSuperAdmin(req);
    if (!auth.success) return auth.response;

    try {
        const { id } = await params;
        await SAService.deleteUser(id, auth.user.uid);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("SA User Delete Error:", error);
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}
