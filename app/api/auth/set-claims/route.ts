import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

/**
 * POST /api/auth/set-claims
 *
 * Sets a user's Firebase custom claims (orgId, role) for Firestore rule evaluation.
 * Called by signup (org-creation) and by the auth/profile providers' claim-sync.
 *
 * SECURITY (Stage 3.0.7): previously unauthenticated and trusted body.orgId/body.role —
 * anyone could grant any user any tenant's claims, defeating multi-tenant isolation.
 * Now:
 *   1. Requires a verified Firebase ID token (Authorization: Bearer <idToken>).
 *   2. Enforces uid === token.uid — a caller may only set THEIR OWN claims.
 *   3. Derives orgId/role from the forgery-resistant `staff` doc (protected by the
 *      staff-create rules), NOT from the request body. Body orgId/role are advisory
 *      only and never flow into setCustomUserClaims.
 *
 * Body: { uid: string, orgId?: string, role?: string }  (orgId/role ignored — see above)
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Require Authorization: Bearer <idToken>
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { error: "Unauthorized: Missing or invalid authorization header" },
                { status: 401 }
            );
        }
        const token = authHeader.substring(7); // strip "Bearer "

        // 2. Verify the token (plain ID-token verification — no impersonation, no SA requirement)
        let decoded;
        try {
            decoded = await adminAuth.verifyIdToken(token);
        } catch {
            return NextResponse.json({ error: "Unauthorized: Invalid or expired token" }, { status: 401 });
        }

        // 3. Caller may only set their OWN claims
        const body = await request.json().catch(() => ({}));
        const { uid } = body as { uid?: string };
        if (!uid || uid !== decoded.uid) {
            return NextResponse.json({ error: "Forbidden: You may only set your own claims" }, { status: 403 });
        }

        // 4. Derive orgId/role from the forgery-resistant staff doc (NOT the body).
        //    Primary: staff where authUid == caller uid.
        let staffData: FirebaseFirestore.DocumentData | null = null;

        const byAuthUid = await adminDb.collection("staff").where("authUid", "==", decoded.uid).limit(1).get();
        if (!byAuthUid.empty) {
            staffData = byAuthUid.docs[0].data();
        } else if (decoded.email) {
            // Fallback for legacy docs missing authUid: match by staff doc ID (= lowercased email).
            // The verified token's email matching the doc ID IS the authorization for backfilling
            // authUid — we do NOT backfill on any weaker condition.
            const emailId = decoded.email.toLowerCase();
            const byEmail = await adminDb.collection("staff").doc(emailId).get();
            if (byEmail.exists) {
                staffData = byEmail.data() || null;
                await adminDb.collection("staff").doc(emailId).update({ authUid: decoded.uid });
            }
        }

        if (!staffData) {
            return NextResponse.json({ error: "Forbidden: No membership found" }, { status: 403 });
        }

        // 5. Claim values derived from the staff doc, mirroring the existing claim shape.
        //    role is the binary admin/staff distinction the rules check (role == 'admin'),
        //    matching what create-staff sets server-side (isAdmin ? "admin" : "staff").
        const derivedOrgId: string | undefined = staffData.orgId;
        const derivedRole = staffData.isAdmin === true ? "admin" : "staff";

        // 6. orgId is the isolation key — must be present
        if (!derivedOrgId) {
            return NextResponse.json({ error: "Forbidden: Membership has no organization" }, { status: 403 });
        }

        // 7. Set claims from staff-derived values only (body orgId/role never used here)
        await adminAuth.setCustomUserClaims(decoded.uid, {
            orgId: derivedOrgId,
            role: derivedRole,
            updatedAt: Date.now(),
        });

        console.log(`✅ Set claims for ${decoded.uid}: orgId=${derivedOrgId}, role=${derivedRole}`);

        return NextResponse.json({
            success: true,
            message: "Claims set successfully",
        });
    } catch (error: unknown) {
        console.error("Error setting claims:", error);
        return NextResponse.json({ error: (error as Error).message || "Failed to set claims" }, { status: 500 });
    }
}
