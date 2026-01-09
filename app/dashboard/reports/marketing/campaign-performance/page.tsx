"use client";

import { useEffect, useState } from "react";
import { ReportPageShell } from "@/components/reports/report-page-shell";
import { KpiCards } from "@/components/reports/kpi-cards";
import { ChartCard } from "@/components/reports/chart-card";
import { DataTable } from "@/components/reports/data-table";
import { reportsService } from "@/lib/services/reports-service";
import { ReportResponse, ReportDateRange } from "@/lib/types/reports";
import { useUserProfile } from "@/components/hooks/use-user-profile";

export default function CampaignPerformancePage() {
    const { profile } = useUserProfile();
    const [data, setData] = useState<ReportResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState("month");

    const loadData = async () => {
        if (!profile?.orgId) return;

        setLoading(true);
        try {
            const result = await reportsService.getCampaignPerformance({
                orgId: profile.orgId,
                dateRange: dateRange as ReportDateRange,
            });
            setData(result);
        } catch (error) {
            console.error("Failed to load Campaign Performance", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [profile?.orgId, dateRange]);

    return (
        <ReportPageShell
            title="Campaign Performance"
            description="Track ROI and effectiveness of marketing campaigns."
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
                            title="Spend vs Revenue"
                            type="bar"
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            data={data.series as any[]}
                            series={[
                                { key: "spend", color: "#94a3b8", name: "Spend" },
                                { key: "revenue", color: "#22c55e", name: "Revenue" },
                            ]}
                        />
                        <ChartCard
                            title="ROI Trend"
                            type="line"
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            data={data.series as any[]}
                            series={[{ key: "revenue", color: "#3b82f6", name: "Revenue Trend" }]}
                        />
                    </div>

                    <DataTable
                        title="Campaign Details"
                        columns={data.table.columns}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        data={data.table.rows as any[]}
                        total={data.table.total}
                    />
                </>
            )}
        </ReportPageShell>
    );
}
