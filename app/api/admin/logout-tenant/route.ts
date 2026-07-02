import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";

export async function POST(req: NextRequest) {
    // Force-logging-out every user of an arbitrary tenant is a platform operation —
    // Super Admin only. Previously unauthenticated (anyone could DoS any tenant).
    const authResult = await requireSuperAdmin(req);
    if (!authResult.success) return authResult.response;

    try {
        const body = await req.json();
        const { tenantId } = body;

        if (!tenantId) {
            return NextResponse.json({ error: "Missing tenantId" }, { status: 400 });
        }

        // 1. Get all users for this tenant
        const usersSnapshot = await adminDb.collection("users").where("orgId", "==", tenantId).get();

        if (usersSnapshot.empty) {
            return NextResponse.json({ success: true, count: 0, message: "No users found for this tenant" });
        }

        const logoutPromises = usersSnapshot.docs.map(async (doc) => {
            const uid = doc.id;
            try {
                // Revoke refresh tokens (effectively logging them out)
                await adminAuth.revokeRefreshTokens(uid);
                return true;
            } catch (err) {
                console.error(`Failed to revoke token for user ${uid}`, err);
                return false;
            }
        });

        const results = await Promise.all(logoutPromises);
        const successCount = results.filter((r) => r).length;

        return NextResponse.json({
            success: true,
            count: successCount,
            total: usersSnapshot.size,
        });
    } catch (error) {
        console.error("Error forcing logout:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
