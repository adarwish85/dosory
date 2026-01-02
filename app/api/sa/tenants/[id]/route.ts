import { NextRequest, NextResponse } from "next/server";
import { SAService } from "@/lib/services/sa-service";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const tenant = await SAService.getTenant(id);

        if (!tenant) {
            return NextResponse.json(
                { error: "Tenant not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(tenant);
    } catch (error: any) {
        console.error("SA Tenant Detail Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch tenant" },
            { status: 500 }
        );
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { status, actorId } = body;

        if (!status || !actorId) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        await SAService.updateTenantStatus(id, status, actorId);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("SA Tenant Update Error:", error);
        return NextResponse.json(
            { error: "Failed to update tenant" },
            { status: 500 }
        );
    }
}
