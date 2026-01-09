import { db } from "@/lib/firebase";
import { ReportResponse, ReportFilter } from "@/lib/types/reports";
import { JournalLine } from "@/lib/types/finance";
import {
    collection,
    query,
    where,
    getDocs,
    Timestamp,
    // orderBy
} from "firebase/firestore";
import { startOfMonth, endOfMonth } from "date-fns";

export class ReportsService {
    /**
     * Get Business Health Overview
     * Aggregates Revenue, Expenses, Net Profit, and Active Projects
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getBusinessHealth(_filter: ReportFilter): Promise<ReportResponse> {
        try {
            // Define date range
            // const now = new Date();
            // const startDate = filter.startDate || startOfMonth(now);
            // const endDate = filter.endDate || endOfMonth(now);

            // 1. Aggregations (Mocked for now)
            // TODO: Replace with real Firestore aggregations
            // const invoicesRef = collection(db, "invoices");
            // const expensesRef = collection(db, "expenses");
            // const projectsRef = collection(db, "projects");

            // Mock Data for Demo
            const kpis = {
                revenue: { value: 125000, change: 12, label: "Revenue", prefix: "$", trend: "up" as const },
                expenses: { value: 45000, change: -5, label: "Expenses", prefix: "$", trend: "down" as const },
                netProfit: { value: 80000, change: 25, label: "Net Profit", prefix: "$", trend: "up" as const },
                activeProjects: { value: 14, change: 2, label: "Active Projects", trend: "up" as const },
            };

            const series = [
                { date: "Jan", revenue: 90000, expenses: 40000, netProfit: 50000 },
                { date: "Feb", revenue: 110000, expenses: 42000, netProfit: 68000 },
                { date: "Mar", revenue: 125000, expenses: 45000, netProfit: 80000 },
            ];

            return {
                kpis,
                series,
                breakdowns: [],
                table: {
                    columns: [],
                    rows: [],
                    total: 0,
                },
            };
        } catch (error) {
            console.error("Error fetching business health:", error);
            return this.getEmptyResponse();
        }
    }

    /**
     * Get Sales Pipeline Report
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getSalesPipeline(_filter: ReportFilter): Promise<ReportResponse> {
        try {
            // TODO: Implement Real Firestore Aggregation
            // Expected Collection: "deals"
            // Fields: stage, amount, probability, closeDate, createdAt

            // Mock Data for Demo
            const kpis = {
                pipelineValue: {
                    label: "Pipeline Value",
                    value: 1540000,
                    prefix: "$",
                    trend: "up" as const,
                    change: 8,
                },
                weightedValue: { label: "Weighted Value", value: 850000, prefix: "$", trend: "up" as const },
                winRate: { label: "Win Rate", value: 24, suffix: "%", trend: "neutral" as const },
                avgSalesCycle: { label: "Avg Sales Cycle", value: 45, suffix: "d", trend: "down" as const, change: -2 },
            };

            const series = [
                { stage: "Lead", value: 50, amount: 500000 },
                { stage: "Qualified", value: 30, amount: 600000 },
                { stage: "Proposal", value: 15, amount: 300000 },
                { stage: "Negotiation", value: 8, amount: 100000 },
                { stage: "Closed Won", value: 12, amount: 40000 },
            ];

            const breakdowns = series.map((s) => ({ label: s.stage, value: s.amount }));

            return {
                kpis,
                series, // Used for Funnel/Bar
                breakdowns,
                table: {
                    columns: [
                        { key: "stage", label: "Stage" },
                        { key: "count", label: "Deals", type: "number" },
                        { key: "value", label: "Value", type: "currency" },
                    ],
                    rows: series.map((s) => ({ stage: s.stage, count: s.value, value: s.amount })),
                    total: 5,
                },
            };
        } catch (error) {
            console.error("Error fetching sales pipeline:", error);
            return this.getEmptyResponse();
        }
    }

    /**
     * Get Revenue Summary Report
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getRevenueSummary(_filter: ReportFilter): Promise<ReportResponse> {
        try {
            // TODO: Real Firestore Aggregation on 'invoices' collection

            const kpis = {
                totalRevenue: { label: "Total Revenue", value: 450000, prefix: "$", trend: "up" as const, change: 15 },
                paidInvoices: { label: "Paid Invoices", value: 380000, prefix: "$", trend: "up" as const },
                outstanding: { label: "Outstanding (AR)", value: 70000, prefix: "$", trend: "down" as const }, // Good that AR is down? context dependent, usually good.
                avgInvoice: { label: "Avg Invoice Value", value: 3500, prefix: "$", trend: "neutral" as const },
            };

            const series = [
                { date: "Jan", revenue: 100000, paid: 90000 },
                { date: "Feb", revenue: 120000, paid: 110000 },
                { date: "Mar", revenue: 115000, paid: 80000 }, // High outstanding
                { date: "Apr", revenue: 115000, paid: 100000 },
            ];

            const customerBreakdown = [
                { label: "Acme Corp", value: 85000 },
                { label: "Globex Inc", value: 65000 },
                { label: "Soylent Corp", value: 45000 },
                { label: "Initech", value: 30000 },
                { label: "Umbrella Corp", value: 25000 },
            ];

            return {
                kpis,
                series,
                breakdowns: customerBreakdown,
                table: {
                    columns: [
                        { key: "customer", label: "Customer" },
                        { key: "revenue", label: "Total Revenue", type: "currency" },
                        { key: "paid", label: "Paid", type: "currency" },
                        { key: "outstanding", label: "Outstanding", type: "currency" },
                    ],
                    rows: [
                        { customer: "Acme Corp", revenue: 85000, paid: 80000, outstanding: 5000 },
                        { customer: "Globex Inc", revenue: 65000, paid: 60000, outstanding: 5000 },
                        { customer: "Soylent Corp", revenue: 45000, paid: 30000, outstanding: 15000 },
                        { customer: "Initech", revenue: 30000, paid: 30000, outstanding: 0 },
                        { customer: "Umbrella Corp", revenue: 25000, paid: 20000, outstanding: 5000 },
                    ],
                    total: 5,
                },
            };
        } catch (error) {
            console.error("Error fetching revenue summary:", error);
            return this.getEmptyResponse();
        }
    }
    /**
     * Get Invoices Report
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getInvoicesReport(_filter: ReportFilter): Promise<ReportResponse> {
        try {
            // TODO: Real Firestore Aggregation

            const kpis = {
                totalInvoiced: { label: "Total Invoiced", value: 520000, prefix: "$", trend: "up" as const },
                paid: { label: "Paid Amount", value: 380000, prefix: "$", trend: "up" as const },
                overdueAmount: { label: "Overdue Amount", value: 45000, prefix: "$", trend: "down" as const },
                overdueCount: { label: "Overdue Count", value: 12, trend: "down" as const },
            };

            const series = [
                { date: "Jan", invoiced: 110000, paid: 90000 },
                { date: "Feb", invoiced: 130000, paid: 110000 },
                { date: "Mar", invoiced: 140000, paid: 80000 },
                { date: "Apr", invoiced: 140000, paid: 100000 },
            ];

            const statusBreakdown = [
                { label: "Paid", value: 380000 },
                { label: "Pending", value: 95000 },
                { label: "Overdue", value: 45000 },
                { label: "Draft", value: 15000 },
            ];

            return {
                kpis,
                series,
                breakdowns: statusBreakdown,
                table: {
                    columns: [
                        { key: "status", label: "Status" },
                        { key: "count", label: "Count", type: "number" },
                        { key: "value", label: "Total Value", type: "currency" },
                        { key: "percent", label: "Percent", type: "percent" },
                    ],
                    rows: [
                        { status: "Paid", count: 85, value: 380000, percent: 71 },
                        { status: "Pending", count: 20, value: 95000, percent: 18 },
                        { status: "Overdue", count: 12, value: 45000, percent: 8 },
                        { status: "Draft", count: 5, value: 15000, percent: 3 },
                    ],
                    total: 4,
                },
            };
        } catch (error) {
            console.error("Error fetching invoices report:", error);
            return this.getEmptyResponse();
        }
    }

    /**
     * Get Profit & Loss Report
     */
    async getProfitAndLoss(filter: ReportFilter): Promise<ReportResponse> {
        try {
            if (!filter.orgId) return this.getEmptyResponse();

            const startDate = filter.startDate || startOfMonth(new Date());
            const endDate = filter.endDate || endOfMonth(new Date());

            // 1. Fetch Accounts for mapping
            const accQ = query(collection(db, "accounts"), where("orgId", "==", filter.orgId));
            const accSnap = await getDocs(accQ);
            const accountMap = new Map<string, { name: string; type: string }>();
            accSnap.docs.forEach((d) => {
                const data = d.data();
                accountMap.set(d.id, { name: data.name, type: data.type });
            });

            // 2. Fetch Journal Entries
            const jeQ = query(
                collection(db, "journal_entries"),
                where("orgId", "==", filter.orgId),
                where("date", ">=", Timestamp.fromDate(startDate)),
                where("date", "<=", Timestamp.fromDate(endDate))
            );
            const jeSnap = await getDocs(jeQ);

            // 3. Aggregate
            let totalIncome = 0;
            let totalExpenses = 0;
            const categoryTotals: Record<string, number> = {};
            const monthlyStats: Record<string, { income: number; expenses: number }> = {};

            jeSnap.docs.forEach((d) => {
                const je = d.data();
                const date = je.date.toDate();
                const monthKey = `${date.toLocaleString("default", { month: "short" })}`;

                if (!monthlyStats[monthKey]) monthlyStats[monthKey] = { income: 0, expenses: 0 };

                je.lines.forEach((line: JournalLine) => {
                    const acc = accountMap.get(line.accountId);
                    if (!acc) return;

                    let amount = 0;
                    if (acc.type === "income") {
                        amount = line.credit - line.debit;
                        totalIncome += amount;
                        monthlyStats[monthKey].income += amount;
                    } else if (acc.type === "expense") {
                        amount = line.debit - line.credit;
                        totalExpenses += amount;
                        monthlyStats[monthKey].expenses += amount;
                    }

                    if (amount !== 0 && (acc.type === "income" || acc.type === "expense")) {
                        categoryTotals[acc.name] = (categoryTotals[acc.name] || 0) + amount;
                    }
                });
            });

            const netProfit = totalIncome - totalExpenses;

            // 4. Format for UI
            const series = Object.entries(monthlyStats).map(([date, stats]) => ({
                date,
                income: stats.income,
                expenses: stats.expenses,
                netProfit: stats.income - stats.expenses,
            }));

            // Breakdown (Expenses only usually preferred for breakdown charts, or both)
            const breakdowns = Object.entries(categoryTotals)
                .map(([label, value]) => ({ label, value }))
                .sort((a, b) => b.value - a.value);

            return {
                kpis: {
                    revenue: { label: "Total Revenue", value: totalIncome, prefix: "$", trend: "up" }, // Helper needed for trend
                    expenses: { label: "Total Expenses", value: totalExpenses, prefix: "$", trend: "down" },
                    netProfit: {
                        label: "Net Profit",
                        value: netProfit,
                        prefix: "$",
                        trend: netProfit >= 0 ? "up" : "down",
                    },
                },
                series,
                breakdowns, // Shows Mix of Income/Expense categories
                table: {
                    columns: [
                        { key: "category", label: "Category" },
                        { key: "value", label: "Amount", type: "currency" },
                        { key: "percent", label: "% of Rev", type: "percent" },
                    ],
                    rows: breakdowns.map((b) => ({
                        category: b.label,
                        value: b.value,
                        percent: totalIncome > 0 ? (b.value / totalIncome) * 100 : 0,
                    })),
                    total: breakdowns.length,
                },
            };
        } catch (error) {
            console.error("Error generating P&L:", error);
            return this.getEmptyResponse();
        }
    }

