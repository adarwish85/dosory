/**
 * Analytics Types for Dosory SaaS
 * 
 * Firestore Path: analytics/{orgId}/monthly/{YYYY-MM}
 */

import { Timestamp } from "firebase-admin/firestore";

/**
 * Monthly aggregated statistics for a tenant
 */
export interface MonthlyStats {
    // Identifier
    orgId: string;
    period: string;  // Format: "YYYY-MM" (e.g., "2026-01")

    // ==========================================================================
    // REVENUE METRICS
    // ==========================================================================

    /** Total revenue collected (sum of amountPaid from invoices) */
    totalRevenue: number;

    /** Alias for totalRevenue, used for clarity in reports */
    paidRevenue: number;

    /** Outstanding amount (total - amountPaid) from all invoices */
    outstandingReceivables: number;

    /** Number of invoices (excluding void and draft) */
    invoiceCount: number;

    /** Total payments received (from payments collection) */
    totalPayments?: number;

    /** Number of payment records */
    paymentCount?: number;

    // ==========================================================================
    // CUSTOMER METRICS
    // ==========================================================================

    /** Total active customers at end of period */
    totalCustomers: number;

    /** New customers created during this period */
    newCustomers: number;

    /** Customer churn (optional, calculated externally) */
    churnedCustomers?: number;

    /** Net customer growth: newCustomers - churnedCustomers */
    customerGrowth?: number;

    // ==========================================================================
    // LEAD METRICS
    // ==========================================================================

    /** Total leads created during this period */
    totalLeads: number;

    /** Leads converted to customers/won */
    convertedLeads: number;

    /** Conversion rate: convertedLeads / totalLeads * 100 (calculated daily) */
    leadConversionRate: number;

    /** Pipeline value: sum of value from active leads */
    leadPipelineValue: number;

    /** Leads lost during this period */
    lostLeads?: number;

    // ==========================================================================
    // PROJECT METRICS
    // ==========================================================================

    /** Projects with status: active, in_progress, in-progress */
    activeProjects: number;

    /** Projects with status: completed, done, finished */
    completedProjects: number;

    /** Projects past due date but not completed (optional, calculated) */
    overdueProjects?: number;

    /** Total hours logged (from timesheets) */
    totalHoursLogged?: number;

    // ==========================================================================
    // METADATA
    // ==========================================================================

    /** Last updated timestamp (updated on each trigger) */
    updatedAt: Timestamp;

    /** Last computed timestamp (updated by daily snapshot) */
    computedAt?: Timestamp;

    /** Whether this period has been finalized (no more changes expected) */
    finalized?: boolean;

    /** When the period was finalized */
    finalizedAt?: Timestamp;

    /** Whether this document was manually recalculated */
    recalculated?: boolean;
}

/**
 * Query options for fetching analytics
 */
export interface AnalyticsQueryOptions {
    orgId: string;

    /** Specific period to fetch (YYYY-MM) */
    period?: string;

    /** Start period for range queries */
    startPeriod?: string;

    /** End period for range queries */
    endPeriod?: string;

    /** Number of periods to return */
    limit?: number;
}

/**
 * Analytics summary for dashboards
 */
export interface AnalyticsDashboard {
    // Current period stats
    current: MonthlyStats;

    // Previous period for comparison
    previous?: MonthlyStats;

    // Trends (% change)
    trends: {
        revenue: number;
        customers: number;
        leads: number;
        projects: number;
    };

    // Time series for charts
    series: MonthlyStats[];
}

/**
 * Example: How to query analytics
 * 
 * ```typescript
 * // Get current month stats
 * const currentPeriod = "2026-01";
 * const statsRef = db.collection("analytics")
 *     .doc(orgId)
 *     .collection("monthly")
 *     .doc(currentPeriod);
 * 
 * // Get last 12 months for chart
 * const seriesSnap = await db.collection("analytics")
 *     .doc(orgId)
 *     .collection("monthly")
 *     .orderBy("period", "desc")
 *     .limit(12)
 *     .get();
 * ```
 */
