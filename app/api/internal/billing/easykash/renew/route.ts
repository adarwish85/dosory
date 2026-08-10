/**
 * POST /api/internal/billing/easykash/renew — internal only, shared-secret gated.
 *
 * The renewal sweep for an INVOICE-AND-RENEW provider. EasyKash cannot charge a saved card, so
 * "renewal" means: issue a fresh payment attempt, email the link, and hold the tenant in a grace
 * window while they pay. Nothing here moves money — the callback does that.
 *
 * It lives in the app rather than in the scheduled function so that the EasyKash client, the
 * attempt/counter service and the email templates all have exactly one implementation;
 * `subscriptionAutoBilling` just triggers it on a schedule.
 *
 * Three passes, each idempotent:
 *   1. DUE SOON  — period ends within RENEW_WINDOW_DAYS and no live attempt exists → attempt + email.
 *   2. LAPSED    — period already ended → status `past_due`, grace clock started.
 *   3. GRACE OUT — grace window passed → `suspended`, which ensureWriteAccess already blocks.
 */
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { BillingCycleLike, resolvePlanPrice } from "@/lib/billing/easykash-core";
import { createPayment, easykashConfigured } from "@/lib/billing/easykash-client";
import { ATTEMPTS_COLL, createAttempt, issueNumericRef } from "@/lib/billing/easykash-service";
import { sendEmail } from "@/lib/email/resend";
import { SubscriptionRenewalEmail } from "@/lib/email/templates/SubscriptionRenewalEmail";

const RENEW_WINDOW_DAYS = 7;
const GRACE_DAYS = 7;