    /**
     * Get Balance Sheet Report
     */
    async getBalanceSheet(filter: ReportFilter): Promise<ReportResponse> {
        try {
            if (!filter.orgId) return this.getEmptyResponse();

            // fetch all accounts
            const accQ = query(collection(db, "accounts"), where("orgId", "==", filter.orgId));
            const accSnap = await getDocs(accQ);

            let assets = 0;
            let liabilities = 0;
            let equity = 0;
            let calculatedNetIncome = 0;

            const categoryTotals: Record<string, number> = {};

            accSnap.docs.forEach((d) => {
                const acc = d.data();
                const bal = Number(acc.balance || 0);

                if (acc.type === "asset") {
                    assets += bal;
                    categoryTotals["Assets"] = (categoryTotals["Assets"] || 0) + bal;
                } else if (acc.type === "liability") {
                    // Logic: Liability usually credit normal. If collected as positive balance for debt...
                    // In previous file comment: "report.liabilities += bal * -1" implies negative balance in DB for credit normal?
                    // Let's assume standard: Asset +ve, Liability/Equity -ve in DB if they are Credit Balance.
                    // But usually DB stores absolute value if simple.
                    // Let's stick to previous file logic: it flipped sign: `report.liabilities += bal * -1`.
                    // Wait, if I record `credit` as decrement in `balance += (debit - credit)`, then Liab increases are NEGATIVE.
                    // So `bal` is negative. `bal * -1` makes it positive for display.
                    liabilities += bal * -1;
                    categoryTotals["Liabilities"] = (categoryTotals["Liabilities"] || 0) + bal * -1;
                } else if (acc.type === "equity") {
                    equity += bal * -1;
                    categoryTotals["Equity"] = (categoryTotals["Equity"] || 0) + bal * -1;
                } else if (acc.type === "income") {
                    calculatedNetIncome += bal * -1;
                } else if (acc.type === "expense") {
                    calculatedNetIncome -= bal;
                }
            });

            // Adjust Net Income into Equity
            equity += calculatedNetIncome;
            categoryTotals["Retained Earnings (Calc)"] = calculatedNetIncome;

            // Prepare Response
            const kpis = {
                assets: { label: "Total Assets", value: assets, prefix: "$", trend: "neutral" as const },
                liabilities: { label: "Total Liabilities", value: liabilities, prefix: "$", trend: "neutral" as const },
                equity: { label: "Total Equity", value: equity, prefix: "$", trend: "neutral" as const },
            };

            // Visualize composition
            const breakdowns = [
                { label: "Assets", value: assets, color: "#10b981" },
                { label: "Liabilities", value: liabilities, color: "#ef4444" },
                { label: "Equity", value: equity, color: "#3b82f6" },
            ];

            // Table Rows
            const rows = [
                { category: "Assets", value: assets },
                { category: "Liabilities", value: liabilities },
                { category: "Equity (Before NI)", value: equity - calculatedNetIncome },
                { category: "Net Income (YTD)", value: calculatedNetIncome },
                { category: "Total Equity", value: equity },
            ];

            return {
                kpis,
                series: [], // Balance sheet is snapshot, usually no time series unless specialized
                breakdowns,
                table: {
                    columns: [
                        { key: "category", label: "Category" },
                        { key: "value", label: "Amount", type: "currency" },
                    ],
                    rows,
                    total: rows.length,
                },
            };
        } catch (error) {
            console.error("Error generating Balance Sheet:", error);
            return this.getEmptyResponse();
        }
    }

