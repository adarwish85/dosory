import { NextRequest, NextResponse } from "next/server";
import { SAService } from "@/lib/services/sa-service";

export async function GET(req: NextRequest) {
    try {
        const modules = await SAService.getModules();
        return NextResponse.json({ modules });
    } catch (error: any) {
        console.error("SA Modules Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch modules" },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { moduleKey, isEnabled, actorId } = body;

        if (!moduleKey || typeof isEnabled !== "boolean" || !actorId) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        await SAService.toggleModule(moduleKey, isEnabled, actorId);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("SA Module Toggle Error:", error);
        return NextResponse.json(
            { error: "Failed to update module" },
            { status: 500 }
        );
    }
}
