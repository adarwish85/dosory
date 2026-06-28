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
 * (`request.auth.token.orgId == orgId`), so a client-side `getDoc`/query is denied
 * for any org but the caller's own — which made the old client-side check fail for
 * anonymous signups and (on the catch path) wrongly report every subdomain "available".
 *
 * Auth is OPTIONAL: signup necessarily checks availability BEFORE the user exists. When a
 * call IS authenticated (a tenant renaming their own subdomain) we exclude their own org
 * from the conflict check. Returns only a boolean, so anonymous access just reveals whether
 * a subdomain exists (already discoverable by visiting it); abuse is handled by rate limiting.
 */
export async function POST(req: NextRequest) {
    const auth = await getAuthenticatedUser(req);
    const ownOrg = auth.isAuthenticated ? auth.orgId : undefined;

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
    const [byField, byId] = await Promise.all([
        adminDb.collection("organizations").where("subdomain", "==", subdomain).limit(5).get(),
        adminDb.collection("organizations").doc(subdomain).get(),
    ]);

    const conflict = byField.docs.some((d) => d.id !== ownOrg) || (byId.exists && byId.id !== ownOrg);

    return NextResponse.json({ available: !conflict });
}
