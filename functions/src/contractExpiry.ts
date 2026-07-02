import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();

/**
 * Contract Auto-Expiry
 * Runs daily to mark expired contracts
 */
export const contractAutoExpiry = functions.pubsub
    .schedule("0 1 * * *")
    .timeZone("UTC")
    .onRun(async () => {
        console.log("Starting contract auto-expiry job...");

        const now = admin.firestore.Timestamp.now();

        try {
            const contractsRef = db.collection("contracts");
            const expiredContracts = await contractsRef
                .where("status", "==", "active")
                .where("endDate", "<", now)
                .get();

            console.log(`Found ${expiredContracts.size} contracts to expire`);

            const batch = db.batch();
            let contractsExpired = 0;

            for (const contractDoc of expiredContracts.docs) {
                batch.update(contractDoc.ref, {
                    status: "expired",
                    expiredAt: now,
                    autoExpired: true,
                });
                contractsExpired++;
            }

            await batch.commit();
            console.log(`Expired ${contractsExpired} contracts`);
            return null;
        } catch (error) {
            console.error("Error in contract auto-expiry:", error);
            throw error;
        }
    });

/**
 * Trial Expiry Check
 * Runs daily to expire trial subscriptions
 */
export const trialExpiryCheck = functions.pubsub
    .schedule("0 2 * * *")
    .timeZone("UTC")
    .onRun(async () => {
        console.log("Starting trial expiry check...");

        const now = admin.firestore.Timestamp.now();

        try {
            const subscriptionsRef = db.collection("subscriptions");
            // Canonical status is "trialing" (lib/types/billing.ts SubscriptionStatus +
            // seed-tenant-defaults.ts). The old "trial" literal matched nothing, so trials
            // never expired. NOTE (flagged for a product decision): this transitions to
            // status:"expired", which ensureWriteAccess does NOT block (it blocks only
            // canceled/suspended/past_due) — so expiry currently does not lock the tenant out.
            const expiredTrials = await subscriptionsRef
                .where("status", "==", "trialing")
                .where("trialEndsAt", "<", now)
                .get();

            console.log(`Found ${expiredTrials.size} expired trials`);

            const batch = db.batch();
            let trialsExpired = 0;

            for (const subDoc of expiredTrials.docs) {
                batch.update(subDoc.ref, {
                    status: "expired",
                    trialExpiredAt: now,
                });
                trialsExpired++;
            }

            await batch.commit();
            console.log(`Expired ${trialsExpired} trials`);
            return null;
        } catch (error) {
            console.error("Error in trial expiry check:", error);
            throw error;
        }
    });
