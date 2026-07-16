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
    async getBusinessHealth(filter: ReportFilter): Promise<ReportResponse> {
        try {
            if (!filter.orgId) return this.getEmptyResponse();

            const [invSnap, expSnap, projSnap] = await Promise.all([
                getDocs(query(collection(db, "invoices"), where("orgId", "==", filter.orgId))),
                getDocs(query(collection(db, "expenses"), where("orgId", "==", filter.orgId))),
                getDocs(query(collection(db, "projects"), where("orgId", "==", filter.orgId))),
            ]);

            const monthly: Record<string, { revenue: number; expenses: number }> = {};
            const bucket = (ts: Timestamp | undefined, key: "revenue" | "expenses", amt: number) => {
                const date = ts?.toDate ? ts.toDate() : new Date();
                const m = date.toLocaleString("default", { month: "short", year: "2-digit" });
                if (!monthly[m]) monthly[m] = { revenue: 0, expenses: 0 };
                monthly[m][key] += amt;
            };

            let revenue = 0;
            invSnap.docs.forEach((d) => {
                const inv = d.data();
                const paid = Number(inv.amountPaid || 0); // "revenue" = cash collected
                revenue += paid;
                bucket(inv.date, "revenue", paid);
            });

            let expenses = 0;
            expSnap.docs.forEach((d) => {
                const amt = Number(d.data().amount || 0);
                expenses += amt;
                bucket(d.data().date, "expenses", amt);
            });

            const activeProjects = projSnap.docs.filter((d) => {
                const s = String(d.data().status || "");
                return s === "active" || s === "in_progress" || s === "in-progress";
            }).length;

            const netProfit = revenue - expenses;
            const series = Object.entries(monthly).map(([date, s]) => ({
                date,
                revenue: s.revenue,
                expenses: s.expenses,
                netProfit: s.revenue - s.expenses,
            }));

            return {
                kpis: {
                    revenue: { value: revenue, label: "Revenue (Collected)", prefix: "$", trend: "up" },
                    expenses: { value: expenses, label: "Expenses", prefix: "$", trend: "down" },
                    netProfit: {
                        value: netProfit,
                        label: "Net Profit",
                        prefix: "$",
                        trend: netProfit >= 0 ? "up" : "down",
                    },
                    activeProjects: { value: activeProjects, label: "Active Projects", trend: "neutral" },
                },
                series,
                breakdowns: [],
                table: { columns: [], rows: [], total: 0 },
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
                { stage: "Offer Sent", value: 15, amount: 300000 },
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
    async getRevenueSummary(filter: ReportFilter): Promise<ReportResponse> {
        try {
            if (!filter.orgId) return this.getEmptyResponse();

            const snap = await getDocs(query(collection(db, "invoices"), where("orgId", "==", filter.orgId)));
            const monthly: Record<string, { revenue: number; paid: number }> = {};
            const byCustomer: Record<string, { revenue: number; paid: number }> = {};
            let totalRevenue = 0;
            let totalPaid = 0;
            let count = 0;

            snap.docs.forEach((d) => {
                const inv = d.data();
                const status = String(inv.status || "draft");
                if (status === "draft" || status === "void") return; // not real revenue yet
                const total = Number(inv.total || 0);
                const amountPaid = Number(inv.amountPaid || 0);
                totalRevenue += total;
                totalPaid += amountPaid;
                count += 1;

                const date = inv.date?.toDate ? inv.date.toDate() : new Date();
                const m = date.toLocaleString("default", { month: "short", year: "2-digit" });
                if (!monthly[m]) monthly[m] = { revenue: 0, paid: 0 };
                monthly[m].revenue += total;
                monthly[m].paid += amountPaid;

                const cust = String(inv.customerName || inv.customerId || "Unknown");
                if (!byCustomer[cust]) byCustomer[cust] = { revenue: 0, paid: 0 };
                byCustomer[cust].revenue += total;
                byCustomer[cust].paid += amountPaid;
            });

            const outstanding = totalRevenue - totalPaid;
            const series = Object.entries(monthly).map(([date, s]) => ({ date, revenue: s.revenue, paid: s.paid }));
            const custEntries = Object.entries(byCustomer).sort((a, b) => b[1].revenue - a[1].revenue);

            return {
                kpis: {
                    totalRevenue: { label: "Total Revenue", value: totalRevenue, prefix: "$", trend: "up" },
                    paidInvoices: { label: "Collected", value: totalPaid, prefix: "$", trend: "up" },
                    outstanding: { label: "Outstanding (AR)", value: outstanding, prefix: "$", trend: "down" },
                    avgInvoice: {
                        label: "Avg Invoice Value",
                        value: count > 0 ? Math.round(totalRevenue / count) : 0,
                        prefix: "$",
                        trend: "neutral",
                    },
                },
                series,
                breakdowns: custEntries.slice(0, 8).map(([label, s]) => ({ label, value: s.revenue })),
                table: {
                    columns: [
                        { key: "customer", label: "Customer" },
                        { key: "revenue", label: "Total Revenue", type: "currency" },
                        { key: "paid", label: "Paid", type: "currency" },
                        { key: "outstanding", label: "Outstanding", type: "currency" },
                    ],
                    rows: custEntries.map(([customer, s]) => ({
                        customer,
                        revenue: s.revenue,
                        paid: s.paid,
                        outstanding: s.revenue - s.paid,
                    })),
                    total: custEntries.length,
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
    async getInvoicesReport(filter: ReportFilter): Promise<ReportResponse> {
        try {
            if (!filter.orgId) return this.getEmptyResponse();

            const snap = await getDocs(query(collection(db, "invoices"), where("orgId", "==", filter.orgId)));
            const now = new Date();
            const monthly: Record<string, { invoiced: number; paid: number }> = {};
            const statusAgg: Record<string, { count: number; value: number }> = {};
            let totalInvoiced = 0;
            let paid = 0;
            let overdueAmount = 0;
            let overdueCount = 0;

            snap.docs.forEach((d) => {
                const inv = d.data();
                const status = String(inv.status || "draft");
                const total = Number(inv.total || 0);
                const amountPaid = Number(inv.amountPaid || 0);
                const amountDue = Number(inv.amountDue ?? total - amountPaid);
                const counts = status !== "draft" && status !== "void";
                if (counts) {
                    totalInvoiced += total;
                    paid += amountPaid;
                }

                const due = inv.dueDate?.toDate ? inv.dueDate.toDate() : null;
                const isOverdue = counts && amountDue > 0 && !!due && due < now && status !== "paid";
                if (isOverdue) {
                    overdueAmount += amountDue;
                    overdueCount += 1;
                }

                const date = inv.date?.toDate ? inv.date.toDate() : new Date();
                const m = date.toLocaleString("default", { month: "short", year: "2-digit" });
                if (!monthly[m]) monthly[m] = { invoiced: 0, paid: 0 };
                if (counts) {
                    monthly[m].invoiced += total;
                    monthly[m].paid += amountPaid;
                }

                const label = isOverdue ? "Overdue" : status.charAt(0).toUpperCase() + status.slice(1);
                if (!statusAgg[label]) statusAgg[label] = { count: 0, value: 0 };
                statusAgg[label].count += 1;
                statusAgg[label].value += total;
            });

            const series = Object.entries(monthly).map(([date, s]) => ({ date, invoiced: s.invoiced, paid: s.paid }));
            const totalValue = Object.values(statusAgg).reduce((a, s) => a + s.value, 0);

            return {
                kpis: {
                    totalInvoiced: { label: "Total Invoiced", value: totalInvoiced, prefix: "$", trend: "up" },
                    paid: { label: "Paid Amount", value: paid, prefix: "$", trend: "up" },
                    overdueAmount: { label: "Overdue Amount", value: overdueAmount, prefix: "$", trend: "down" },
                    overdueCount: { label: "Overdue Count", value: overdueCount, trend: "down" },
                },
                series,
                breakdowns: Object.entries(statusAgg).map(([label, s]) => ({ label, value: s.value })),
                table: {
                    columns: [
                        { key: "status", label: "Status" },
                        { key: "count", label: "Count", type: "number" },
                        { key: "value", label: "Total Value", type: "currency" },
                        { key: "percent", label: "Percent", type: "percent" },
                    ],
                    rows: Object.entries(statusAgg).map(([status, s]) => ({
                        status,
                        count: s.count,
                        value: s.value,
                        percent: totalValue > 0 ? (s.value / totalValue) * 100 : 0,
                    })),
                    total: Object.keys(statusAgg).length,
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
