"use strict";
/**
 * Analytics Cloud Functions Tests
 *
 * Run with: npm test
 * Requires Firebase Emulator running: firebase emulators:start
 */
Object.defineProperty(exports, "__esModule", { value: true });
const admin = require("firebase-admin");
const globals_1 = require("@jest/globals");
// Test configuration
const TEST_PROJECT_ID = "dosory-test";
const TEST_ORG_ID = "test-org-001";
// Initialize Firebase Admin for testing
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
if (!admin.apps.length) {
    admin.initializeApp({ projectId: TEST_PROJECT_ID });
}
const db = admin.firestore();
// ============================================================================
// Test Utilities
// ============================================================================
async function clearCollection(path) {
    const docs = await db.collection(path).listDocuments();
    const batch = db.batch();
    docs.forEach(doc => batch.delete(doc));
    await batch.commit();
}
async function getStats(orgId, period) {
    const doc = await db.collection("analytics")
        .doc(orgId)
        .collection("monthly")
        .doc(period)
        .get();
    return doc.exists ? doc.data() : null;
}
// Wait for trigger to complete
async function waitForTrigger(ms = 2000) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// ============================================================================
// Test Suite: Invoice Analytics
// ============================================================================
(0, globals_1.describe)("Analytics: Invoice Triggers", () => {
    const period = "2026-01";
    (0, globals_1.beforeEach)(async () => {
        await clearCollection("invoices");
        await clearCollection(`analytics/${TEST_ORG_ID}/monthly`);
    });
    (0, globals_1.it)("should increment stats when invoice is created", async () => {
        // Create an invoice
        await db.collection("invoices").add({
            orgId: TEST_ORG_ID,
            status: "sent",
            total: 1000,
            amountPaid: 0,
            date: admin.firestore.Timestamp.fromDate(new Date(2026, 0, 15))
        });
        await waitForTrigger();
        const stats = await getStats(TEST_ORG_ID, period);
        (0, globals_1.expect)(stats).not.toBeNull();
        (0, globals_1.expect)(stats === null || stats === void 0 ? void 0 : stats.invoiceCount).toBe(1);
        (0, globals_1.expect)(stats === null || stats === void 0 ? void 0 : stats.totalRevenue).toBe(0);
        (0, globals_1.expect)(stats === null || stats === void 0 ? void 0 : stats.outstandingReceivables).toBe(1000);
    });
    (0, globals_1.it)("should update revenue when payment is applied", async () => {
        // Create invoice
        const invoiceRef = await db.collection("invoices").add({
            orgId: TEST_ORG_ID,
            status: "sent",
            total: 1000,
            amountPaid: 0,
            date: admin.firestore.Timestamp.fromDate(new Date(2026, 0, 15))
        });
        await waitForTrigger();
        // Apply payment
        await invoiceRef.update({
            amountPaid: 500,
            status: "partial"
        });
        await waitForTrigger();
        const stats = await getStats(TEST_ORG_ID, period);
        (0, globals_1.expect)(stats === null || stats === void 0 ? void 0 : stats.totalRevenue).toBe(500);
        (0, globals_1.expect)(stats === null || stats === void 0 ? void 0 : stats.outstandingReceivables).toBe(500);
    });
    (0, globals_1.it)("should not count draft invoices", async () => {
        await db.collection("invoices").add({
            orgId: TEST_ORG_ID,
            status: "draft",
            total: 5000,
            amountPaid: 0,
            date: admin.firestore.Timestamp.fromDate(new Date(2026, 0, 15))
        });
        await waitForTrigger();
        const stats = await getStats(TEST_ORG_ID, period);
        (0, globals_1.expect)((stats === null || stats === void 0 ? void 0 : stats.invoiceCount) || 0).toBe(0);
    });
    (0, globals_1.it)("should decrement stats when invoice is voided", async () => {
        // Create invoice
        const invoiceRef = await db.collection("invoices").add({
            orgId: TEST_ORG_ID,
            status: "sent",
            total: 1000,
            amountPaid: 200,
            date: admin.firestore.Timestamp.fromDate(new Date(2026, 0, 15))
        });
        await waitForTrigger();
        // Void it
        await invoiceRef.update({ status: "void" });
        await waitForTrigger();
        const stats = await getStats(TEST_ORG_ID, period);
        (0, globals_1.expect)(stats === null || stats === void 0 ? void 0 : stats.invoiceCount).toBe(0);
        (0, globals_1.expect)(stats === null || stats === void 0 ? void 0 : stats.totalRevenue).toBe(0);
    });
});
// ============================================================================
// Test Suite: Customer Analytics
// ============================================================================
(0, globals_1.describe)("Analytics: Customer Triggers", () => {
    const period = "2026-01";
    (0, globals_1.beforeEach)(async () => {
        await clearCollection("customers");
        await clearCollection(`analytics/${TEST_ORG_ID}/monthly`);
    });
    (0, globals_1.it)("should increment customer counts on creation", async () => {
        await db.collection("customers").add({
            orgId: TEST_ORG_ID,
            status: "active",
            company: "Acme Corp",
            createdAt: admin.firestore.Timestamp.fromDate(new Date(2026, 0, 15))
        });
        await waitForTrigger();
        const stats = await getStats(TEST_ORG_ID, period);
        (0, globals_1.expect)(stats === null || stats === void 0 ? void 0 : stats.totalCustomers).toBe(1);
        (0, globals_1.expect)(stats === null || stats === void 0 ? void 0 : stats.newCustomers).toBe(1);
    });
    (0, globals_1.it)("should decrement when customer is archived", async () => {
        const customerRef = await db.collection("customers").add({
            orgId: TEST_ORG_ID,
            status: "active",
            company: "Acme Corp",
            createdAt: admin.firestore.Timestamp.fromDate(new Date(2026, 0, 15))
        });
        await waitForTrigger();
        await customerRef.update({ status: "archived" });
        await waitForTrigger();
        const stats = await getStats(TEST_ORG_ID, period);
        (0, globals_1.expect)(stats === null || stats === void 0 ? void 0 : stats.totalCustomers).toBe(0);
        // newCustomers should NOT decrement (historical metric)
        (0, globals_1.expect)(stats === null || stats === void 0 ? void 0 : stats.newCustomers).toBe(1);
    });
});
// ============================================================================
// Test Suite: Lead Analytics
// ============================================================================
(0, globals_1.describe)("Analytics: Lead Triggers", () => {
    const period = "2026-01";
    (0, globals_1.beforeEach)(async () => {
        await clearCollection("leads");
        await clearCollection(`analytics/${TEST_ORG_ID}/monthly`);
    });
    (0, globals_1.it)("should track lead creation and pipeline value", async () => {
        await db.collection("leads").add({
            orgId: TEST_ORG_ID,
            status: "new",
            name: "Test Lead",
            value: 5000,
            createdAt: admin.firestore.Timestamp.fromDate(new Date(2026, 0, 15))
        });
        await waitForTrigger();
        const stats = await getStats(TEST_ORG_ID, period);
        (0, globals_1.expect)(stats === null || stats === void 0 ? void 0 : stats.totalLeads).toBe(1);
        (0, globals_1.expect)(stats === null || stats === void 0 ? void 0 : stats.leadPipelineValue).toBe(5000);
        (0, globals_1.expect)(stats === null || stats === void 0 ? void 0 : stats.convertedLeads).toBe(0);
    });
    (0, globals_1.it)("should track lead conversion", async () => {
        const leadRef = await db.collection("leads").add({
            orgId: TEST_ORG_ID,
            status: "qualified",
            name: "Hot Lead",
            value: 10000,
            createdAt: admin.firestore.Timestamp.fromDate(new Date(2026, 0, 15))
        });
        await waitForTrigger();
        // Convert the lead
        await leadRef.update({ status: "converted" });
        await waitForTrigger();
        const stats = await getStats(TEST_ORG_ID, period);
        (0, globals_1.expect)(stats === null || stats === void 0 ? void 0 : stats.convertedLeads).toBe(1);
        // Pipeline should decrease when converted
        (0, globals_1.expect)(stats === null || stats === void 0 ? void 0 : stats.leadPipelineValue).toBe(0);
    });
    (0, globals_1.it)("should remove pipeline value when lead is lost", async () => {
        const leadRef = await db.collection("leads").add({
            orgId: TEST_ORG_ID,
            status: "qualified",
            name: "Risky Lead",
            value: 8000,
            createdAt: admin.firestore.Timestamp.fromDate(new Date(2026, 0, 15))
        });
        await waitForTrigger();
        await leadRef.update({ status: "lost" });
        await waitForTrigger();
        const stats = await getStats(TEST_ORG_ID, period);
        (0, globals_1.expect)(stats === null || stats === void 0 ? void 0 : stats.leadPipelineValue).toBe(0);
        (0, globals_1.expect)(stats === null || stats === void 0 ? void 0 : stats.convertedLeads).toBe(0);
    });
});
// ============================================================================
// Test Suite: Project Analytics
// ============================================================================
(0, globals_1.describe)("Analytics: Project Triggers", () => {
    const period = "2026-01";
    (0, globals_1.beforeEach)(async () => {
        await clearCollection("projects");
        await clearCollection(`analytics/${TEST_ORG_ID}/monthly`);
    });
    (0, globals_1.it)("should track active projects", async () => {
        await db.collection("projects").add({
            orgId: TEST_ORG_ID,
            status: "active",
            name: "Project Alpha",
            createdAt: admin.firestore.Timestamp.fromDate(new Date(2026, 0, 15))
        });
        await waitForTrigger();
        const stats = await getStats(TEST_ORG_ID, period);
        (0, globals_1.expect)(stats === null || stats === void 0 ? void 0 : stats.activeProjects).toBe(1);
        (0, globals_1.expect)(stats === null || stats === void 0 ? void 0 : stats.completedProjects).toBe(0);
    });
    (0, globals_1.it)("should track project completion", async () => {
        const projectRef = await db.collection("projects").add({
            orgId: TEST_ORG_ID,
            status: "in_progress",
            name: "Project Beta",
            createdAt: admin.firestore.Timestamp.fromDate(new Date(2026, 0, 15))
        });
        await waitForTrigger();
        // Complete the project
        await projectRef.update({ status: "completed" });
        await waitForTrigger();
        const stats = await getStats(TEST_ORG_ID, period);
        (0, globals_1.expect)(stats === null || stats === void 0 ? void 0 : stats.activeProjects).toBe(0);
        (0, globals_1.expect)(stats === null || stats === void 0 ? void 0 : stats.completedProjects).toBe(1);
    });
});
// ============================================================================
// Test Suite: Multi-tenant Isolation
// ============================================================================
(0, globals_1.describe)("Analytics: Multi-tenant Isolation", () => {
    const period = "2026-01";
    const ORG_A = "org-a";
    const ORG_B = "org-b";
    (0, globals_1.beforeEach)(async () => {
        await clearCollection("invoices");
        await clearCollection(`analytics/${ORG_A}/monthly`);
        await clearCollection(`analytics/${ORG_B}/monthly`);
    });
    (0, globals_1.it)("should isolate stats between tenants", async () => {
        // Create invoice for Org A
        await db.collection("invoices").add({
            orgId: ORG_A,
            status: "sent",
            total: 1000,
            amountPaid: 500,
            date: admin.firestore.Timestamp.fromDate(new Date(2026, 0, 15))
        });
        // Create invoice for Org B
        await db.collection("invoices").add({
            orgId: ORG_B,
            status: "sent",
            total: 3000,
            amountPaid: 3000,
            date: admin.firestore.Timestamp.fromDate(new Date(2026, 0, 15))
        });
        await waitForTrigger();
        const statsA = await getStats(ORG_A, period);
        const statsB = await getStats(ORG_B, period);
        (0, globals_1.expect)(statsA === null || statsA === void 0 ? void 0 : statsA.totalRevenue).toBe(500);
        (0, globals_1.expect)(statsB === null || statsB === void 0 ? void 0 : statsB.totalRevenue).toBe(3000);
        (0, globals_1.expect)(statsA === null || statsA === void 0 ? void 0 : statsA.invoiceCount).toBe(1);
        (0, globals_1.expect)(statsB === null || statsB === void 0 ? void 0 : statsB.invoiceCount).toBe(1);
    });
});
//# sourceMappingURL=analytics.test.js.map