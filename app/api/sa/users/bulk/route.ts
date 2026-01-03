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
                        await SAService.deleteUser(id, actorId);
                        break;
                    case "block":
                        await SAService.updateUserStatus(id, "blocked", actorId);
                        break;
                    case "activate":
                        await SAService.updateUserStatus(id, "active", actorId);
                        break;
                    case "grant_super_admin":
                        await SAService.toggleSuperAdmin(id, true, actorId);
                        break;
                    case "revoke_super_admin":
                        await SAService.toggleSuperAdmin(id, false, actorId);
                        break;
                    default:
                        continue;
                }
                processed++;
            } catch (e) {
                console.error(`Bulk user action failed for ID ${id}:`, e);
            }
        }

        return NextResponse.json({ success: true, processed });
    } catch (error: any) {
        console.error("SA Users Bulk Action Error:", error);
        return NextResponse.json(
            { error: "Failed to perform bulk action" },
            { status: 500 }
        );
    }
}
