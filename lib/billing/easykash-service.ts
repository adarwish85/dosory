/**
 * EasyKash — server side. Owns the ONE transaction that turns a confirmed payment into an
 * extended subscription, so the callback and the reconciler cannot drift apart.
 *
 * Boundaries this file keeps deliberately:
 *   - `billingAttempts` and `platformBillingRecords` are the PLATFORM's revenue trail (tenants
 *     paying Dosory). They are NOT the tenant's own accounting books — nothing here touches
 *     `invoices`, `payments` or `journal_entries`, which belong to the tenant's customers.
 *   - `subscriptions/{orgId}` is written with `update`, never `set`. It carries
 *     `computedEntitlements`, which every entitlement check reads; a whole-document `set` would
 *     erase it and silently strip the tenant of every module. (That is exactly what
 *     app/api/paypal/capture-order/route.ts does — see the round report.)
 */

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
    AttemptStatus,
    BillingCycleLike,
    amountsMatch,
    computeNextPeriod,
    customerReferenceMatches,
} from "@/lib/billing/easykash-core";

export const ATTEMPTS_COLL = "billingAttempts";
export const PLATFORM_RECORDS_COLL = "platformBillingRecords";
const COUNTERS_COLL = "counters";
const COUNTER_DOC = "easykashRef";

/**
 * First reference issued. A wide, fixed-width starting point keeps every reference the same
 * length for support conversations, and keeps it clearly distinct from an invoice number.
 */
const REF_BASE = 100000;

export type BillingAttempt = {
    id: string;
    numericRef: number;
    orgId: string;
    planId: string;
    planName?: string;
    billingCycle: BillingCycleLike;
    amount: number;
    currency: string;
    status: AttemptStatus;
    provider: "easykash";
    purpose: "subscribe" | "renewal" | "trial_conversion";
    productCode?: string;
    checkoutUrl?: string;
    easykashRef?: string;
    paymentMethod?: string;
    voucher?: string;
    createdBy?: string;
};

/**
 * Issue a globally unique customerReference.
 *
 * Follows the house counter convention (`{ currentNumber }` bumped inside a transaction, as in
 * lib/services/invoice-service.ts) but at the ROOT, not under `organizations/{orgId}` — the
 * reference has to be unique across every tenant, because EasyKash resolves a payment by it
 * alone. A per-org counter would hand tenant A and tenant B the same reference and the second
 * callback would credit the wrong subscription.
 */
