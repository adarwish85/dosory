"use client";

import { useAnalytics } from "@/lib/hooks/use-analytics";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DollarSign,
    TrendingUp,
    Users,
    FileText,
    Clock,
    CheckCircle,
    AlertTriangle,
    BarChart3,
    PieChart,
} from "lucide-react";

export default function AnalyticsDashboard() {
    const { t } = useTranslation();
    const { loading, salesMetrics, customerMetrics, revenueByMonth } = useAnalytics();

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="p-6">
                                <div className="h-20 bg-gray-200 rounded" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{t("dashboard.analytics.title")}</h1>
                <p className="text-gray-500">{t("dashboard.analytics.subtitle")}</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Revenue */}
                <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-green-100 text-sm">{t("dashboard.analytics.totalRevenue")}</p>
                                <p className="text-3xl font-bold mt-1">
                                    {formatCurrency(salesMetrics?.totalRevenue || 0)}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                <DollarSign className="h-6 w-6" />
                            </div>
                        </div>
                        <div className="mt-4 text-sm text-green-100">
                            <span className="text-white font-medium">
                                {formatCurrency(salesMetrics?.monthlyRevenue || 0)}
                            </span>{" "}
                            {t("dashboard.analytics.thisMonth")}
                        </div>
                    </CardContent>
                </Card>

                {/* Outstanding */}
                <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-orange-100 text-sm">{t("dashboard.analytics.outstanding")}</p>
                                <p className="text-3xl font-bold mt-1">
                                    {formatCurrency(salesMetrics?.outstandingAmount || 0)}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                <Clock className="h-6 w-6" />
                            </div>
                        </div>
                        <div className="mt-4 text-sm text-orange-100">
                            <span className="text-white font-medium">{salesMetrics?.overdueInvoices || 0}</span>{" "}
                            {t("dashboard.analytics.overdueInvoices")}
                        </div>
                    </CardContent>
                </Card>

                {/* Customers */}
                <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm">{t("dashboard.analytics.totalCustomers")}</p>
                                <p className="text-3xl font-bold mt-1">{customerMetrics?.totalCustomers || 0}</p>
                            </div>
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                <Users className="h-6 w-6" />
                            </div>
                        </div>
                        <div className="mt-4 text-sm text-blue-100">
                            <span className="text-white font-medium">+{customerMetrics?.newThisMonth || 0}</span>{" "}
                            {t("dashboard.analytics.thisMonth")}
                        </div>
                    </CardContent>
                </Card>

            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-blue-600" />
                            {t("dashboard.analytics.monthlyRevenue")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {revenueByMonth.map((item, index) => (
                                <div key={index} className="flex items-center gap-4">
                                    <span className="w-12 text-sm text-gray-500">{item.month}</span>
                                    <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-end pr-3"
                                            style={{
                                                width: `${Math.max(10, (item.revenue / Math.max(...revenueByMonth.map((r) => r.revenue), 1)) * 100)}%`,
                                            }}
                                        >
                                            <span className="text-xs text-white font-medium">
                                                {formatCurrency(item.revenue)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {revenueByMonth.length === 0 && (
                                <p className="text-gray-500 text-center py-8">{t("dashboard.analytics.noRevenueData")}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Invoice Status */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChart className="h-5 w-5 text-green-600" />
                            {t("dashboard.analytics.invoiceStatus")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    <span className="font-medium text-gray-700">{t("dashboard.analytics.paid")}</span>
                                </div>
                                <span className="text-xl font-bold text-green-600">
                                    {salesMetrics?.paidInvoices || 0}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Clock className="h-5 w-5 text-yellow-600" />
                                    <span className="font-medium text-gray-700">{t("dashboard.analytics.pending")}</span>
                                </div>
                                <span className="text-xl font-bold text-yellow-600">
                                    {salesMetrics?.pendingInvoices || 0}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="h-5 w-5 text-red-600" />
                                    <span className="font-medium text-gray-700">{t("dashboard.analytics.overdue")}</span>
                                </div>
                                <span className="text-xl font-bold text-red-600">
                                    {salesMetrics?.overdueInvoices || 0}
                                </span>
                            </div>
                        </div>

                        {/* Collection Rate */}
                        <div className="mt-6 pt-4 border-t">
                            <div className="flex justify-between mb-2">
                                <span className="text-sm text-gray-600">{t("dashboard.analytics.collectionRate")}</span>
                                <span className="text-sm font-medium">
                                    {(salesMetrics?.collectionRate || 0).toFixed(1)}%
                                </span>
                            </div>
                            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                                    style={{ width: `${salesMetrics?.collectionRate || 0}%` }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <FileText className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t("dashboard.analytics.avgInvoiceValue")}</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {formatCurrency(salesMetrics?.averageInvoiceValue || 0)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
