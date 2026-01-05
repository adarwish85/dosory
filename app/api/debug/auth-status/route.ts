import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

/**
 * GET /api/debug/auth-status
 *
 * Debug endpoint to check user's authentication status, token claims,
 * Firestore profile, and subscription status.
 *
 * Usage: Call from browser console:
 * fetch('/api/debug/auth-status', {
 *   headers: { Authorization: `Bearer ${await firebase.auth().currentUser.getIdToken()}` }
 * }).then(r => r.json()).then(console.log)
 */
export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];

        // 1. Decode and verify token
        const decodedToken = await adminAuth.verifyIdToken(token);
        const uid = decodedToken.uid;

        // 2. Extract all relevant claims
        const tokenClaims = {
            uid,
            email: decodedToken.email,
            orgId: decodedToken.orgId || null,
            role: decodedToken.role || null,
            isSuperAdmin: decodedToken.isSuperAdmin || false,
            aud: decodedToken.aud,
            iat: new Date(decodedToken.iat * 1000).toISOString(),
            exp: new Date(decodedToken.exp * 1000).toISOString(),
        };

        // 3. Get Firestore user profile
        let firestoreProfile = null;
        try {
            const userDoc = await adminDb.collection("users").doc(uid).get();
            if (userDoc.exists) {
                const data = userDoc.data();
                firestoreProfile = {
                    orgId: data?.orgId || data?.organizationId || null,
                    role: data?.role || null,
                    email: data?.email || null,
                    createdAt: data?.createdAt?.toDate?.()?.toISOString() || null,
                };
            }
        } catch (e) {
            firestoreProfile = { error: (e as Error).message };
        }

        // 4. Check subscription status
        let subscriptionStatus = null;
        const effectiveOrgId = tokenClaims.orgId || firestoreProfile?.orgId;
        if (effectiveOrgId) {
            try {
                const subDoc = await adminDb.collection("subscriptions").doc(effectiveOrgId).get();
                if (subDoc.exists) {
                    const data = subDoc.data();
                    subscriptionStatus = {
                        exists: true,
                        status: data?.status || "unknown",
                        planId: data?.planId || null,
                        expiresAt: data?.expiresAt?.toDate?.()?.toISOString() || null,
                    };
                } else {
                    subscriptionStatus = { exists: false, message: "No subscription document found" };
                }
            } catch (e) {
                subscriptionStatus = { error: (e as Error).message };
            }
        } else {
            subscriptionStatus = { error: "No orgId available to check subscription" };
        }

        // 5. Summary diagnosis
        const diagnosis = {
            tokenHasOrgId: !!tokenClaims.orgId,
            profileHasOrgId: !!firestoreProfile?.orgId,
            claimsMismatch: tokenClaims.orgId !== firestoreProfile?.orgId,
            hasSubscription: !!subscriptionStatus?.exists,
            needsClaimsSync: !tokenClaims.orgId && !!firestoreProfile?.orgId,
        };

        return NextResponse.json({
            tokenClaims,
            firestoreProfile,
            effectiveOrgId,
            subscriptionStatus,
            diagnosis,
        });
    } catch (error: unknown) {
        console.error("Debug auth error:", error);
        return NextResponse.json(
            {
                error: (error as Error).message || "Auth verification failed",
            },
            { status: 500 }
        );
    }
}
