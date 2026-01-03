#!/usr/bin/env npx ts-node
/**
 * =============================================================================
 * Analytics Backfill Script for Dosory SaaS
 * =============================================================================
 * 
 * This script scans all historical data (invoices, payments, leads, customers,
 * projects) and computes monthly aggregated analytics for each tenant.
 * 
 * USAGE:
 *   # Dry run (no writes)
 *   npx ts-node scripts/backfill-analytics.ts --dry-run
 * 
 *   # Backfill specific org
 *   npx ts-node scripts/backfill-analytics.ts --org=org-123
 * 
 *   # Backfill specific date range
 *   npx ts-node scripts/backfill-analytics.ts --from=2024-01 --to=2026-01
 * 
 *   # Full production backfill
 *   npx ts-node scripts/backfill-analytics.ts --force
 * 
 *   # With emulator
 *   FIRESTORE_EMULATOR_HOST=localhost:8080 npx ts-node scripts/backfill-analytics.ts
 * 
 * FLAGS:
 *   --dry-run    Preview changes without writing to Firestore
 *   --org=ID     Process only a specific organization
 *   --from=MM    Start period (YYYY-MM), default: 24 months ago
 *   --to=MM      End period (YYYY-MM), default: current month
 *   --force      Overwrite existing analytics (default: skip if exists)
 *   --verbose    Show detailed per-document logging
 *   --batch=N    Batch size for writes (default: 500)
 * 
 * ENVIRONMENT:
 *   GOOGLE_APPLICATION_CREDENTIALS  Path to service account JSON
 *   FIRESTORE_EMULATOR_HOST         Use emulator (e.g., localhost:8080)
 * 
 * OUTPUT:
 *   Writes to: analytics/{orgId}/monthly/{YYYY-MM}
 * 
 * SAFETY:
 *   - By default, skips periods that already have analytics data
 *   - Use --force to overwrite existing data
 *   - Always test with --dry-run first
 */

import * as admin from "firebase-admin";

// =============================================================================
// Configuration
// =============================================================================

interface BackfillConfig {
    dryRun: boolean;
    orgId: string | null;
    fromPeriod: string;
    toPeriod: string;
    force: boolean;
    verbose: boolean;
    batchSize: number;
}

interface MonthlyStats {
    orgId: string;
    period: string;
    totalRevenue: number;
    paidRevenue: number;
    outstandingReceivables: number;
    invoiceCount: number;
    totalPayments: number;
    paymentCount: number;
    totalCustomers: number;
    newCustomers: number;
    totalLeads: number;
    convertedLeads: number;
    leadPipelineValue: number;
    leadConversionRate: number;
    activeProjects: number;
    completedProjects: number;
    totalTasks: number;
    completedTasks: number;
    updatedAt: admin.firestore.FieldValue;
    computedAt: admin.firestore.FieldValue;
    backfilled: boolean;
    backfilledAt: admin.firestore.FieldValue;
}

interface BackfillResult {
    org: string;
    period: string;
    status: "created" | "updated" | "skipped" | "error";
    stats?: Partial<MonthlyStats>;
    error?: string;
}

// =============================================================================
// Logging
// =============================================================================

const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    red: "\x1b[31m",
    cyan: "\x1b[36m"
};

function log(message: string, color: keyof typeof colors = "reset") {
    const timestamp = new Date().toISOString().substr(11, 8);
    console.log(`${colors.dim}[${timestamp}]${colors.reset} ${colors[color]}${message}${colors.reset}`);
}

function logHeader(message: string) {
    console.log(`\n${colors.bright}${colors.cyan}${"=".repeat(60)}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}  ${message}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}${"=".repeat(60)}${colors.reset}\n`);
}

function logStats(label: string, value: number | string, unit: string = "") {
    console.log(`  ${colors.dim}${label.padEnd(25)}${colors.reset} ${colors.bright}${value}${colors.reset} ${unit}`);
}

// =============================================================================
// Firebase Initialization
// =============================================================================

