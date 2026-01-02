"use client";

import { useEffect, useState } from "react";
import { ReportPageShell } from "@/components/reports/report-page-shell";
import { KpiCards } from "@/components/reports/kpi-cards";
import { ChartCard } from "@/components/reports/chart-card";
import { DataTable } from "@/components/reports/data-table";
import { reportsService } from "@/lib/services/reports-service";
import { ReportResponse, ReportDateRange } from "@/lib/types/reports";
import { useUserProfile } from "@/components/hooks/use-user-profile";

export default function CashFlowPage() {
    const { profile } = useUserProfile();
    const [data, setData] = useState<ReportResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState("year");

    const loadData = async () => {
        if (!profile?.orgId) return;

        setLoading(true);
        try {
            const result = await reportsService.getCashFlow({
                orgId: profile.orgId,
                dateRange: dateRange as ReportDateRange,
            });
            setData(result);
        } catch (error) {
            console.error("Failed to load Cash Flow report", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [profile?.orgId, dateRange]);

    return (
        <ReportPageShell
            title="Cash Flow"
            description="Track cash inflows and outflows to maintain liquidity."
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
                            title="Net Cash Flow Trend"
                            type="area" // Area chart good for Net Flow
                            data={data.series}
                            series={[{ key: "net", color: "#10b981", name: "Net Cash" }]}
                        />
                        <ChartCard
                            title="Inflow vs Outflow"
                            type="bar"
                            data={data.series}
                            series={[
                                { key: "inflow", color: "#3b82f6", name: "Inflow" },
                                { key: "outflow", color: "#ef4444", name: "Outflow" },
                            ]}
                        />
                    </div>

                    <DataTable
                        title="Cash Flow Details"
                        columns={data.table.columns}
                        data={data.table.rows}
                        total={data.table.total}
                    />
                </>
            )}
        </ReportPageShell>
    );
}
