import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUser } from "@/lib/auth/getAuthenticatedUser";

// Subdomains that must never be claimed by a tenant (route/app collisions).
const RESERVED = new Set([
    "www",
    "app",
    "api",
    "admin",
    "dashboard",
    "sa",
    "superadmin",
    "mail",
    "smtp",
    "login",
    "signup",
    "auth",
    "status",
    "static",
    "cdn",
    "assets",
    "public",
    "pay",
    "billing",
    "portal",
    "support",
    "help",
    "docs",
    "blog",
    "dosory",
    "goalo",
]);

const VALID = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

/**
 * Subdomain availability check.
 *
 * Must run server-side: the `organizations` security rule is tenant-isolated
 * (`request.auth.token.orgId == orgId`), so a client-side collection query
 * `where("subdomain","==",X)` is denied for any org but the caller's own.
 * The Admin SDK bypasses rules; we still require an authenticated caller so
 * this can't be used to enumerate every tenant's subdomain anonymously.
 */
export async function POST(req: NextRequest) {
    const auth = await getAuthenticatedUser(req);
    if (!auth.isAuthenticated) {
        return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    let subdomain = "";
    try {
        const body = await req.json();
        subdomain = String(body?.subdomain ?? "")
            .trim()
            .toLowerCase();
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!VALID.test(subdomain)) {
        return NextResponse.json({ available: false, reason: "invalid" });
    }
    if (RESERVED.has(subdomain)) {
        return NextResponse.json({ available: false, reason: "reserved" });
    }

    // Taken if another org claims this value as its `subdomain` field, or an org
    // document already uses it as its id. The caller's own org never counts.
    const ownOrg = auth.orgId;
    const [byField, byId] = await Promise.all([
        adminDb.collection("organizations").where("subdomain", "==", subdomain).limit(5).get(),
        adminDb.collection("organizations").doc(subdomain).get(),
    ]);

    const conflict = byField.docs.some((d) => d.id !== ownOrg) || (byId.exists && byId.id !== ownOrg);

    return NextResponse.json({ available: !conflict });
}
