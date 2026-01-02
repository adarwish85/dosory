"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailyAnalyticsSnapshot = exports.onInvoiceWrite = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore();
// ----------------------------------------------------------------------------
// Aggregation Trigger: onInvoiceWrite
// ----------------------------------------------------------------------------
// Updates a monthly stats document whenever an invoice is created, updated, or deleted.
exports.onInvoiceWrite = functions.firestore
    .document("invoices/{invoiceId}")
    .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() : null;
    const before = change.before.exists ? change.before.data() : null;
    // Determine Org ID (fallback to before data if deletion)
    const orgId = (after === null || after === void 0 ? void 0 : after.orgId) || (before === null || before === void 0 ? void 0 : before.orgId);
    if (!orgId)
        return null; // Orphaned data
    // Determine Month Key (YYYY_MM) to shard aggregates by month
    // Use created date or current date
    const date = (after === null || after === void 0 ? void 0 : after.date // Firestore Timestamp
    )
        ? after.date.toDate()
        : ((before === null || before === void 0 ? void 0 : before.date) ? before.date.toDate() : new Date());
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const docId = `stats_${orgId}_${year}_${month}`;
    const statsRef = db.collection("analytics").doc(docId);
    // We use a transaction or simple increment/decrement logic.
    // For strict accuracy, full re-aggregation of the month is safer/idempotent 
    // but slower. Atomic increment is faster but can drift if events drop.
    // Given the requirement for Scalability, we'll use Atomic Increments (FieldVal.increment).
    let revenueDelta = 0;
    let receivableDelta = 0;
    let countDelta = 0;
    // CASE 1: Creation
    if (!before && after) {
        countDelta = 1;
        if (after.status !== "void" && after.status !== "draft") {
            receivableDelta += (after.amountDue || 0);
            revenueDelta += (after.amountPaid || 0);
        }
    }
    // CASE 2: Deletion
    else if (before && !after) {
        countDelta = -1;
        if (before.status !== "void" && before.status !== "draft") {
            receivableDelta -= (before.amountDue || 0);
            revenueDelta -= (before.amountPaid || 0);
        }
    }
    // CASE 3: Update
    else if (before && after) {
        // Calculate deltas
        const beforeValid = before.status !== "void" && before.status !== "draft";
        const afterValid = after.status !== "void" && after.status !== "draft";
        // If transitioned INTO valid state (e.g. draft -> sent)
        if (!beforeValid && afterValid) {
            receivableDelta += (after.amountDue || 0);
            revenueDelta += (after.amountPaid || 0);
        }
        // If transitioned OUT of valid state (e.g. sent -> void)
        else if (beforeValid && !afterValid) {
            receivableDelta -= (before.amountDue || 0);
            revenueDelta -= (before.amountPaid || 0);
        }
        // If stayed valid, verify value changes
        else if (beforeValid && afterValid) {
            receivableDelta += (after.amountDue || 0) - (before.amountDue || 0);
            revenueDelta += (after.amountPaid || 0) - (before.amountPaid || 0);
        }
    }
    // Apply Update
    // Note: FieldValue.increment handles concurrent writes safely
    if (revenueDelta === 0 && receivableDelta === 0 && countDelta === 0) {
        return null; // No financial impact
    }
    try {
        await statsRef.set({
            orgId,
            period: `${year}-${month}`,
            totalRevenue: admin.firestore.FieldValue.increment(revenueDelta),
            outstandingReceivables: admin.firestore.FieldValue.increment(receivableDelta),
            invoiceCount: admin.firestore.FieldValue.increment(countDelta),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }
    catch (err) {
        console.error("Aggregation failed", err);
    }
    return null;
});
// ----------------------------------------------------------------------------
// Historical Snapshots (Scheduled)
// ----------------------------------------------------------------------------
// Daily at midnight, fetch "current" states or aggregates and save to history collection
exports.dailyAnalyticsSnapshot = functions.pubsub.schedule("0 0 * * *")
    .timeZone("UTC")
    .onRun(async (context) => {
    // Implementation: Iterate over active orgs or stats docs and copy to history
    // For large scale, we might iterate 'organizations' collection.
    // Simplified Logic: 
    console.log("Running daily snapshot...");
    return null;
});
//# sourceMappingURL=analytics.js.map