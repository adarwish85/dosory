"use client";

import { useMemo } from "react";
import { useInvoices } from "@/lib/hooks/use-invoices";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { WidgetSkeleton } from "./WidgetSkeleton";
import { useTranslation } from "@/lib/i18n";
import type { WidgetSettings, DataDensity } from "@/lib/hooks/use-dashboard-layout";

interface RevenueWidgetProps {
    settings: WidgetSettings;
    density: DataDensity;
}

// Generate mock monthly data - in real app, aggregate from invoices
function generateMonthlyData(totalPaid: number) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const baseValue = totalPaid / 6;

    return months.map((month, index) => ({
        month,
        revenue: Math.round(baseValue * (0.7 + Math.random() * 0.6)),
        paid: Math.round(baseValue * (0.5 + Math.random() * 0.5)),
    }));
}

export function RevenueWidget({ settings, density }: RevenueWidgetProps) {
    const { t } = useTranslation();
    const { invoiceStats, loading } = useInvoices();

    const amounts = invoiceStats?.amountsByStatus || {};
    const paidAmount = amounts.paid || 0;
    const outstandingAmount =
        (amounts.sent || 0) + (amounts.viewed || 0) + (amounts.partial || 0) + (amounts.overdue || 0);
    const totalRevenue = paidAmount + outstandingAmount;

    // Generate chart data based on actual revenue
    const chartData = useMemo(() => generateMonthlyData(paidAmount || 10000), [paidAmount]);

    // Calculate trend (mock - in real app, compare periods)
    const trend = 12.5;
    const isPositive = trend >= 0;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatChartValue = (value: number) => {
        if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
        return `$${value}`;
    };

    if (loading) {
        return <WidgetSkeleton variant="chart" />;
    }

    return (
        <div className="h-full flex flex-col">
            {/* Main Revenue Display */}
            <div className="mb-3">
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</div>
                <div className="flex items-center gap-2 mt-1">
                    {isPositive ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span
                        className={
                            isPositive ? "text-green-600 text-sm font-medium" : "text-red-600 text-sm font-medium"
                        }
                    >
                        {isPositive ? "+" : ""}
                        {trend}%
                    </span>
                    <span className="text-gray-500 text-xs">
                        {t("dashboard.revenue.vsLast", {
                            period: t(`dashboard.revenue.period.${settings.dateRange || "month"}`),
                        })}
                    </span>
                </div>
            </div>

            {/* Chart */}
            {settings.showChart !== false && (
                <div className="flex-1 min-h-[100px] -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: "#9ca3af" }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: "#9ca3af" }}
                                tickFormatter={formatChartValue}
                            />
                            <Tooltip
                                formatter={((value: number) => [formatCurrency(value), t("dashboard.revenue.revenue")]) as any}
                                contentStyle={{
                                    backgroundColor: "white",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                fill="url(#colorRevenue)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Breakdown */}
            <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="bg-green-50 rounded-lg p-2">
                    <div className="flex items-center gap-1 text-green-600 mb-0.5">
                        <DollarSign className="h-3 w-3" />
                        <span className="text-xs font-medium">{t("dashboard.revenue.paid")}</span>
                    </div>
                    <div className="text-sm font-bold text-green-900">{formatCurrency(paidAmount)}</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-2">
                    <div className="flex items-center gap-1 text-amber-600 mb-0.5">
                        <DollarSign className="h-3 w-3" />
                        <span className="text-xs font-medium">{t("dashboard.revenue.outstanding")}</span>
                    </div>
                    <div className="text-sm font-bold text-amber-900">{formatCurrency(outstandingAmount)}</div>
                </div>
            </div>
        </div>
    );
}
