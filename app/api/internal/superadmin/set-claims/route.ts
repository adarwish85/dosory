/**
 * =============================================================================
 * Internal API: Set Super Admin Custom Claims
 * =============================================================================
 * 
 * SECURITY: Protected by INTERNAL_ADMIN_SECRET header
 * 
 * This endpoint sets Firebase custom claims (isSuperAdmin, superRole) on a user.
 * 
 * USAGE (curl):
 * 
 *   curl -X POST http://localhost:3000/api/internal/superadmin/set-claims \
 *     -H "Content-Type: application/json" \
 *     -H "x-internal-admin-secret: YOUR_SECRET" \
 *     -d '{"email":"user@example.com","isSuperAdmin":true,"superRole":"PlatformAdmin"}'
 * 
 * ENVIRONMENT:
 *   INTERNAL_ADMIN_SECRET - Required secret for production; allows dev without in NODE_ENV=development
 */

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

// Valid super roles
const VALID_ROLES = ["PlatformAdmin", "ContentAdmin", "SupportAdmin", "ReadOnly"];

export async function POST(req: NextRequest) {
    try {
        // =====================================================================
        // Security Check
        // =====================================================================
        const secret = req.headers.get("x-internal-admin-secret");
        const expectedSecret = process.env.INTERNAL_ADMIN_SECRET;
        const isDev = process.env.NODE_ENV === "development";

        // In production, require the secret
        if (!isDev && !expectedSecret) {
            console.error("[set-claims] INTERNAL_ADMIN_SECRET not configured");
            return NextResponse.json(
                { error: "Server misconfiguration: admin secret not set" },
                { status: 500 }
            );
        }

        if (!isDev && secret !== expectedSecret) {
            console.warn("[set-claims] Unauthorized attempt with wrong/missing secret");
            return NextResponse.json(
                { error: "Forbidden: Invalid or missing admin secret" },
                { status: 403 }
            );
        }

        // Log dev mode access
        if (isDev && !secret) {
            console.log("[set-claims] Dev mode: bypassing secret check");
        }

        // =====================================================================
        // Parse Request
        // =====================================================================
        const body = await req.json();
        const { email, isSuperAdmin, superRole } = body;

        if (!email || typeof email !== "string") {
            return NextResponse.json(
                { error: "Missing or invalid 'email' field" },
                { status: 400 }
            );
        }

        if (typeof isSuperAdmin !== "boolean") {
            return NextResponse.json(
                { error: "'isSuperAdmin' must be a boolean" },
                { status: 400 }
            );
        }

        if (isSuperAdmin && (!superRole || !VALID_ROLES.includes(superRole))) {
            return NextResponse.json(
                { error: `Invalid 'superRole'. Must be one of: ${VALID_ROLES.join(", ")}` },
                { status: 400 }
            );
        }

        // =====================================================================
        // Get User by Email
        // =====================================================================
        let userRecord;
        try {
            userRecord = await adminAuth.getUserByEmail(email);
        } catch (error: any) {
            if (error.code === "auth/user-not-found") {
                return NextResponse.json(
                    { error: `User not found: ${email}` },
                    { status: 404 }
                );
            }
            throw error;
        }

        // =====================================================================
        // Set Custom Claims
        // =====================================================================
        const claims = {
            isSuperAdmin,
            superRole: isSuperAdmin ? superRole : null
        };

        await adminAuth.setCustomUserClaims(userRecord.uid, claims);

        console.log(`[set-claims] Set claims for ${email} (${userRecord.uid}):`, claims);

        // =====================================================================
        // Write Audit Log
        // =====================================================================
        try {
            await adminDb.collection("sa_audit_logs").add({
                action: "SET_CUSTOM_CLAIMS",
                actor: "system/internal",
                targetUid: userRecord.uid,
                targetEmail: email,
                claims,
                timestamp: new Date(),
                ip: req.headers.get("x-forwarded-for") || "unknown"
            });
        } catch (auditError) {
            console.error("[set-claims] Failed to write audit log:", auditError);
            // Don't fail the request for audit failure
        }

        // =====================================================================
        // Response
        // =====================================================================
        return NextResponse.json({
            success: true,
            uid: userRecord.uid,
            email: userRecord.email,
            claimsSet: claims,
            message: "Claims set successfully. User must refresh their ID token (re-login or getIdToken(true))."
        });

    } catch (error: any) {
        console.error("[set-claims] Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
