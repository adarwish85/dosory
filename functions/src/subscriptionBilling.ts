import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * subscriptionAutoBilling — the daily platform-billing sweep.
 *
 * WHAT IT USED TO DO, AND WHY THAT WAS REPLACED (2026-08-10):
 *   It queried `subscriptions where nextBillingDate <= now` — a field that exists on NO
 *   subscription document in production (all 14 carry the BillingService shape:
 *   currentPeriodStart/currentPeriodEnd/computedEntitlements). `nextBillingDate` only ever
 *   appeared in the shape app/api/paypal/capture-order writes, and that route has never run.
 *   So the query matched nothing, every day, silently.
 *   What it would have done if it ever matched is worse: it created a document in the tenant's
 *   own `invoices` collection — the CRM invoices a tenant sends to ITS customers — for money
 *   the tenant owes US. That mixes platform revenue into tenant books, and those invoices would
 *   have flowed into the tenant's AR aging, revenue analytics and journal entries.
 *
 * WHAT IT DOES NOW:
 *   Triggers the renewal sweep at /api/internal/billing/easykash/renew. EasyKash has no
 *   recurring charge, so renewal is invoice-and-remind: issue a payment attempt, email the link,
 *   grace, then suspend. That logic lives in the app so the EasyKash client, the reference
 *   counter and the email templates have exactly one implementation — this function is the
 *   clock, not a second copy of the billing rules.
 *
 * CONFIG IS READ INSIDE THE HANDLER. Reading config at module scope crashed the whole container
 * on boot once already, taking every function in the bundle down with it (CLAUDE.md §11).
 */
export const subscriptionAutoBilling = functions.pubsub
    .schedule("0 0 * * *")
    .timeZone("UTC")
    .onRun(async () => {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
        const internalSecret = process.env.INTERNAL_ADMIN_SECRET;

        if (!appUrl || !internalSecret) {
            console.warn(
                "[subscriptionAutoBilling] NEXT_PUBLIC_APP_URL or INTERNAL_ADMIN_SECRET is not configured — skipping this run"
            );
            return null;
        }

        try {
            const res = await fetch(`${appUrl}/api/internal/billing/easykash/renew`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-internal-admin-secret": internalSecret },
                body: "{}",
            });
            const text = await res.text();
            if (!res.ok) {
                console.error(`[subscriptionAutoBilling] renewal sweep returned ${res.status}: ${text.slice(0, 300)}`);
                return null;
            }
            console.log(`[subscriptionAutoBilling] renewal sweep: ${text.slice(0, 300)}`);
            return null;
        } catch (error) {
            // Log and return rather than throw: a retry storm on a billing path is its own
            // incident, and the sweep is idempotent so tomorrow's run catches up.
            console.error("[subscriptionAutoBilling] renewal sweep failed", error);
            return null;
        }
    });
