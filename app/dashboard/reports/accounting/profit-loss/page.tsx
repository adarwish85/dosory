"use client";

import { useEffect, useState } from "react";
import { ReportPageShell } from "@/components/reports/report-page-shell";
import { KpiCards } from "@/components/reports/kpi-cards";
import { ChartCard } from "@/components/reports/chart-card";
import { DataTable } from "@/components/reports/data-table";
import { reportsService } from "@/lib/services/reports-service";
import { ReportResponse, ReportDateRange } from "@/lib/types/reports";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { useTranslation } from "@/lib/i18n";

export default function ProfitLossPage() {
    const { t } = useTranslation();
    const { profile } = useUserProfile();
    const [data, setData] = useState<ReportResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState("year");

    const loadData = async () => {
        if (!profile?.orgId) return;

        setLoading(true);
        try {
            const result = await reportsService.getProfitAndLoss({
                orgId: profile.orgId,
                dateRange: dateRange as ReportDateRange,
            });
            setData(result);
        } catch (error) {
            console.error("Failed to load P&L report", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [profile?.orgId, dateRange]);

    return (
        <ReportPageShell
            title={t("reports.profitLoss")}
            description={t("reports.pnl.incomeStatementDescription")}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onRefresh={loadData}
            loading={loading}
            canExport
        >
            {data && (
                <>
                    <KpiCards kpis={data.kpis} />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ChartCard
                            title={t("reports.netProfitTrend")}
                            type="line"
                            data={data.series}
                            series={[
                                { key: "netProfit", color: "#10b981", name: t("reports.netProfit") },
                                { key: "revenue", color: "#3b82f6", name: t("reports.col.revenue") },
                                { key: "expenses", color: "#ef4444", name: t("reports.tabs.expenses") },
                            ]}
                        />
                        <ChartCard
                            title={t("reports.incomeVsExpenses")}
                            type="pie" // Using pie for breakdown or bar
                            data={data.breakdowns.splice(0, 5)} // Top 5 categories
                            series={[]}
                        />
                    </div>

                    <DataTable
                        title={t("reports.categoryBreakdown")}
                        columns={data.table.columns}
                        data={data.table.rows}
                        total={data.table.total}
                    />
                </>
            )}
        </ReportPageShell>
    );
}