export async function issueNumericRef(): Promise<number> {
    const ref = adminDb.collection(COUNTERS_COLL).doc(COUNTER_DOC);
    return adminDb.runTransaction(async (t) => {
        const snap = await t.get(ref);
        const current = snap.exists ? Number(snap.data()?.currentNumber) || 0 : 0;
        const next = Math.max(current + 1, REF_BASE);
        t.set(ref, { currentNumber: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        return next;
    });
}

export async function createAttempt(input: Omit<BillingAttempt, "id">): Promise<string> {
    const ref = adminDb.collection(ATTEMPTS_COLL).doc();
    await ref.set({
        ...input,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });
    return ref.id;
}

export async function findAttemptByNumericRef(numericRef: number) {
    const snap = await adminDb.collection(ATTEMPTS_COLL).where("numericRef", "==", numericRef).limit(1).get();
    return snap.empty ? null : snap.docs[0];
}

export type ApplyResult =
    | { outcome: "applied"; attemptId: string; orgId: string; periodEnd: Date }
    | { outcome: "duplicate"; attemptId: string }
    | { outcome: "rejected"; reason: "no-attempt" | "amount-mismatch" | "currency-mismatch" | "reference-mismatch" };

/**
 * Apply a CONFIRMED payment. The caller has already verified authenticity (HMAC for the
 * callback, the provider's own Inquiry response for the reconciler) — this function decides
 * whether the payment matches what we asked for, and if so moves the money forward exactly once.
 *
 * Idempotent on `easykashRef`: the platform billing record is written at a deterministic id, and
 * a second callback with the same reference finds it and stops. EasyKash retries callbacks, and
 * the reconciler can race a late callback, so "exactly once" cannot rest on luck.
 */
export async function applyPaidPayment(params: {
    numericRef: number;
    easykashRef: string;
    reportedAmount: unknown;
    reportedCurrency?: unknown;
    paymentMethod?: string;
    voucher?: string;
    source: "callback" | "reconciler";
}): Promise<ApplyResult> {
    const { numericRef, easykashRef, reportedAmount, paymentMethod, voucher, source } = params;

    const attemptDoc = await findAttemptByNumericRef(numericRef);
    if (!attemptDoc) return { outcome: "rejected", reason: "no-attempt" };

    const attempt = attemptDoc.data() as BillingAttempt;

    // The attempt is the source of truth for what we asked to be paid. Anything else on the
    // wire — orgId, plan, amount — is the provider's echo and is never trusted.
    if (!customerReferenceMatches(attempt.numericRef, numericRef)) {
        return { outcome: "rejected", reason: "reference-mismatch" };
    }
    if (!amountsMatch(attempt.amount, reportedAmount)) {
        return { outcome: "rejected", reason: "amount-mismatch" };
    }
    if (
        params.reportedCurrency !== undefined &&
        params.reportedCurrency !== null &&
        String(params.reportedCurrency).trim().toUpperCase() !== attempt.currency
    ) {
        return { outcome: "rejected", reason: "currency-mismatch" };
    }

    const recordRef = adminDb.collection(PLATFORM_RECORDS_COLL).doc(easykashRef);
    const subRef = adminDb.collection("subscriptions").doc(attempt.orgId);

    return adminDb.runTransaction(async (t) => {
        // ---- ALL READS FIRST (Firestore rejects a read after any write) ----
        const [existingRecord, subSnap, attemptSnap] = await Promise.all([
            t.get(recordRef),
            t.get(subRef),
            t.get(attemptDoc.ref),
        ]);

        if (existingRecord.exists) {
            return { outcome: "duplicate" as const, attemptId: attemptDoc.id };
        }

        const sub = subSnap.exists ? subSnap.data() : null;
        const now = new Date();
        const currentEnd = toDate(sub?.currentPeriodEnd);
        const cycle: BillingCycleLike = attempt.billingCycle === "annual" ? "annual" : "monthly";
        const period = computeNextPeriod(cycle, now, currentEnd);

        // ---- writes ----
        t.update(attemptDoc.ref, {
            status: "paid",
            easykashRef,
            paymentMethod: paymentMethod ?? (attemptSnap.data()?.paymentMethod || null),
            voucher: voucher ?? (attemptSnap.data()?.voucher || null),
            paidAt: FieldValue.serverTimestamp(),
            paidVia: source,
            updatedAt: FieldValue.serverTimestamp(),
        });

        // MERGE semantics on purpose: `computedEntitlements`, `addons`, `planVersion` and the
        // trial fields must survive a renewal untouched.
        const subUpdate: Record<string, unknown> = {
            status: "active",
            planId: attempt.planId,
            billingCycle: cycle,
            currentPeriodStart: Timestamp.fromDate(period.start),
            currentPeriodEnd: Timestamp.fromDate(period.end),
            paymentProvider: "easykash",
            lastPaymentAt: FieldValue.serverTimestamp(),
            lastPaymentRef: easykashRef,
            // Grace bookkeeping from any previous lapse is cleared by a successful payment.
            graceUntil: FieldValue.delete(),
            renewalAttemptId: FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp(),
        };
        if (subSnap.exists) {
            t.update(subRef, subUpdate);
        } else {
            // No subscription document yet (a tenant that never provisioned one). Create the
            // minimum shape the readers expect; entitlements are recomputed by the entitlement
            // service from the plan, so they are deliberately not invented here.
            t.set(
                subRef,
                {
                    tenantId: attempt.orgId,
                    addons: [],
                    startedAt: FieldValue.serverTimestamp(),
                    createdAt: FieldValue.serverTimestamp(),
                    ...subUpdate,
                    graceUntil: FieldValue.delete(),
                    renewalAttemptId: FieldValue.delete(),
                },
                { merge: true }
            );
        }

        t.set(recordRef, {
            provider: "easykash",
            easykashRef,
            attemptId: attemptDoc.id,
            numericRef: attempt.numericRef,
            orgId: attempt.orgId,
            planId: attempt.planId,
            planName: attempt.planName ?? null,
            billingCycle: cycle,
            purpose: attempt.purpose,
            amount: attempt.amount,
            currency: attempt.currency,
            paymentMethod: paymentMethod ?? null,
            periodStart: Timestamp.fromDate(period.start),
            periodEnd: Timestamp.fromDate(period.end),
            source,
            createdAt: FieldValue.serverTimestamp(),
        });

        return { outcome: "applied" as const, attemptId: attemptDoc.id, orgId: attempt.orgId, periodEnd: period.end };
    });
}

/** Terminal, non-money status transitions (failed / expired / cancelled). Never overwrites `paid`. */
export async function markAttemptStatus(
    attemptRef: FirebaseFirestore.DocumentReference,
    status: Exclude<AttemptStatus, "paid">,
    extra: Record<string, unknown> = {}
): Promise<void> {
    await adminDb.runTransaction(async (t) => {
        const snap = await t.get(attemptRef);
        if (!snap.exists) return;
        if (snap.data()?.status === "paid") return; // a paid attempt is final
        t.update(attemptRef, { status, ...extra, updatedAt: FieldValue.serverTimestamp() });
    });
}

function toDate(v: unknown): Date | null {
    if (!v) return null;
    if (v instanceof Date) return v;
    const maybe = v as { toDate?: () => Date };
    return typeof maybe.toDate === "function" ? maybe.toDate() : null;
}
