import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

/**
 * POST /api/auth/set-claims
 *
 * Sets custom claims for a newly registered user.
 * Called immediately after signup to set orgId and role.
 *
 * Body: { uid: string, orgId: string, role: string }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { uid, orgId, role } = body;

        if (!uid || !orgId || !role) {
            return NextResponse.json({ error: "Missing required fields: uid, orgId, role" }, { status: 400 });
        }

        // Verify the user exists
        const userRecord = await adminAuth.getUser(uid);
        if (!userRecord) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Set custom claims
        await adminAuth.setCustomUserClaims(uid, {
            orgId,
            role,
            updatedAt: Date.now(),
        });

        console.log(`✅ Set claims for ${uid}: orgId=${orgId}, role=${role}`);

        return NextResponse.json({
            success: true,
            message: "Claims set successfully",
        });
    } catch (error: unknown) {
        console.error("Error setting claims:", error);
        return NextResponse.json({ error: (error as Error).message || "Failed to set claims" }, { status: 500 });
    }
}
