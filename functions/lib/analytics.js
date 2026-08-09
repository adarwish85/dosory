"use strict";
/**
 * Analytics Cloud Functions for Dosory SaaS
 *
 * Maintains pre-aggregated analytics in: analytics/{orgId}/monthly/{YYYY-MM}
 *
 * Triggers:
 * - onInvoiceWrite: Revenue tracking
 * - onPaymentWrite: Payment reconciliation
 * - onCustomerWrite: Customer counts
 * - onLeadWrite: Lead pipeline & conversion
 * - onProjectWrite: Project status tracking
 *
 * All use FieldValue.increment for safe concurrent updates.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.recalculateAnalytics = exports.monthlyAnalyticsSummary = exports.dailyAnalyticsSnapshot = exports.onProjectWrite = exports.onLeadWrite = exports.onCustomerWrite = exports.onPaymentWrite = exports.onInvoiceWrite = void 0;
exports.cleanupOldAnalytics = cleanupOldAnalytics;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Initialize admin if not already (index.ts should do this)
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
// =============================================================================
// SCHEMA: Analytics Document
// =============================================================================
// Path: analytics/{orgId}/monthly/{YYYY-MM}
//
// interface MonthlyStats {
//     orgId: string;
//     period: string;           // "2026-01"
//     
//     // Revenue
//     totalRevenue: number;     // Cumulative paid amount
//     paidRevenue: number;      // Same as totalRevenue (for clarity)
//     outstandingReceivables: number; // amountDue - amountPaid
//     invoiceCount: number;     // Total invoices (non-void, non-draft)
//     
//     // Customers
//     totalCustomers: number;   // Cumulative customer count
//     newCustomers: number;     // New customers this month
//     
//     // Leads
//     totalLeads: number;       // All leads created
//     convertedLeads: number;   // Leads marked as "converted"
//     leadConversionRate: number; // Calculated: convertedLeads / totalLeads
//     leadPipelineValue: number; // Sum of lead.value for active leads
//     
//     // Projects
//     activeProjects: number;   // status = "active" or "in_progress"
//     completedProjects: number; // status = "completed"
//     overdueProjects: number;  // dueDate < now && status not completed
//     
//     // Metadata
//     updatedAt: Timestamp;
//     computedAt?: Timestamp;   // For snapshot rebuilds
// }
// =============================================================================
// HELPER: Get Analytics Document Reference
// =============================================================================
function getStatsRef(orgId, date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const period = `${year}-${month}`;
    return {
        ref: db.collection("analytics").doc(orgId).collection("monthly").doc(period),
        period,
        orgId
    };
}
// Helper to extract date from Firestore timestamp or Date
function toDate(timestamp) {
    if (!timestamp)
        return new Date();
    if (timestamp.toDate)
        return timestamp.toDate();
    if (timestamp instanceof Date)
        return timestamp;
    return new Date(timestamp);
}
// =============================================================================
// TRIGGER 1: onInvoiceWrite
// =============================================================================
// Updates: totalRevenue, paidRevenue, outstandingReceivables, invoiceCount
exports.onInvoiceWrite = functions.firestore
    .document("invoices/{invoiceId}")
    .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() : null;
    const before = change.before.exists ? change.before.data() : null;
    const orgId = (after === null || after === void 0 ? void 0 : after.orgId) || (before === null || before === void 0 ? void 0 : before.orgId);
    if (!orgId)
        return null;
    // Use invoice date for period determination
    const invoiceDate = toDate((after === null || after === void 0 ? void 0 : after.date) || (before === null || before === void 0 ? void 0 : before.date) || (before === null || before === void 0 ? void 0 : before.createdAt));
    const { ref: statsRef, period } = getStatsRef(orgId, invoiceDate);
    // Calculate deltas
    let revenueDelta = 0;
    let receivableDelta = 0;
    let countDelta = 0;
    // "cancelled" belongs here with "void": it is a terminal kill status (the only one the
    // UI actually offers), so a cancelled invoice must stop counting towards revenue and
    // outstanding receivables. Omitting it kept cancelled invoices in the aggregates.
    const isValidStatus = (status) => status && status !== "void" && status !== "cancelled" && status !== "draft";
    // CASE 1: Creation
    if (!before && after) {
        if (isValidStatus(after.status)) {
            countDelta = 1;
            revenueDelta = after.amountPaid || 0;
            receivableDelta = (after.total || 0) - (after.amountPaid || 0);
        }
    }
    // CASE 2: Deletion
    else if (before && !after) {
        if (isValidStatus(before.status)) {
            countDelta = -1;
            revenueDelta = -(before.amountPaid || 0);
            receivableDelta = -((before.total || 0) - (before.amountPaid || 0));
        }
    }
    // CASE 3: Update
    else if (before && after) {
        const beforeValid = isValidStatus(before.status);
        const afterValid = isValidStatus(after.status);
        if (!beforeValid && afterValid) {
            // Transitioned INTO valid
            countDelta = 1;
            revenueDelta = after.amountPaid || 0;
            receivableDelta = (after.total || 0) - (after.amountPaid || 0);
        }
        else if (beforeValid && !afterValid) {
            // Transitioned OUT OF valid (voided)
            countDelta = -1;
            revenueDelta = -(before.amountPaid || 0);
            receivableDelta = -((before.total || 0) - (before.amountPaid || 0));
        }
        else if (beforeValid && afterValid) {
            // Both valid - calculate delta
            revenueDelta = (after.amountPaid || 0) - (before.amountPaid || 0);
            const beforeReceivable = (before.total || 0) - (before.amountPaid || 0);
            const afterReceivable = (after.total || 0) - (after.amountPaid || 0);
            receivableDelta = afterReceivable - beforeReceivable;
        }
    }
    // Skip if no changes
    if (revenueDelta === 0 && receivableDelta === 0 && countDelta === 0) {
        return null;
    }
    try {
        await statsRef.set({
            orgId,
            period,
            totalRevenue: FieldValue.increment(revenueDelta),
            paidRevenue: FieldValue.increment(revenueDelta),
            outstandingReceivables: FieldValue.increment(receivableDelta),
            invoiceCount: FieldValue.increment(countDelta),
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`[Analytics] Invoice updated for ${orgId}/${period}: revenue=${revenueDelta}, receivables=${receivableDelta}`);
    }
    catch (err) {
        console.error("[Analytics] Invoice aggregation failed:", err);
    }
    return null;
});
// =============================================================================
// TRIGGER 2: onPaymentWrite
// =============================================================================
// Updates: totalRevenue (increment), outstandingReceivables (decrement)
// This is a backup/reconciliation in case invoice.amountPaid isn't updated
exports.onPaymentWrite = functions.firestore
    .document("payments/{paymentId}")
    .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() : null;
    const before = change.before.exists ? change.before.data() : null;
    const orgId = (after === null || after === void 0 ? void 0 : after.orgId) || (before === null || before === void 0 ? void 0 : before.orgId);
    if (!orgId)
        return null;
    const paymentDate = toDate((after === null || after === void 0 ? void 0 : after.date) || (before === null || before === void 0 ? void 0 : before.date));
    const { ref: statsRef, period } = getStatsRef(orgId, paymentDate);
    let paymentDelta = 0;
    // CASE 1: Creation
    if (!before && after) {
        paymentDelta = after.amount || 0;
    }
    // CASE 2: Deletion
    else if (before && !after) {
        paymentDelta = -(before.amount || 0);
    }
    // CASE 3: Update
    else if (before && after) {
        paymentDelta = (after.amount || 0) - (before.amount || 0);
    }
    if (paymentDelta === 0)
        return null;
    try {
        await statsRef.set({
            orgId,
            period,
            // Note: We track payments separately to reconcile with invoice data
            totalPayments: FieldValue.increment(paymentDelta),
            paymentCount: FieldValue.increment(!before && after ? 1 : (before && !after ? -1 : 0)),
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`[Analytics] Payment updated for ${orgId}/${period}: delta=${paymentDelta}`);
    }
    catch (err) {
        console.error("[Analytics] Payment aggregation failed:", err);
    }
    return null;
});
// =============================================================================
// TRIGGER 3: onCustomerWrite
// =============================================================================
// Updates: totalCustomers, newCustomers
exports.onCustomerWrite = functions.firestore
    .document("customers/{customerId}")
    .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() : null;
    const before = change.before.exists ? change.before.data() : null;
    const orgId = (after === null || after === void 0 ? void 0 : after.orgId) || (before === null || before === void 0 ? void 0 : before.orgId);
    if (!orgId)
        return null;
    const createdAt = toDate((after === null || after === void 0 ? void 0 : after.createdAt) || (before === null || before === void 0 ? void 0 : before.createdAt));
    const { ref: statsRef, period } = getStatsRef(orgId, createdAt);
    let totalDelta = 0;
    let newDelta = 0;
    // Only count active customers (not archived/deleted)
    const isActive = (status) => status !== "archived" && status !== "deleted";
    // CASE 1: Creation
    if (!before && after) {
        if (isActive(after.status)) {
            totalDelta = 1;
            newDelta = 1;
        }
    }
    // CASE 2: Deletion
    else if (before && !after) {
        if (isActive(before.status)) {
            totalDelta = -1;
            // Don't decrement newCustomers - it's a historical metric
        }
    }
    // CASE 3: Update (status change)
    else if (before && after) {
        const wasActive = isActive(before.status);
        const isNowActive = isActive(after.status);
        if (!wasActive && isNowActive) {
            totalDelta = 1;
        }
        else if (wasActive && !isNowActive) {
            totalDelta = -1;
        }
    }
    if (totalDelta === 0 && newDelta === 0)
        return null;
    try {
        await statsRef.set({
            orgId,
            period,
            totalCustomers: FieldValue.increment(totalDelta),
            newCustomers: FieldValue.increment(newDelta),
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`[Analytics] Customer updated for ${orgId}/${period}: total=${totalDelta}, new=${newDelta}`);
    }
    catch (err) {
        console.error("[Analytics] Customer aggregation failed:", err);
    }
    return null;
});
// =============================================================================
// TRIGGER 4: onLeadWrite
// =============================================================================
// Updates: totalLeads, convertedLeads, leadConversionRate, leadPipelineValue
exports.onLeadWrite = functions.firestore
    .document("leads/{leadId}")
    .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() : null;
    const before = change.before.exists ? change.before.data() : null;
    const orgId = (after === null || after === void 0 ? void 0 : after.orgId) || (before === null || before === void 0 ? void 0 : before.orgId);
    if (!orgId)
        return null;
    const createdAt = toDate((after === null || after === void 0 ? void 0 : after.createdAt) || (before === null || before === void 0 ? void 0 : before.createdAt));
    const { ref: statsRef, period } = getStatsRef(orgId, createdAt);
    let totalDelta = 0;
    let convertedDelta = 0;
    let pipelineDelta = 0;
    const isConverted = (status) => status === "converted" || status === "won";
    const isActive = (status) => status && !["converted", "won", "lost", "archived"].includes(status);
    // CASE 1: Creation
    if (!before && after) {
        totalDelta = 1;
        if (isConverted(after.status)) {
            convertedDelta = 1;
        }
        if (isActive(after.status)) {
            pipelineDelta = after.value || 0;
        }
    }
    // CASE 2: Deletion
    else if (before && !after) {
        totalDelta = -1;
        if (isConverted(before.status)) {
            convertedDelta = -1;
        }
        if (isActive(before.status)) {
            pipelineDelta = -(before.value || 0);
        }
    }
    // CASE 3: Update
    else if (before && after) {
        // Conversion tracking
        if (!isConverted(before.status) && isConverted(after.status)) {
            convertedDelta = 1;
        }
        else if (isConverted(before.status) && !isConverted(after.status)) {
            convertedDelta = -1;
        }
        // Pipeline value tracking
        const beforePipeline = isActive(before.status) ? (before.value || 0) : 0;
        const afterPipeline = isActive(after.status) ? (after.value || 0) : 0;
        pipelineDelta = afterPipeline - beforePipeline;
    }
    if (totalDelta === 0 && convertedDelta === 0 && pipelineDelta === 0) {
        return null;
    }
    try {
        await statsRef.set({
            orgId,
            period,
            totalLeads: FieldValue.increment(totalDelta),
            convertedLeads: FieldValue.increment(convertedDelta),
            leadPipelineValue: FieldValue.increment(pipelineDelta),
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`[Analytics] Lead updated for ${orgId}/${period}: total=${totalDelta}, converted=${convertedDelta}, pipeline=${pipelineDelta}`);
    }
    catch (err) {
        console.error("[Analytics] Lead aggregation failed:", err);
    }
    return null;
});
// =============================================================================
// TRIGGER 5: onProjectWrite
// =============================================================================
// Updates: activeProjects, completedProjects, overdueProjects
exports.onProjectWrite = functions.firestore
    .document("projects/{projectId}")
    .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() : null;
    const before = change.before.exists ? change.before.data() : null;
    const orgId = (after === null || after === void 0 ? void 0 : after.orgId) || (before === null || before === void 0 ? void 0 : before.orgId);
    if (!orgId)
        return null;
    const createdAt = toDate((after === null || after === void 0 ? void 0 : after.createdAt) || (before === null || before === void 0 ? void 0 : before.createdAt));
    const { ref: statsRef, period } = getStatsRef(orgId, createdAt);
    let activeDelta = 0;
    let completedDelta = 0;
    const isActive = (status) => status === "active" || status === "in_progress" || status === "in-progress";
    const isCompleted = (status) => status === "completed" || status === "done" || status === "finished";
    // Helper to get status category
    const getCategory = (status) => {
        if (isActive(status))
            return "active";
        if (isCompleted(status))
            return "completed";
        return "other";
    };
    // CASE 1: Creation
    if (!before && after) {
        const category = getCategory(after.status);
        if (category === "active")
            activeDelta = 1;
        if (category === "completed")
            completedDelta = 1;
    }
    // CASE 2: Deletion
    else if (before && !after) {
        const category = getCategory(before.status);
        if (category === "active")
            activeDelta = -1;
        if (category === "completed")
            completedDelta = -1;
    }
    // CASE 3: Update
    else if (before && after) {
        const beforeCat = getCategory(before.status);
        const afterCat = getCategory(after.status);
        if (beforeCat !== afterCat) {
            // Decrement old category
            if (beforeCat === "active")
                activeDelta = -1;
            if (beforeCat === "completed")
                completedDelta = -1;
            // Increment new category
            if (afterCat === "active")
                activeDelta += 1;
            if (afterCat === "completed")
                completedDelta += 1;
        }
    }
    if (activeDelta === 0 && completedDelta === 0)
        return null;
    try {
        await statsRef.set({
            orgId,
            period,
            activeProjects: FieldValue.increment(activeDelta),
            completedProjects: FieldValue.increment(completedDelta),
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`[Analytics] Project updated for ${orgId}/${period}: active=${activeDelta}, completed=${completedDelta}`);
    }
    catch (err) {
        console.error("[Analytics] Project aggregation failed:", err);
    }
    return null;
});
// =============================================================================
// SCHEDULED: Daily Analytics Snapshot & Cleanup
// =============================================================================
// Runs daily at midnight UTC to:
// 1. Calculate derived metrics (conversion rates)
// 2. Copy current month stats to historical archive
// 3. Clean up old analytics data (>24 months)
exports.dailyAnalyticsSnapshot = functions.pubsub
    .schedule("0 0 * * *")
    .timeZone("UTC")
    .onRun(async (context) => {
    console.log("[Analytics] Running daily snapshot...");
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    try {
        // Get all organizations
        const orgsSnap = await db.collection("organizations").get();
        for (const orgDoc of orgsSnap.docs) {
            const orgId = orgDoc.id;
            const statsRef = db.collection("analytics").doc(orgId)
                .collection("monthly").doc(currentPeriod);
            const statsSnap = await statsRef.get();
            if (!statsSnap.exists)
                continue;
            const stats = statsSnap.data();
            // Calculate derived metrics
            const totalLeads = stats.totalLeads || 0;
            const convertedLeads = stats.convertedLeads || 0;
            const conversionRate = totalLeads > 0
                ? Math.round((convertedLeads / totalLeads) * 10000) / 100
                : 0;
            // Update with calculated fields
            await statsRef.update({
                leadConversionRate: conversionRate,
                computedAt: FieldValue.serverTimestamp()
            });
            console.log(`[Analytics] Computed rates for ${orgId}/${currentPeriod}: conversion=${conversionRate}%`);
        }
        // Cleanup old data (optional - uncomment to enable)
        // await cleanupOldAnalytics(24); // Keep 24 months
    }
    catch (err) {
        console.error("[Analytics] Daily snapshot failed:", err);
    }
    return null;
});
// =============================================================================
// SCHEDULED: Monthly Summary Roll-up
// =============================================================================
// Runs on the 1st of each month to create a summary of the previous month
exports.monthlyAnalyticsSummary = functions.pubsub
    .schedule("0 1 1 * *") // 1:00 AM on the 1st of each month
    .timeZone("UTC")
    .onRun(async (context) => {
    console.log("[Analytics] Running monthly summary...");
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const period = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
    try {
        const orgsSnap = await db.collection("organizations").get();
        for (const orgDoc of orgsSnap.docs) {
            const orgId = orgDoc.id;
            const statsRef = db.collection("analytics").doc(orgId)
                .collection("monthly").doc(period);
            const statsSnap = await statsRef.get();
            if (!statsSnap.exists)
                continue;
            // Mark as finalized
            await statsRef.update({
                finalized: true,
                finalizedAt: FieldValue.serverTimestamp()
            });
            console.log(`[Analytics] Finalized ${orgId}/${period}`);
        }
    }
    catch (err) {
        console.error("[Analytics] Monthly summary failed:", err);
    }
    return null;
});
// =============================================================================
// HTTP: Force Recalculate Analytics for a Tenant
// =============================================================================
// Callable function to rebuild analytics from raw data
exports.recalculateAnalytics = functions.https.onCall(async (data, context) => {
    var _a;
    // Auth check
    if (!((_a = context.auth) === null || _a === void 0 ? void 0 : _a.token.isSuperAdmin)) {
        throw new functions.https.HttpsError("permission-denied", "Super Admin required");
    }
    const { orgId, period } = data;
    if (!orgId || !period) {
        throw new functions.https.HttpsError("invalid-argument", "orgId and period required");
    }
    console.log(`[Analytics] Recalculating ${orgId}/${period}...`);
    const [year, month] = period.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    try {
        // Initialize stats
        const stats = {
            orgId,
            period,
            totalRevenue: 0,
            paidRevenue: 0,
            outstandingReceivables: 0,
            invoiceCount: 0,
            totalPayments: 0,
            paymentCount: 0,
            totalCustomers: 0,
            newCustomers: 0,
            totalLeads: 0,
            convertedLeads: 0,
            leadPipelineValue: 0,
            activeProjects: 0,
            completedProjects: 0,
            updatedAt: FieldValue.serverTimestamp(),
            computedAt: FieldValue.serverTimestamp(),
            recalculated: true
        };
        // Aggregate invoices
        const invoicesSnap = await db.collection("invoices")
            .where("orgId", "==", orgId)
            .where("date", ">=", admin.firestore.Timestamp.fromDate(startDate))
            .where("date", "<=", admin.firestore.Timestamp.fromDate(endDate))
            .get();
        invoicesSnap.docs.forEach(doc => {
            const inv = doc.data();
            if (inv.status !== "void" && inv.status !== "draft") {
                stats.invoiceCount++;
                stats.paidRevenue += inv.amountPaid || 0;
                stats.totalRevenue += inv.amountPaid || 0;
                stats.outstandingReceivables += (inv.total || 0) - (inv.amountPaid || 0);
            }
        });
        // Aggregate customers
        const customersSnap = await db.collection("customers")
            .where("orgId", "==", orgId)
            .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(startDate))
            .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(endDate))
            .get();
        customersSnap.docs.forEach(doc => {
            const cust = doc.data();
            if (cust.status !== "archived" && cust.status !== "deleted") {
                stats.totalCustomers++;
                stats.newCustomers++;
            }
        });
        // Aggregate leads
        const leadsSnap = await db.collection("leads")
            .where("orgId", "==", orgId)
            .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(startDate))
            .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(endDate))
            .get();
        leadsSnap.docs.forEach(doc => {
            const lead = doc.data();
            stats.totalLeads++;
            if (lead.status === "converted" || lead.status === "won") {
                stats.convertedLeads++;
            }
            if (!["converted", "won", "lost", "archived"].includes(lead.status)) {
                stats.leadPipelineValue += lead.value || 0;
            }
        });
        // Aggregate projects
        const projectsSnap = await db.collection("projects")
            .where("orgId", "==", orgId)
            .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(startDate))
            .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(endDate))
            .get();
        projectsSnap.docs.forEach(doc => {
            const proj = doc.data();
            if (["active", "in_progress", "in-progress"].includes(proj.status)) {
                stats.activeProjects++;
            }
            if (["completed", "done", "finished"].includes(proj.status)) {
                stats.completedProjects++;
            }
        });
        // Calculate derived metrics
        const conversionRate = stats.totalLeads > 0
            ? Math.round((stats.convertedLeads / stats.totalLeads) * 10000) / 100
            : 0;
        // Save
        const statsRef = db.collection("analytics").doc(orgId)
            .collection("monthly").doc(period);
        await statsRef.set(Object.assign(Object.assign({}, stats), { leadConversionRate: conversionRate }));
        console.log(`[Analytics] Recalculated ${orgId}/${period}:`, stats);
        return { success: true, stats };
    }
    catch (err) {
        console.error("[Analytics] Recalculation failed:", err);
        throw new functions.https.HttpsError("internal", err.message);
    }
});
// =============================================================================
// UTILITY: Cleanup Old Analytics Data
// =============================================================================
async function cleanupOldAnalytics(monthsToKeep = 24) {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsToKeep);
    const cutoffPeriod = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, "0")}`;
    console.log(`[Analytics] Cleaning up periods before ${cutoffPeriod}...`);
    const orgsSnap = await db.collection("organizations").get();
    for (const orgDoc of orgsSnap.docs) {
        const monthlyRef = db.collection("analytics").doc(orgDoc.id).collection("monthly");
        const oldDocs = await monthlyRef.where("period", "<", cutoffPeriod).get();
        const batch = db.batch();
        oldDocs.docs.forEach(doc => batch.delete(doc.ref));
        if (!oldDocs.empty) {
            await batch.commit();
            console.log(`[Analytics] Deleted ${oldDocs.size} old docs for ${orgDoc.id}`);
        }
    }
}
//# sourceMappingURL=analytics.js.map