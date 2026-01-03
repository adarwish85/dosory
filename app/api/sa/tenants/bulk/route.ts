import { NextRequest, NextResponse } from "next/server";
import { SAService } from "@/lib/services/sa-service";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { ids, action, actorId, value } = body;

        if (!Array.isArray(ids) || ids.length === 0 || !action || !actorId) {
            return NextResponse.json(
                { error: "Missing required fields: ids, action, actorId" },
                { status: 400 }
            );
        }

        let processed = 0;

        for (const id of ids) {
            try {
                switch (action) {
                    case "delete":
                        await SAService.deleteTenant(id, actorId);
                        break;
                    case "activate":
                        await SAService.updateTenantStatus(id, "active", actorId);
                        break;
                    case "suspend":
                        await SAService.updateTenantStatus(id, "suspended", actorId);
                        break;
                    case "trial":
                        await SAService.updateTenantStatus(id, "trial", actorId);
                        break;
                    case "cancel":
                        await SAService.updateTenantStatus(id, "cancelled", actorId);
                        break;
                    default:
                        continue;
                }
                processed++;
            } catch (e) {
                console.error(`Bulk tenant action failed for ID ${id}:`, e);
            }
        }

        return NextResponse.json({ success: true, processed });
    } catch (error: any) {
        console.error("SA Tenants Bulk Action Error:", error);
        return NextResponse.json(
            { error: "Failed to perform bulk action" },
            { status: 500 }
        );
    }
}
