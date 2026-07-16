import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/getAuthenticatedUser";
import { provisionTenant } from "@/lib/provisioning/seed-tenant-defaults";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/tenants/provision
 *
 * Idempotently provisions a tenant's billing + default settings server-side (A2 + A3):
 *   - subscriptions/{orgId} so TenantEntitlements.ensureWriteAccess() passes
 *   - default currencies / taxes / payment-modes / email-templates
 *
 * Called by self-serve signup right after set-claims. The caller may only provision
 * THEIR OWN org. getAuthenticatedUser falls back to users/{uid}.orgId when the token
 * claim hasn't refreshed yet, so the ownership check holds on the first call.
 */
export async function POST(request: NextRequest) {
    // Throttle bulk tenant creation per-IP (idempotent, but each call does seed writes).
    const limited = await enforceRateLimit(request, { key: "provision", limit: 10, windowMs: 60_000 });
    if (limited) return limited;

    const auth = await getAuthenticatedUser(request);
    if (!auth.isAuthenticated || !auth.userId) {
        return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    let orgId = "";
    try {
        const body = await request.json();
        orgId = String(body?.orgId ?? "");
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!orgId || auth.orgId !== orgId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        await provisionTenant(orgId, auth.userId); // idempotent: A2 + A3
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[provision] failed:", error);
        return NextResponse.json({ error: (error as Error).message || "Provisioning failed" }, { status: 500 });
    }
}
