#!/usr/bin/env npx ts-node
/**
 * Analytics CLI Tool for Dosory SaaS
 * 
 * Usage:
 *   npx ts-node scripts/analytics-cli.ts recalculate --org=org-123 --period=2026-01
 *   npx ts-node scripts/analytics-cli.ts summary --org=org-123
 *   npx ts-node scripts/analytics-cli.ts cleanup --months=24
 *   npx ts-node scripts/analytics-cli.ts backfill --org=org-123 --start=2025-01 --end=2026-01
 * 
 * Environment:
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin
const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (serviceAccount) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} else {
    // Use default credentials (for Cloud environments)
    admin.initializeApp();
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// =============================================================================
// Command: recalculate
// =============================================================================

async function recalculatePeriod(orgId: string, period: string): Promise<void> {
    console.log(`\nRecalculating analytics for ${orgId}/${period}...`);

    const [year, month] = period.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

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
    console.log("  Aggregating invoices...");
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
    console.log(`    Found ${invoicesSnap.size} invoices, ${stats.invoiceCount} valid`);

    // Aggregate payments
    console.log("  Aggregating payments...");
    const paymentsSnap = await db.collection("payments")
        .where("orgId", "==", orgId)
        .where("date", ">=", admin.firestore.Timestamp.fromDate(startDate))
        .where("date", "<=", admin.firestore.Timestamp.fromDate(endDate))
        .get();

    paymentsSnap.docs.forEach(doc => {
        const pmt = doc.data();
        stats.totalPayments += pmt.amount || 0;
        stats.paymentCount++;
    });
    console.log(`    Found ${stats.paymentCount} payments, total $${stats.totalPayments}`);

    // Aggregate customers
    console.log("  Aggregating customers...");
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
    console.log(`    Found ${stats.newCustomers} new customers`);

    // Aggregate leads
    console.log("  Aggregating leads...");
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
    console.log(`    Found ${stats.totalLeads} leads, ${stats.convertedLeads} converted`);

    // Aggregate projects
    console.log("  Aggregating projects...");
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
    console.log(`    Found ${stats.activeProjects} active, ${stats.completedProjects} completed projects`);

    // Calculate derived metrics
    const conversionRate = stats.totalLeads > 0
        ? Math.round((stats.convertedLeads / stats.totalLeads) * 10000) / 100
        : 0;

    // Save
    const statsRef = db.collection("analytics").doc(orgId)
        .collection("monthly").doc(period);

    await statsRef.set({
        ...stats,
        leadConversionRate: conversionRate
    });

    console.log(`\n✅ Saved analytics for ${orgId}/${period}`);
    console.log(`   Revenue: $${stats.totalRevenue}, Outstanding: $${stats.outstandingReceivables}`);
    console.log(`   Customers: ${stats.newCustomers}, Leads: ${stats.totalLeads} (${conversionRate}% conversion)`);
}

// =============================================================================
// Command: summary
// =============================================================================

async function showSummary(orgId: string): Promise<void> {
    console.log(`\nAnalytics Summary for ${orgId}\n${"=".repeat(50)}`);

    const monthlySnap = await db.collection("analytics")
        .doc(orgId)
        .collection("monthly")
        .orderBy("period", "desc")
        .limit(12)
        .get();

    if (monthlySnap.empty) {
        console.log("No analytics data found.");
        return;
    }

    console.log("\nPeriod      | Revenue    | Receivables | Invoices | Customers | Leads | Conv%");
    console.log("-".repeat(85));

    monthlySnap.docs.forEach(doc => {
        const s = doc.data();
        console.log(
            `${s.period.padEnd(11)} | ` +
            `$${(s.totalRevenue || 0).toLocaleString().padStart(9)} | ` +
            `$${(s.outstandingReceivables || 0).toLocaleString().padStart(10)} | ` +
            `${String(s.invoiceCount || 0).padStart(8)} | ` +
            `${String(s.newCustomers || 0).padStart(9)} | ` +
            `${String(s.totalLeads || 0).padStart(5)} | ` +
            `${String(s.leadConversionRate || 0).padStart(5)}%`
        );
    });
}

// =============================================================================
// Command: cleanup
// =============================================================================

async function cleanupOldData(monthsToKeep: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsToKeep);
    const cutoffPeriod = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, "0")}`;

    console.log(`\nCleaning up analytics data older than ${cutoffPeriod}...`);

    const orgsSnap = await db.collection("organizations").get();
    let totalDeleted = 0;

    for (const orgDoc of orgsSnap.docs) {
        const monthlyRef = db.collection("analytics").doc(orgDoc.id).collection("monthly");
        const oldDocs = await monthlyRef.where("period", "<", cutoffPeriod).get();

        if (oldDocs.empty) continue;

        const batch = db.batch();
        oldDocs.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        console.log(`  Deleted ${oldDocs.size} docs for ${orgDoc.id}`);
        totalDeleted += oldDocs.size;
    }

    console.log(`\n✅ Cleanup complete. Deleted ${totalDeleted} documents.`);
}

// =============================================================================
// Command: backfill
// =============================================================================

async function backfillRange(orgId: string, startPeriod: string, endPeriod: string): Promise<void> {
    console.log(`\nBackfilling analytics for ${orgId} from ${startPeriod} to ${endPeriod}...`);

    const [startYear, startMonth] = startPeriod.split("-").map(Number);
    const [endYear, endMonth] = endPeriod.split("-").map(Number);

    let current = new Date(startYear, startMonth - 1, 1);
    const end = new Date(endYear, endMonth - 1, 1);

    while (current <= end) {
        const period = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
        await recalculatePeriod(orgId, period);
        current.setMonth(current.getMonth() + 1);
    }

    console.log(`\n✅ Backfill complete!`);
}

// =============================================================================
// Main CLI
// =============================================================================

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    // Parse flags
    const flags: Record<string, string> = {};
    args.slice(1).forEach(arg => {
        const [key, value] = arg.replace("--", "").split("=");
        flags[key] = value;
    });

    switch (command) {
        case "recalculate":
            if (!flags.org || !flags.period) {
                console.error("Usage: recalculate --org=<orgId> --period=<YYYY-MM>");
                process.exit(1);
            }
            await recalculatePeriod(flags.org, flags.period);
            break;

        case "summary":
            if (!flags.org) {
                console.error("Usage: summary --org=<orgId>");
                process.exit(1);
            }
            await showSummary(flags.org);
            break;

        case "cleanup":
            const months = parseInt(flags.months || "24");
            await cleanupOldData(months);
            break;

        case "backfill":
            if (!flags.org || !flags.start || !flags.end) {
                console.error("Usage: backfill --org=<orgId> --start=<YYYY-MM> --end=<YYYY-MM>");
                process.exit(1);
            }
            await backfillRange(flags.org, flags.start, flags.end);
            break;

        default:
            console.log(`
Analytics CLI Tool

Commands:
  recalculate --org=<orgId> --period=<YYYY-MM>
      Recalculate analytics for a specific month

  summary --org=<orgId>
      Show analytics summary for last 12 months

  cleanup --months=<N>
      Delete analytics older than N months (default: 24)

  backfill --org=<orgId> --start=<YYYY-MM> --end=<YYYY-MM>
      Recalculate all months in a range
            `);
    }

    process.exit(0);
}

main().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
