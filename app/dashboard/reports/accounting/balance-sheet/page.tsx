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

export default function BalanceSheetPage() {
    const { t } = useTranslation();
    const { profile } = useUserProfile();
    const [data, setData] = useState<ReportResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState("year");

    const loadData = async () => {
        if (!profile?.orgId) return;

        setLoading(true);
        try {
            const result = await reportsService.getBalanceSheet({
                orgId: profile.orgId,
                dateRange: dateRange as ReportDateRange,
            });
            setData(result);
        } catch (error) {
            console.error("Failed to load Balance Sheet", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [profile?.orgId, dateRange]);

    return (
        <ReportPageShell
            title={t("reports.balanceSheet")}
            description={t("reports.balanceSheet.snapshotDescription")}
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
                            title={t("reports.capitalStructure")}
                            type="pie"
                            data={data.breakdowns}
                            series={[]}
                        />
                        {/* Balance Sheet doesn't usually have a 'trend' unless we do Month-over-Month assets, 
                            which isn't in the current service breakdown. We can create a simple breakdown bar instead. */}
                        <ChartCard
                            title={t("reports.composition")}
                            type="bar"
                            data={data.breakdowns}
                            series={[{ key: "value", color: "#6366f1", name: t("reports.col.amount") }]}
                        />
                    </div>

                    <DataTable
                        title={t("reports.detailedBreakdown")}
                        columns={data.table.columns}
                        data={data.table.rows}
                        total={data.table.total}
                    />
                </>
            )}
        </ReportPageShell>
    );
}
