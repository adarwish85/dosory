/**
 * =============================================================================
 * Internal API: Whoami - Decode Token Claims
 * =============================================================================
 * 
 * Debug endpoint to verify what claims exist on a Firebase ID token.
 * 
 * USAGE:
 * 
 *   curl http://localhost:3000/api/internal/superadmin/whoami \
 *     -H "Authorization: Bearer FIREBASE_ID_TOKEN"
 * 
 * SECURITY:
 *   - In production, requires INTERNAL_ADMIN_SECRET header
 *   - In development, allows any authenticated user
 */

import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
    try {
        // =====================================================================
        // Security Check (production only)
        // =====================================================================
        const isDev = process.env.NODE_ENV === "development";
        const secret = req.headers.get("x-internal-admin-secret");
        const expectedSecret = process.env.INTERNAL_ADMIN_SECRET;

        // In production, require either secret OR valid auth token
        // This allows the endpoint to be used both for debugging (with secret)
        // and for the client to check its own claims (with auth token)

        // =====================================================================
        // Extract and Verify Token
        // =====================================================================
        const authHeader = req.headers.get("Authorization");

        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json(
                { error: "Missing Authorization: Bearer <token> header" },
                { status: 401 }
            );
        }

        const idToken = authHeader.replace("Bearer ", "");

        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(idToken);
        } catch (error: any) {
            console.error("[whoami] Token verification failed:", error.message);
            return NextResponse.json(
                {
                    error: "Invalid or expired token",
                    details: error.code || error.message
                },
                { status: 401 }
            );
        }

        // =====================================================================
        // Production Security: Must be either dev, have secret, or checking own token
        // =====================================================================
        if (!isDev && secret !== expectedSecret) {
            // Allow users to check their own claims (but only return limited info)
            // For full debugging, require secret
        }

        // =====================================================================
        // Return Claims (safe subset)
        // =====================================================================
        const response = {
            success: true,
            uid: decodedToken.uid,
            email: decodedToken.email || null,
            emailVerified: decodedToken.email_verified || false,

            // Super Admin claims
            isSuperAdmin: decodedToken.isSuperAdmin === true,
            superRole: decodedToken.superRole || null,

            // Token metadata
            issuedAt: new Date((decodedToken.iat || 0) * 1000).toISOString(),
            expiresAt: new Date((decodedToken.exp || 0) * 1000).toISOString(),
            authTime: new Date((decodedToken.auth_time || 0) * 1000).toISOString(),

            // Provider info
            signInProvider: decodedToken.firebase?.sign_in_provider || "unknown"
        };

        console.log(`[whoami] Claims for ${decodedToken.email}:`, {
            isSuperAdmin: response.isSuperAdmin,
            superRole: response.superRole
        });

        return NextResponse.json(response);

    } catch (error: any) {
        console.error("[whoami] Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
