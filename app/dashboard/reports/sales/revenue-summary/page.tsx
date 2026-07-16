"use client";

import { useEffect, useState } from "react";
import { ReportPageShell } from "@/components/reports/report-page-shell";
import { KpiCards } from "@/components/reports/kpi-cards";
import { ChartCard } from "@/components/reports/chart-card";
import { DataTable } from "@/components/reports/data-table";
import { reportsService } from "@/lib/services/reports-service";
import { ReportResponse, ReportDateRange } from "@/lib/types/reports";
import { useUserProfile } from "@/components/hooks/use-user-profile";

export default function RevenueSummaryReportPage() {
    const { profile } = useUserProfile();
    const [data, setData] = useState<ReportResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState("year");

    const loadData = async () => {
        if (!profile?.orgId) return;
        setLoading(true);
        try {
            const result = await reportsService.getRevenueSummary({
                orgId: profile.orgId,
                dateRange: dateRange as ReportDateRange,
            });
            setData(result);
        } catch (error) {
            console.error("Failed to load revenue summary report", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [profile?.orgId, dateRange]);

    return (
        <ReportPageShell
            title="Revenue Summary"
            description="Revenue, collections, and outstanding by customer."
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
                            title="Revenue vs Collected"
                            type="line"
                            data={data.series}
                            series={[
                                { key: "revenue", color: "#3b82f6", name: "Revenue" },
                                { key: "paid", color: "#10b981", name: "Collected" },
                            ]}
                        />
                        <ChartCard title="Top Customers" type="pie" data={data.breakdowns} series={[]} />
                    </div>
                    <DataTable
                        title="Revenue by Customer"
                        columns={data.table.columns}
                        data={data.table.rows}
                        total={data.table.total}
                    />
                </>
            )}
        </ReportPageShell>
    );
}