function initializeFirebase(): admin.firestore.Firestore {
    // Check for emulator
    if (process.env.FIRESTORE_EMULATOR_HOST) {
        log(`Using Firestore Emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`, "yellow");
        admin.initializeApp({ projectId: "dosory-dev" });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        log(`Using service account: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`, "blue");
        admin.initializeApp({
            credential: admin.credential.cert(process.env.GOOGLE_APPLICATION_CREDENTIALS)
        });
    } else {
        log("Using default credentials (Cloud environment)", "blue");
        admin.initializeApp();
    }

    return admin.firestore();
}

// =============================================================================
// Date Utilities
// =============================================================================

function parseConfig(): BackfillConfig {
    const args = process.argv.slice(2);
    const flags: Record<string, string | boolean> = {};

    args.forEach(arg => {
        if (arg.startsWith("--")) {
            const [key, value] = arg.replace("--", "").split("=");
            flags[key] = value ?? true;
        }
    });

    // Default: 24 months ago to current month
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 23, 1);
    const defaultFromPeriod = `${defaultFrom.getFullYear()}-${String(defaultFrom.getMonth() + 1).padStart(2, "0")}`;
    const defaultToPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    return {
        dryRun: flags["dry-run"] === true,
        orgId: typeof flags["org"] === "string" ? flags["org"] : null,
        fromPeriod: typeof flags["from"] === "string" ? flags["from"] : defaultFromPeriod,
        toPeriod: typeof flags["to"] === "string" ? flags["to"] : defaultToPeriod,
        force: flags["force"] === true,
        verbose: flags["verbose"] === true,
        batchSize: typeof flags["batch"] === "string" ? parseInt(flags["batch"]) : 500
    };
}

