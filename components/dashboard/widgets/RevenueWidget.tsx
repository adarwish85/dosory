"use client";

import { useInvoices } from "@/lib/hooks/use-invoices";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import type { WidgetSettings, DataDensity } from "@/lib/hooks/use-dashboard-layout";

interface RevenueWidgetProps {
    settings: WidgetSettings;
    density: DataDensity;
}

export function RevenueWidget({ settings, density }: RevenueWidgetProps) {
    const { invoiceStats } = useInvoices();

    const amounts = invoiceStats?.amountsByStatus || {};
    const paidAmount = amounts.paid || 0;
    const outstandingAmount = (amounts.sent || 0) + (amounts.viewed || 0) + (amounts.partial || 0) + (amounts.overdue || 0);
    const totalRevenue = paidAmount + outstandingAmount;

    // Mock trend data (in real app, compare with previous period)
    const trend = 12.5;
    const isPositive = trend >= 0;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="h-full flex flex-col">
            {/* Main Revenue Display */}
            <div className="mb-4">
                <div className="text-3xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</div>
                <div className="flex items-center gap-2 mt-1">
                    {isPositive ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className={isPositive ? "text-green-600 text-sm font-medium" : "text-red-600 text-sm font-medium"}>
                        {isPositive ? "+" : ""}{trend}%
                    </span>
                    <span className="text-gray-500 text-sm">vs last {settings.dateRange || "month"}</span>
                </div>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-2 gap-3 flex-1">
                <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-600 mb-1">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-xs font-medium uppercase">Paid</span>
                    </div>
                    <div className="text-lg font-bold text-green-900">{formatCurrency(paidAmount)}</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-amber-600 mb-1">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-xs font-medium uppercase">Outstanding</span>
                    </div>
                    <div className="text-lg font-bold text-amber-900">{formatCurrency(outstandingAmount)}</div>
                </div>
            </div>

            {/* Optional Chart Placeholder */}
            {settings.showChart && (
                <div className="mt-4 h-24 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                    📈 Revenue Chart
                </div>
            )}
        </div>
    );
}