export async function POST(request: NextRequest) {
    const secret = request.headers.get("x-internal-admin-secret");
    const expected = process.env.INTERNAL_ADMIN_SECRET;
    if (!expected || secret !== expected) {
        return NextResponse.json({ error: "Forbidden: invalid or missing internal secret" }, { status: 403 });
    }
    if (!easykashConfigured()) {
        return NextResponse.json({ error: "EasyKash is not configured on this environment" }, { status: 503 });
    }

    const now = new Date();
    const dueBefore = new Date(now.getTime() + RENEW_WINDOW_DAYS * 86400000);
    const out = { invited: 0, pastDue: 0, suspended: 0, skipped: [] as string[] };

    // Only subscriptions that pay us — a trialing tenant is invited to convert, an active one to
    // renew. `canceled` and `suspended` are terminal for this sweep.
    // "expired" is in the list because trialExpiryCheck (functions/src/contractExpiry.ts) writes
    // exactly that when a trial ends — leaving it out meant every trial fell out of the billing
    // lifecycle nine days before this sweep would have invited it to convert. Found by the panel.
    const snap = await adminDb
        .collection("subscriptions")
        .where("status", "in", ["active", "trialing", "past_due", "expired"])
        .get();

    for (const doc of snap.docs) {
        const sub = doc.data() as Record<string, unknown>;
        const orgId = doc.id;
        const periodEnd = toDate(sub.currentPeriodEnd) ?? toDate(sub.trialEndsAt);
        if (!periodEnd) {
            out.skipped.push(`${orgId}: no period end`);
            continue;
        }

        // ---------- pass 3: grace expired AND still unpaid ----------
        // All three conditions matter. Suspending on a stale `graceUntil` alone would suspend a
        // tenant who has since paid — including one a super admin activated by hand, since that
        // path does not clear the field. The period end is the real test of "still unpaid".
        const graceUntil = toDate(sub.graceUntil);
        const stillUnpaid = periodEnd.getTime() < now.getTime();
        const inArrears = sub.status === "past_due" || sub.status === "expired";
        if (graceUntil && graceUntil.getTime() < now.getTime() && stillUnpaid && inArrears) {
            await doc.ref.update({
                status: "suspended",
                suspendedAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
            out.suspended++;
            continue;
        }
        if (graceUntil && !stillUnpaid) {
            // Paid since the lapse (callback, reconciler, or a super admin). Clear the arrears
            // bookkeeping so the next run cannot resurrect it.
            await doc.ref.update({
                graceUntil: FieldValue.delete(),
                updatedAt: FieldValue.serverTimestamp(),
            });
        }

        // ---------- pass 2: lapsed — start (or repair) the grace clock ----------
        // Keyed on the MISSING clock, not just on the status transition. A subscription that
        // reached `past_due` by another route (or lost the field) would otherwise be emailed on
        // every run forever and could never be suspended, because pass 3 needs `graceUntil`.
        let graceDeadline = graceUntil;
        if (periodEnd.getTime() < now.getTime() && (!inArrears || !graceUntil)) {
            graceDeadline = new Date(now.getTime() + GRACE_DAYS * 86400000);
            await doc.ref.update({
                status: sub.status === "expired" ? "expired" : "past_due",
                graceUntil: Timestamp.fromDate(graceDeadline),
                updatedAt: FieldValue.serverTimestamp(),
            });
            out.pastDue++;
            // fall through — a lapsed tenant still needs a link
        }

        // ---------- pass 1: issue a renewal link ----------
        if (periodEnd.getTime() > dueBefore.getTime()) continue; // not due yet

        // One live attempt at a time: re-running the sweep must not spam a tenant with links.
        const live = await adminDb
            .collection(ATTEMPTS_COLL)
            .where("orgId", "==", orgId)
            .where("status", "==", "pending")
            .limit(1)
            .get();
        if (!live.empty) continue;

        const planId = String(sub.planId || "");
        const planSnap = planId ? await adminDb.collection("plans").doc(planId).get() : null;
        const price = resolvePlanPrice(planSnap?.data() as never, (sub.billingCycle as BillingCycleLike) || "monthly");
        if (!price.ok) {
            // Loud, not silent: a plan with no price means this tenant can never renew, and a
            // quiet skip would let them lapse into suspension for our configuration error.
            out.skipped.push(`${orgId}: plan ${planId} has no price (${price.reason})`);
            continue;
        }

        const admin = await findOrgAdmin(orgId);
        if (!admin?.email || !admin.mobile) {
            out.skipped.push(`${orgId}: admin has no ${!admin?.email ? "email" : "mobile"} on file`);
            continue;
        }

        const numericRef = await issueNumericRef();
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
        const payment = await createPayment({
            amount: price.amount,
            currency: price.currency,
            name: admin.name,
            email: admin.email,
            mobile: admin.mobile,
            redirectUrl: `${appUrl}/dashboard/billing/easykash/return`,
            customerReference: numericRef,
            cashExpiry: 24,
        });
        if (!payment.ok) {
            out.skipped.push(`${orgId}: pay API failed (${payment.error})`);
            continue;
        }

        const attemptId = await createAttempt({
            numericRef,
            orgId,
            planId,
            planName: String((planSnap?.data() as Record<string, unknown>)?.name || ""),
            billingCycle: (sub.billingCycle as BillingCycleLike) || "monthly",
            amount: price.amount,
            currency: price.currency,
            status: "pending",
            provider: "easykash",
            purpose: sub.status === "trialing" ? "trial_conversion" : "renewal",
            productCode: payment.productCode,
            checkoutUrl: payment.redirectUrl,
        });

        // The STORED deadline drives the email, so the date the customer reads is the date pass 3
        // will actually act on. Recomputing it here moved the deadline a day later on every run.
        const graceEnd =
            graceDeadline ?? new Date(Math.max(periodEnd.getTime(), now.getTime()) + GRACE_DAYS * 86400000);
        const sent = await sendEmail({
            to: admin.email,
            subject: `Renew your ${String((planSnap?.data() as Record<string, unknown>)?.name || "Dosory")} subscription`,
            react: SubscriptionRenewalEmail({
                userName: admin.name,
                planName: String((planSnap?.data() as Record<string, unknown>)?.name || "your plan"),
                amount: price.amount.toFixed(2),
                currency: price.currency,
                payUrl: payment.redirectUrl,
                periodEnd: periodEnd.toISOString().slice(0, 10),
                graceEnd: graceEnd.toISOString().slice(0, 10),
            }),
        });
        if (!sent.success) out.skipped.push(`${orgId}: renewal email failed (${sent.error})`);

        await doc.ref.update({
            renewalAttemptId: attemptId,
            renewalInvitedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        out.invited++;
    }

    if (out.skipped.length) console.error("[easykash-renew] skipped", out.skipped.slice(0, 20));
    console.log(`[easykash-renew] invited=${out.invited} pastDue=${out.pastDue} suspended=${out.suspended}`);
    return NextResponse.json(out);
}

async function findOrgAdmin(orgId: string): Promise<{ name: string; email: string; mobile: string } | null> {
    // Staff documents are keyed by lowercased email and carry `authUid` (CLAUDE.md invariant).
    const snap = await adminDb
        .collection("staff")
        .where("orgId", "==", orgId)
        .where("isAdmin", "==", true)
        .limit(1)
        .get();
    if (snap.empty) return null;
    const s = snap.docs[0].data() as Record<string, unknown>;

    let mobile = String(s.phone || s.mobile || "").trim();
    if (!mobile && s.authUid) {
        const user = await adminDb.collection("users").doc(String(s.authUid)).get();
        mobile = String((user.data() as Record<string, unknown>)?.phone || "").trim();
    }

    const name = [s.firstName, s.lastName].filter(Boolean).join(" ").trim() || String(s.name || "").trim() || "there";
    return { name, email: String(s.email || snap.docs[0].id), mobile };
}

function toDate(v: unknown): Date | null {
    if (!v) return null;
    if (v instanceof Date) return v;
    const maybe = v as { toDate?: () => Date };
    return typeof maybe.toDate === "function" ? maybe.toDate() : null;
}