function generatePeriods(from: string, to: string): string[] {
    const periods: string[] = [];
    const [fromYear, fromMonth] = from.split("-").map(Number);
    const [toYear, toMonth] = to.split("-").map(Number);

    let current = new Date(fromYear, fromMonth - 1, 1);
    const end = new Date(toYear, toMonth - 1, 1);

    while (current <= end) {
        periods.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`);
        current.setMonth(current.getMonth() + 1);
    }

    return periods;
}

function getPeriodBounds(period: string): { start: Date; end: Date } {
    const [year, month] = period.split("-").map(Number);
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month
    return { start, end };
}

// =============================================================================
// Data Aggregation Functions
// =============================================================================

async function aggregateInvoices(
    db: admin.firestore.Firestore,
    orgId: string,
    start: Date,
    end: Date,
    verbose: boolean
): Promise<{ totalRevenue: number; outstandingReceivables: number; invoiceCount: number }> {
    const result = { totalRevenue: 0, outstandingReceivables: 0, invoiceCount: 0 };

    const snap = await db.collection("invoices")
        .where("orgId", "==", orgId)
        .where("date", ">=", admin.firestore.Timestamp.fromDate(start))
        .where("date", "<=", admin.firestore.Timestamp.fromDate(end))
        .get();

    snap.docs.forEach(doc => {
        const inv = doc.data();
        if (inv.status !== "void" && inv.status !== "draft") {
            result.invoiceCount++;
            result.totalRevenue += inv.amountPaid || 0;
            result.outstandingReceivables += (inv.total || 0) - (inv.amountPaid || 0);
        }
    });

    if (verbose && snap.size > 0) {
        log(`    Invoices: ${snap.size} found, ${result.invoiceCount} valid`, "dim");
    }

    return result;
}

async function aggregatePayments(
    db: admin.firestore.Firestore,
    orgId: string,
    start: Date,
    end: Date,
    verbose: boolean
): Promise<{ totalPayments: number; paymentCount: number }> {
    const result = { totalPayments: 0, paymentCount: 0 };

    const snap = await db.collection("payments")
        .where("orgId", "==", orgId)
        .where("date", ">=", admin.firestore.Timestamp.fromDate(start))
        .where("date", "<=", admin.firestore.Timestamp.fromDate(end))
        .get();

    snap.docs.forEach(doc => {
        const pmt = doc.data();
        result.totalPayments += pmt.amount || 0;
        result.paymentCount++;
    });

    if (verbose && result.paymentCount > 0) {
        log(`    Payments: ${result.paymentCount} totaling $${result.totalPayments}`, "dim");
    }

    return result;
}

async function aggregateCustomers(
    db: admin.firestore.Firestore,
    orgId: string,
    start: Date,
    end: Date,
    verbose: boolean
): Promise<{ totalCustomers: number; newCustomers: number }> {
    const result = { totalCustomers: 0, newCustomers: 0 };

    const snap = await db.collection("customers")
        .where("orgId", "==", orgId)
        .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(start))
        .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(end))
        .get();

    snap.docs.forEach(doc => {
        const cust = doc.data();
        if (cust.status !== "archived" && cust.status !== "deleted") {
            result.totalCustomers++;
            result.newCustomers++;
        }
    });

    if (verbose && result.newCustomers > 0) {
        log(`    Customers: ${result.newCustomers} new`, "dim");
    }

    return result;
}

async function aggregateLeads(
    db: admin.firestore.Firestore,
    orgId: string,
    start: Date,
    end: Date,
    verbose: boolean
): Promise<{ totalLeads: number; convertedLeads: number; leadPipelineValue: number }> {
    const result = { totalLeads: 0, convertedLeads: 0, leadPipelineValue: 0 };

    const snap = await db.collection("leads")
        .where("orgId", "==", orgId)
        .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(start))
        .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(end))
        .get();

    snap.docs.forEach(doc => {
        const lead = doc.data();
        result.totalLeads++;
        if (lead.status === "converted" || lead.status === "won") {
            result.convertedLeads++;
        }
        if (!["converted", "won", "lost", "archived"].includes(lead.status)) {
            result.leadPipelineValue += lead.value || 0;
        }
    });

    if (verbose && result.totalLeads > 0) {
        log(`    Leads: ${result.totalLeads} total, ${result.convertedLeads} converted`, "dim");
    }

    return result;
}

async function aggregateProjects(
    db: admin.firestore.Firestore,
    orgId: string,
    start: Date,
    end: Date,
    verbose: boolean
): Promise<{ activeProjects: number; completedProjects: number }> {
    const result = { activeProjects: 0, completedProjects: 0 };

    const snap = await db.collection("projects")
        .where("orgId", "==", orgId)
        .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(start))
        .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(end))
        .get();

    snap.docs.forEach(doc => {
        const proj = doc.data();
        if (["active", "in_progress", "in-progress"].includes(proj.status)) {
            result.activeProjects++;
        }
        if (["completed", "done", "finished"].includes(proj.status)) {
            result.completedProjects++;
        }
    });

    if (verbose && snap.size > 0) {
        log(`    Projects: ${result.activeProjects} active, ${result.completedProjects} completed`, "dim");
    }

    return result;
}

async function aggregateTasks(
    db: admin.firestore.Firestore,
    orgId: string,
    start: Date,
    end: Date,
    verbose: boolean
): Promise<{ totalTasks: number; completedTasks: number }> {
    const result = { totalTasks: 0, completedTasks: 0 };

    const snap = await db.collection("tasks")
        .where("orgId", "==", orgId)
        .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(start))
        .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(end))
        .get();

    snap.docs.forEach(doc => {
        const task = doc.data();
        result.totalTasks++;
        if (["completed", "done", "closed"].includes(task.status)) {
            result.completedTasks++;
        }
    });

    if (verbose && result.totalTasks > 0) {
        log(`    Tasks: ${result.totalTasks} total, ${result.completedTasks} completed`, "dim");
    }

    return result;
}

// =============================================================================
// Main Backfill Logic
// =============================================================================

async function computeAnalyticsForPeriod(
    db: admin.firestore.Firestore,
    orgId: string,
    period: string,
    verbose: boolean
): Promise<MonthlyStats> {
    const { start, end } = getPeriodBounds(period);

    // Run all aggregations in parallel
    const [invoices, payments, customers, leads, projects, tasks] = await Promise.all([
        aggregateInvoices(db, orgId, start, end, verbose),
        aggregatePayments(db, orgId, start, end, verbose),
        aggregateCustomers(db, orgId, start, end, verbose),
        aggregateLeads(db, orgId, start, end, verbose),
        aggregateProjects(db, orgId, start, end, verbose),
        aggregateTasks(db, orgId, start, end, verbose)
    ]);

    // Calculate derived metrics
    const leadConversionRate = leads.totalLeads > 0
        ? Math.round((leads.convertedLeads / leads.totalLeads) * 10000) / 100
        : 0;

    return {
        orgId,
        period,
        totalRevenue: invoices.totalRevenue,
        paidRevenue: invoices.totalRevenue,
        outstandingReceivables: invoices.outstandingReceivables,
        invoiceCount: invoices.invoiceCount,
        totalPayments: payments.totalPayments,
        paymentCount: payments.paymentCount,
        totalCustomers: customers.totalCustomers,
        newCustomers: customers.newCustomers,
        totalLeads: leads.totalLeads,
        convertedLeads: leads.convertedLeads,
        leadPipelineValue: leads.leadPipelineValue,
        leadConversionRate,
        activeProjects: projects.activeProjects,
        completedProjects: projects.completedProjects,
        totalTasks: tasks.totalTasks,
        completedTasks: tasks.completedTasks,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        computedAt: admin.firestore.FieldValue.serverTimestamp(),
        backfilled: true,
        backfilledAt: admin.firestore.FieldValue.serverTimestamp()
    };
}

async function backfillOrganization(
    db: admin.firestore.Firestore,
    orgId: string,
    periods: string[],
    config: BackfillConfig
): Promise<BackfillResult[]> {
    const results: BackfillResult[] = [];

    log(`Processing org: ${orgId} (${periods.length} periods)`, "blue");

    for (const period of periods) {
        try {
            const statsRef = db.collection("analytics").doc(orgId).collection("monthly").doc(period);

            // Check if analytics already exist
            const existing = await statsRef.get();
            if (existing.exists && !config.force) {
                if (config.verbose) {
                    log(`  ${period}: Skipped (already exists)`, "dim");
                }
                results.push({ org: orgId, period, status: "skipped" });
                continue;
            }

            // Compute analytics
            if (config.verbose) {
                log(`  ${period}: Computing...`, "dim");
            }

            const stats = await computeAnalyticsForPeriod(db, orgId, period, config.verbose);

            // Check if there's any data
            const hasData = stats.invoiceCount > 0 || stats.newCustomers > 0 ||
                stats.totalLeads > 0 || stats.activeProjects > 0;

            if (!hasData) {
                // Store zeros for empty months to mark as processed
                if (config.verbose) {
                    log(`  ${period}: No data for this period`, "dim");
                }
            }

            if (config.dryRun) {
                results.push({ org: orgId, period, status: "created", stats });
                logStats(`  ${period}`, `$${stats.totalRevenue}`, `revenue, ${stats.invoiceCount} invoices`);
            } else {
                await statsRef.set(stats);
                results.push({ org: orgId, period, status: existing.exists ? "updated" : "created", stats });
                log(`  ${period}: ✓`, "green");
            }

        } catch (error: any) {
            log(`  ${period}: ERROR - ${error.message}`, "red");
            results.push({ org: orgId, period, status: "error", error: error.message });
        }
    }

    return results;
}

async function runBackfill(config: BackfillConfig): Promise<void> {
    const startTime = Date.now();

    logHeader("Dosory Analytics Backfill");

    // Show configuration
    console.log(`${colors.bright}Configuration:${colors.reset}`);
    logStats("Mode", config.dryRun ? "DRY RUN (no writes)" : "LIVE", "");
    logStats("Organization", config.orgId || "All organizations", "");
    logStats("Period Range", `${config.fromPeriod} to ${config.toPeriod}`, "");
    logStats("Force Overwrite", config.force ? "Yes" : "No", "");
    logStats("Batch Size", config.batchSize, "");
    console.log("");

    // Initialize Firebase
    const db = initializeFirebase();
    log("Firebase initialized", "green");

    // Generate periods
    const periods = generatePeriods(config.fromPeriod, config.toPeriod);
    log(`Generated ${periods.length} periods to process`, "blue");

    // Get organizations to process
    let orgIds: string[] = [];
    if (config.orgId) {
        orgIds = [config.orgId];
    } else {
        const orgsSnap = await db.collection("organizations").get();
        orgIds = orgsSnap.docs.map(d => d.id);
    }

    log(`Processing ${orgIds.length} organization(s)`, "blue");
    console.log("");

    // Runtime estimate
    const estimatedSeconds = orgIds.length * periods.length * 0.5; // ~0.5s per period
    log(`Estimated runtime: ${Math.ceil(estimatedSeconds / 60)} minutes`, "yellow");
    console.log("");

    // Process each organization
    const allResults: BackfillResult[] = [];
    let processedOrgs = 0;

    for (const orgId of orgIds) {
        const results = await backfillOrganization(db, orgId, periods, config);
        allResults.push(...results);
        processedOrgs++;

        // Progress
        const progress = Math.round((processedOrgs / orgIds.length) * 100);
        log(`Progress: ${progress}% (${processedOrgs}/${orgIds.length} orgs)`, "cyan");
    }

    // Summary
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const created = allResults.filter(r => r.status === "created").length;
    const updated = allResults.filter(r => r.status === "updated").length;
    const skipped = allResults.filter(r => r.status === "skipped").length;
    const errors = allResults.filter(r => r.status === "error").length;

    logHeader("Backfill Complete");

    logStats("Total Organizations", orgIds.length, "");
    logStats("Total Periods", periods.length, "");
    logStats("Records Created", created, "");
    logStats("Records Updated", updated, "");
    logStats("Records Skipped", skipped, "");
    logStats("Errors", errors, "");
    logStats("Elapsed Time", elapsed, "seconds");

    if (config.dryRun) {
        console.log(`\n${colors.yellow}${colors.bright}DRY RUN - No data was written.${colors.reset}`);
        console.log(`${colors.dim}Run without --dry-run to apply changes.${colors.reset}`);
    }

    if (errors > 0) {
        console.log(`\n${colors.red}Errors encountered:${colors.reset}`);
        allResults.filter(r => r.status === "error").slice(0, 10).forEach(r => {
            console.log(`  ${r.org}/${r.period}: ${r.error}`);
        });
    }
}

// =============================================================================
// Entry Point
// =============================================================================

async function main() {
    try {
        const config = parseConfig();

        // Show help
        if (process.argv.includes("--help") || process.argv.includes("-h")) {
            console.log(`
Analytics Backfill Script

Usage:
  npx ts-node scripts/backfill-analytics.ts [options]

Options:
  --dry-run          Preview changes without writing
  --org=<id>         Process only specified organization
  --from=<YYYY-MM>   Start period (default: 24 months ago)
  --to=<YYYY-MM>     End period (default: current month)
  --force            Overwrite existing analytics
  --verbose          Show detailed logging
  --batch=<N>        Batch size for writes (default: 500)
  --help             Show this help

Examples:
  # Dry run for all orgs
  npx ts-node scripts/backfill-analytics.ts --dry-run

  # Backfill specific org
  npx ts-node scripts/backfill-analytics.ts --org=org-123 --verbose

  # Force overwrite last 6 months
  npx ts-node scripts/backfill-analytics.ts --from=2025-07 --force

  # Use emulator
  FIRESTORE_EMULATOR_HOST=localhost:8080 npx ts-node scripts/backfill-analytics.ts
            `);
            process.exit(0);
        }

        await runBackfill(config);
        process.exit(0);

    } catch (error: any) {
        console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
