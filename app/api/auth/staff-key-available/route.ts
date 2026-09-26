import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/getAuthenticatedUser";
import { adminDb } from "@/lib/firebase-admin";
import { enforceRateLimit } from "@/lib/rate-limit";
import { staffKeyDecision } from "@/lib/auth/staff-key";

/**
 * POST /api/auth/staff-key-available
 *
 * Answers one question: is this person's staff document key free?
 *
 * WHY THIS EXISTS — CROSS-TENANT DATA LOSS, ALREADY SEEN IN PRODUCTION. Staff documents are
 * keyed by lowercased email in a ROOT collection (`staff/{email}`), so the key is global across
 * every tenant. Signup writes it with a bare `setDoc` (app/signup/page.tsx), which is a full
 * document REPLACEMENT — including `orgId`. So a second signup by the same person silently
 * rebinds their staff record to the new org and the FIRST org loses its only staff document.
 *
 * It happened: orgs `fareed` and `fareedmagdy` were both created by fareed.magdy@gmail.com on
 * 2026-06-28. One staff document survives, pointing at `fareed`; `fareedmagdy` has none. An org
 * with no staff document has no permissions record for anyone, because use-permissions resolves
 * a staff doc by authUid.
 *
 * WHY SERVER-SIDE. The client cannot perform this check: a freshly-created auth user has no
 * orgId claim yet, and the `staff` rules require an orgId match, so a client read is
 * permission-denied. It also should not be skippable — a guard the caller can omit is not a
 * guard.
 *
 * THE EMAIL COMES FROM THE VERIFIED TOKEN, never from the request body. Letting a caller name
 * the email would turn this into an oracle for "does this person have an account, and where",
 * which is exactly the kind of enumeration endpoint you do not want on a signup page.
 */
export async function POST(request: NextRequest) {
    // Same throttle class as provisioning: cheap, but it is reachable pre-org and answers a
    // question about account existence.
    const limited = await enforceRateLimit(request, { key: "staff-key", limit: 20, windowMs: 60_000 });
    if (limited) return limited;

    const auth = await getAuthenticatedUser(request);
    if (!auth.isAuthenticated || !auth.userId) {
        return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const email = auth.email?.toLowerCase().trim();
    if (!email) {
        return NextResponse.json({ error: "Token carries no email" }, { status: 400 });
    }

    try {
        const snap = await adminDb.collection("staff").doc(email).get();

        // The decision itself is a pure function so it can be tested without a token, an Admin
        // SDK or an emulator. The caller already proved they own this email by presenting a
        // verified token for it, so naming their own existing org leaks nothing new.
        return NextResponse.json(
            staffKeyDecision(snap.exists ? (snap.data() as { orgId?: string }) : null, auth.orgId)
        );
    } catch (error) {
        // Fail CLOSED. An unavailable check must not read as "the key is free" and let the
        // overwrite through — that is the exact outcome this endpoint exists to prevent.
        //
        // BUT FAILING CLOSED HERE BLOCKS EVERY SIGNUP, so this is an outage, not a warning, and
        // it has to read like one. A signup funnel that has silently stopped converting is lost
        // revenue nobody notices — the same shape of invisible failure as the unprovisioned orgs
        // this endpoint was written for.
        //
        // WHERE THIS LANDS: this is a Next.js route handler on App Hosting, i.e. Cloud Run — not
        // a Cloud Function — so `functions.logger` is unavailable and console.error goes to
        // stderr, which Cloud Logging records at ERROR severity for the `dosory` service. It is
        // structured as a single JSON payload so a log-based metric can match on
        // `SIGNUP_BLOCKED` without parsing prose.
        //
        // NOTHING ALERTS ON IT TODAY. A log line in a console nobody opens is not a signal. The
        // alert policy is proposed in docs/proposals/ops-alerting.md and is Ahmed's to create;
        // until it exists, the daily provisioning-reconcile email is the only thing that would
        // surface a signup funnel that has stopped.
        console.error(
            JSON.stringify({
                severity: "ERROR",
                alert: "SIGNUP_BLOCKED",
                where: "api/auth/staff-key-available",
                impact: "every signup is failing closed at the duplicate-email guard",
                message: error instanceof Error ? error.message : String(error),
            })
        );
        return NextResponse.json({ error: "Could not verify account availability" }, { status: 503 });
    }
}
