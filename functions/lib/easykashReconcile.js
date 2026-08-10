"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.easykashReconcile = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
/**
 * easykashReconcile — converge billing attempts that never got a callback.
 *
 * A Fawry/Aman buyer walks to a shop hours after checkout, and callbacks get lost. Without a
 * sweep, a tenant who paid stays unpaid in our records and eventually gets suspended.
 *
 * CONFIG IS READ LAZILY, INSIDE the handler. Reading `functions.config()` (or throwing on a
 * missing env var) at module scope crashed the whole v2 container on boot once already — every
 * function in the bundle went down, not just this one. See CLAUDE.md §11.
 *
 * It does NOT apply money itself: for an attempt the provider says is PAID it calls the app's
 * internal apply route, which owns the single subscription-extending transaction. Duplicating
 * that here would be a second money writer in a package with a different admin SDK major.
 */
const INQUIRE_URL = "https://back.easykash.net/api/cash-api/inquire";
/** Mirrors lib/billing/easykash-core.mapProviderStatus. Kept tiny and pinned by a contract test. */
function mapProviderStatus(raw) {
    const s = String(raw !== null && raw !== void 0 ? raw : "").trim().toUpperCase();
    if (s === "PAID" || s === "DELIVERED")
        return "paid";
    if (s === "FAILED")
        return "failed";
    if (s === "EXPIRED")
        return "expired";
    if (s === "CANCELED" || s === "CANCELLED")
        return "cancelled";
    if (s === "REFUNDED")
        return "refunded";
    if (s === "NEW")
        return "pending";
    return "unknown";
}
exports.easykashReconcile = functions.pubsub
    .schedule("15 * * * *")
    .timeZone("UTC")
    .onRun(async () => {
    var _a;
    // --- lazy config, never at module scope ---
    const apiKey = process.env.EASYKASH_API_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
    const internalSecret = process.env.INTERNAL_ADMIN_SECRET;
    const mode = process.env.EASYKASH_MODE === "stub" ? "stub" : "live";
    if (mode === "stub") {
        console.log("[easykashReconcile] EASYKASH_MODE=stub — nothing to reconcile against a stub provider");
        return null;
    }
    if (!apiKey) {
        console.warn("[easykashReconcile] EASYKASH_API_KEY not configured — skipping this run");
        return null;
    }
    const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
    // Single equality + one range on the SAME field pair used by the composite index
    // (status ASC, createdAt ASC). Cross-checked against firestore.indexes.json.
    const stale = await db
        .collection("billingAttempts")
        .where("status", "==", "pending")
        .where("createdAt", "<=", cutoff)
        .limit(200)
        .get();
    console.log(`[easykashReconcile] ${stale.size} pending attempt(s) older than 1h`);
    let converged = 0;
    let applied = 0;
    const discrepancies = [];
    for (const doc of stale.docs) {
        const attempt = doc.data();
        const numericRef = attempt.numericRef;
        if (numericRef === undefined || numericRef === null) {
            discrepancies.push(`attempt ${doc.id} has no numericRef`);
            continue;
        }
        let body;
        try {
            const res = await fetch(INQUIRE_URL, {
                method: "POST",
                headers: { authorization: apiKey, "Content-Type": "application/json" },
                body: JSON.stringify({ customerReference: String(numericRef) }),
            });
            const text = await res.text();
            if (!res.ok) {
                discrepancies.push(`inquiry ${numericRef} -> HTTP ${res.status}`);
                continue;
            }
            body = JSON.parse(text);
        }
        catch (error) {
            // A provider outage must not mark anyone failed.
            discrepancies.push(`inquiry ${numericRef} -> ${String(error)}`);
            continue;
        }
        const status = mapProviderStatus(body.status);
        if (status === "pending")
            continue; // genuinely still waiting (an unpaid voucher)
        if (status === "unknown") {
            discrepancies.push(`inquiry ${numericRef} -> unrecognised status ${String(body.status)}`);
            continue;
        }
        if (status === "paid") {
            const easykashRef = body.easykashRef ? String(body.easykashRef) : "";
            if (!easykashRef) {
                discrepancies.push(`inquiry ${numericRef} -> PAID with no easykashRef, cannot deduplicate`);
                continue;
            }
            if (!appUrl || !internalSecret) {
                discrepancies.push(`inquiry ${numericRef} -> PAID but the internal apply route is not configured`);
                continue;
            }
            try {
                const res = await fetch(`${appUrl}/api/internal/billing/easykash/apply`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "x-internal-admin-secret": internalSecret },
                    body: JSON.stringify({
                        numericRef,
                        easykashRef,
                        amount: body.Amount,
                        paymentMethod: body.PaymentMethod ? String(body.PaymentMethod) : undefined,
                        voucher: body.voucher ? String(body.voucher) : undefined,
                    }),
                });
                const out = (await res.json().catch(() => ({})));
                if (res.ok && out.applied) {
                    applied++;
                    console.log(`[easykashReconcile] applied late payment for ref ${numericRef}`);
                }
                else if (res.status === 409) {
                    discrepancies.push(`apply ${numericRef} rejected: ${out.reason}`);
                }
                converged++;
            }
            catch (error) {
                discrepancies.push(`apply ${numericRef} -> ${String(error)}`);
            }
            continue;
        }
        // failed / expired / cancelled / refunded — a status change, no money movement.
        await doc.ref.update({
            status,
            providerStatus: String((_a = body.status) !== null && _a !== void 0 ? _a : ""),
            reconciledAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        converged++;
    }
    if (discrepancies.length) {
        // Loud on purpose: a swallowed reconciliation gap is indistinguishable from "all clear".
        console.error(`[easykashReconcile] ${discrepancies.length} discrepancy/ies`, discrepancies.slice(0, 20));
    }
    console.log(`[easykashReconcile] converged=${converged} applied=${applied} scanned=${stale.size}`);
    return null;
});
//# sourceMappingURL=easykashReconcile.js.map