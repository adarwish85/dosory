"use client";

import { useEffect, useState } from "react";
import { useFinancialReports, PnLReport } from "@/lib/hooks/use-financial-reports";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { CalendarIcon, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrency } from "@/lib/hooks/use-currency";
import { useTranslation } from "@/lib/i18n";

export default function ProfitLossPage() {
    const { t } = useTranslation();
    const { getProfitAndLoss, loading } = useFinancialReports();
    const { formatCurrency } = useCurrency();
    const [date, setDate] = useState<{ from: Date; to: Date }>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [report, setReport] = useState<PnLReport | null>(null);

    const runReport = async () => {
        if (date.from && date.to) {
            const data = await getProfitAndLoss(date.from, date.to);
            setReport(data);
        }
    };

    useEffect(() => {
        runReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <PageHeader title={t("reports.profitLoss")} description={t("reports.pnl.description")}>
                <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    {t("reports.exportPdf")}
                </Button>
            </PageHeader>

            <div className="flex items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
                <div className="grid gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                    "w-[300px] justify-start text-left font-normal",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date?.from ? (
                                    date.to ? (
                                        <>
                                            {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        format(date.from, "LLL dd, y")
                                    )
                                ) : (
                                    <span>{t("reports.pickDateRange")}</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={(val) => setDate(val as { from: Date; to: Date })}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <Button onClick={runReport} disabled={loading || !date.from || !date.to}>
                    {loading ? t("reports.running") : t("reports.runReport")}
                </Button>
            </div>

            {report && (
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t("reports.totalIncome")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{formatCurrency(report.income)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t("reports.totalExpenses")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{formatCurrency(report.expenses)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t("reports.netIncome")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div
                                className={`text-2xl font-bold ${report.netIncome >= 0 ? "text-green-600" : "text-red-600"}`}
                            >
                                {formatCurrency(report.netIncome)}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {report && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t("reports.detailedBreakdown")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {Object.keys(report.byCategory).length === 0 ? (
                                <p className="text-sm text-gray-500">{t("reports.noTransactionsPeriod")}</p>
                            ) : (
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    {t("reports.accountCategory")}
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    {t("reports.col.amount")}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {Object.entries(report.byCategory)
                                                .sort(([, a], [, b]) => b - a)
                                                .map(([category, amount]) => (
                                                    <tr key={category}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {category}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                                                            {formatCurrency(amount)}
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
