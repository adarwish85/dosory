"use client";

import { useEffect, useState } from "react";
import { ReportPageShell } from "@/components/reports/report-page-shell";
import { KpiCards } from "@/components/reports/kpi-cards";
import { ChartCard } from "@/components/reports/chart-card";
import { reportsService } from "@/lib/services/reports-service";
import { ReportResponse, ReportDateRange } from "@/lib/types/reports";
import { useUserProfile } from "@/components/hooks/use-user-profile";

export default function BusinessHealthPage() {
    const { profile } = useUserProfile();
    const [data, setData] = useState<ReportResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState("year");

    const loadData = async () => {
        if (!profile?.orgId) return;
        setLoading(true);
        try {
            const result = await reportsService.getBusinessHealth({
                orgId: profile.orgId,
                dateRange: dateRange as ReportDateRange,
            });
            setData(result);
        } catch (error) {
            console.error("Failed to load business health report", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [profile?.orgId, dateRange]);

    return (
        <ReportPageShell
            title="Business Health"
            description="Collected revenue, expenses, net profit, and active projects."
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onRefresh={loadData}
            loading={loading}
            canExport
        >
            {data && (
                <>
                    <KpiCards kpis={data.kpis} />
                    <ChartCard
                        title="Revenue vs Expenses"
                        type="line"
                        data={data.series}
                        series={[
                            { key: "revenue", color: "#3b82f6", name: "Revenue" },
                            { key: "expenses", color: "#ef4444", name: "Expenses" },
                            { key: "netProfit", color: "#10b981", name: "Net Profit" },
                        ]}
                    />
                </>
            )}
        </ReportPageShell>
    );
}