    /**
     * Get Cash Flow Report
     */
    async getCashFlow(filter: ReportFilter): Promise<ReportResponse> {
        try {
            if (!filter.orgId) return this.getEmptyResponse();

            // TODO: Real Indirect Method or Direct Method aggregation.
            // For now, simple approximation: Income vs Expense over time (similar to P&L but framing it as Cash)
            // Real cash flow requires tracking 'Bank' account movements specifically.

            // Mock Data to demonstrate structure
            const kpis = {
                netCashFlow: { label: "Net Cash Flow", value: 35000, prefix: "$", trend: "up" as const },
                inflow: { label: "Cash In (Operating)", value: 120000, prefix: "$", trend: "up" as const },
                outflow: { label: "Cash Out (Operating)", value: 85000, prefix: "$", trend: "down" as const },
                closingBalance: { label: "Cash on Hand", value: 210000, prefix: "$", trend: "neutral" as const },
            };

            const series = [
                { date: "Jan", inflow: 80000, outflow: 60000, net: 20000 },
                { date: "Feb", inflow: 95000, outflow: 65000, net: 30000 },
                { date: "Mar", inflow: 120000, outflow: 85000, net: 35000 },
            ];

            const breakdowns = [
                { label: "Customer Payments", value: 110000 },
                { label: "Asset Sales", value: 10000 },
                { label: "Vendor Payments", value: 60000 },
                { label: "Payroll", value: 20000 },
                { label: "Tax", value: 5000 },
            ];

            return {
                kpis,
                series,
                breakdowns,
                table: {
                    columns: [
                        { key: "category", label: "Category" },
                        { key: "type", label: "Type" },
                        { key: "value", label: "Amount", type: "currency" },
                    ],
                    rows: [
                        { category: "Customer Payments", type: "Inflow", value: 110000 },
                        { category: "Asset Sales", type: "Inflow", value: 10000 },
                        { category: "Vendor Payments", type: "Outflow", value: 60000 },
                        { category: "Payroll", type: "Outflow", value: 20000 },
                        { category: "Tax", type: "Outflow", value: 5000 },
                    ],
                    total: 5,
                },
            };
        } catch (error) {
            console.error("Error generating Cash Flow:", error);
            return this.getEmptyResponse();
        }
    }

