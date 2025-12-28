import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

export interface VerifiedUser {
    uid: string;
    email: string;
    role: string;
    orgId: string;
    isAdmin: boolean;
    isSuperAdmin: boolean;
}

/**
 * Verify that the request is from an authenticated admin user.
 * Checks Firebase ID token and verifies admin/owner role in Firestore.
 */
export async function verifyAdmin(request: NextRequest): Promise<VerifiedUser> {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
        throw new Error("Missing or invalid authorization header");
    }

    const idToken = authHeader.split("Bearer ")[1];

    // Verify the ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email || "";

    // Get user document from Firestore
    const userDoc = await adminDb.collection("users").doc(uid).get();

    if (!userDoc.exists) {
        throw new Error("User not found");
    }

    const userData = userDoc.data()!;
    const role = userData.role || "staff";
    const orgId = userData.orgId || userData.organizationId || "";

    const isAdmin = ["admin", "owner", "superadmin"].includes(role);
    const isSuperAdmin = role === "superadmin";

    if (!isAdmin) {
        throw new Error("Insufficient permissions: Admin role required");
    }

    return {
        uid,
        email,
        role,
        orgId,
        isAdmin,
        isSuperAdmin,
    };
}

/**
 * Verify that the request is from any authenticated user.
 */
export async function verifyAuth(request: NextRequest): Promise<VerifiedUser> {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
        throw new Error("Missing or invalid authorization header");
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email || "";

    const userDoc = await adminDb.collection("users").doc(uid).get();

    if (!userDoc.exists) {
        throw new Error("User not found");
    }

    const userData = userDoc.data()!;
    const role = userData.role || "staff";
    const orgId = userData.orgId || userData.organizationId || "";

    return {
        uid,
        email,
        role,
        orgId,
        isAdmin: ["admin", "owner", "superadmin"].includes(role),
        isSuperAdmin: role === "superadmin",
    };
}

/**
 * Helper to create error response for auth failures.
 */
export function authError(error: unknown): NextResponse {
    const message = error instanceof Error ? error.message : "Authentication failed";

    if (message.includes("Insufficient permissions")) {
        return NextResponse.json({ error: message }, { status: 403 });
    }

    return NextResponse.json({ error: message }, { status: 401 });
}
