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
        const tenant = await SAService.getTenant(id);

        if (!tenant) {
            return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
        }

        return NextResponse.json({ tenant });
    } catch (error: any) {
        console.error("SA Tenant Detail Error:", error);
        return NextResponse.json({ error: "Failed to fetch tenant" }, { status: 500 });
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
        const { ...updates } = body;

        // Use authenticated user's UID as actor
        await SAService.updateTenant(id, updates, auth.user.uid);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("SA Tenant Update Error:", error);
        return NextResponse.json({ error: "Failed to update tenant" }, { status: 500 });
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
        await SAService.deleteTenant(id, auth.user.uid);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("SA Tenant Delete Error:", error);
        return NextResponse.json({ error: "Failed to delete tenant" }, { status: 500 });
    }
}