    /**
     * Get Marketing Lead Sources Report
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getLeadSources(_filter: ReportFilter): Promise<ReportResponse> {
        try {
            // Mock Data
            const kpis = {
                totalLeads: { label: "Total Leads", value: 1250, trend: "up" as const, change: 12 },
                conversionRate: { label: "Conversion Rate", value: 4.8, suffix: "%", trend: "up" as const },
                costPerLead: { label: "Cost Per Lead", value: 45, prefix: "$", trend: "down" as const },
            };

            const series = [
                { label: "Organic Search", value: 450 },
                { label: "Social Media", value: 300 },
                { label: "Direct", value: 200 },
                { label: "Referral", value: 150 },
                { label: "Paid Ads", value: 100 },
                { label: "Email", value: 50 },
            ];

            return {
                kpis,
                series,
                breakdowns: series,
                table: {
                    columns: [
                        { key: "source", label: "Source" },
                        { key: "leads", label: "Leads", type: "number" },
                        { key: "percent", label: "Percent", type: "percent" },
                    ],
                    rows: series.map((s) => ({
                        source: s.label,
                        leads: s.value,
                        percent: (s.value / 1250) * 100,
                    })),
                    total: series.length,
                },
            };
        } catch (error) {
            console.error("Error generating Lead Sources:", error);
            return this.getEmptyResponse();
        }
    }

    /**
     * Get Marketing Campaign Performance Report
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getCampaignPerformance(_filter: ReportFilter): Promise<ReportResponse> {
        try {
            // Mock Data
            const kpis = {
                activeCampaigns: { label: "Active Campaigns", value: 3, trend: "neutral" as const },
                totalSpend: { label: "Total Spend", value: 12000, prefix: "$", trend: "up" as const },
                roi: { label: "ROI", value: 250, suffix: "%", trend: "up" as const },
            };

            const series = [
                { date: "Jan", spend: 3000, revenue: 8000 },
                { date: "Feb", spend: 4000, revenue: 11000 },
                { date: "Mar", spend: 5000, revenue: 14000 },
            ];

            const campaigns = [
                { name: "Summer Sale", spend: 5000, revenue: 15000, leads: 200 },
                { name: "New Arrival", spend: 4000, revenue: 10000, leads: 150 },
                { name: "Brand Awareness", spend: 3000, revenue: 5000, leads: 100 },
            ];

            return {
                kpis,
                series,
                breakdowns: [],
                table: {
                    columns: [
                        { key: "campaign", label: "Campaign" },
                        { key: "spend", label: "Spend", type: "currency" },
                        { key: "revenue", label: "Revenue", type: "currency" },
                        { key: "leads", label: "Leads", type: "number" },
                        { key: "roi", label: "ROI", type: "percent" },
                    ],
                    rows: campaigns.map((c) => ({
                        campaign: c.name,
                        spend: c.spend,
                        revenue: c.revenue,
                        leads: c.leads,
                        roi: ((c.revenue - c.spend) / c.spend) * 100,
                    })),
                    total: campaigns.length,
                },
            };
        } catch (error) {
            console.error("Error generating Campaign Performance:", error);
            return this.getEmptyResponse();
        }
    }

    /**
     * Helper to return consistent empty state
     */
    private getEmptyResponse(): ReportResponse {
        return {
            kpis: {},
            series: [],
            breakdowns: [],
            table: {
                columns: [], // columns should ideally be passed or defined per report type even in empty state, but this is a fallback
                rows: [],
                total: 0,
            },
        };
    }
}

export const reportsService = new ReportsService();
