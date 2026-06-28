"use client";

import { useEffect, useState } from "react";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { useFinancialReports, AgingReportItem } from "@/lib/hooks/use-financial-reports";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileDown, RefreshCcw } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
// import jsPDF from "jspdf"; // Will add later
// import autoTable from "jspdf-autotable";

export default function ARAgingPage() {
    const { t } = useTranslation();
    const { profile } = useUserProfile();
    const { getARAging } = useFinancialReports();
    const [report, setReport] = useState<AgingReportItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const data = await getARAging();
            // Sort by Total Outstanding Descending
            data.sort((a, b) => b.totalDue - a.totalDue);
            setReport(data);
        } catch (error) {
            console.error("Failed to load aging report", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (profile?.orgId) {
            fetchReport();
        }
    }, [profile?.orgId, getARAging]); // getARAging is stable

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(amount);
    };

    const totalStats = report.reduce(
        (acc, item) => ({
            current: acc.current + item.buckets["0-30"],
            thirty: acc.thirty + item.buckets["31-60"],
            sixty: acc.sixty + item.buckets["61-90"],
            ninety: acc.ninety + item.buckets["90+"],
            total: acc.total + item.totalDue,
        }),
        { current: 0, thirty: 0, sixty: 0, ninety: 0, total: 0 }
    );

    return (
        <div className="space-y-6">
            <PageHeader title={t("reports.arAging")} description={t("reports.arAging.description")}>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchReport} disabled={loading}>
                        <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        {t("reports.refresh")}
                    </Button>
                    <Button variant="outline" size="sm" disabled={true}>
                        <FileDown className="mr-2 h-4 w-4" />
                        {t("reports.exportPdf")}
                    </Button>
                </div>
            </PageHeader>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t("reports.outstanding")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalStats.total)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t("reports.aging.current")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-semibold text-emerald-600">
                            {formatCurrency(totalStats.current)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t("reports.aging.30")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-semibold text-yellow-600">{formatCurrency(totalStats.thirty)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t("reports.aging.60")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-semibold text-orange-600">{formatCurrency(totalStats.sixty)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t("reports.aging.90")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-semibold text-red-600">{formatCurrency(totalStats.ninety)}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("reports.customerBalances")}</CardTitle>
                    <CardDescription>{t("reports.agingBreakdownNote")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[300px]">{t("common.customer")}</TableHead>
                                <TableHead className="text-right">{t("reports.totalDue")}</TableHead>
                                <TableHead className="text-right">{t("reports.aging.0to30")}</TableHead>
                                <TableHead className="text-right">{t("reports.aging.31to60")}</TableHead>
                                <TableHead className="text-right">{t("reports.aging.61to90")}</TableHead>
                                <TableHead className="text-right">{t("reports.aging.90plus")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10">
                                        {t("reports.loadingAging")}
                                    </TableCell>
                                </TableRow>
                            ) : report.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                        {t("reports.noOutstandingInvoices")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                report.map((item) => (
                                    <TableRow key={item.entityId}>
                                        <TableCell className="font-medium">{item.entityName}</TableCell>
                                        <TableCell className="text-right font-bold">
                                            {formatCurrency(item.totalDue)}
                                        </TableCell>
                                        <TableCell className="text-right text-emerald-600">
                                            {item.buckets["0-30"] > 0 ? formatCurrency(item.buckets["0-30"]) : "-"}
                                        </TableCell>
                                        <TableCell className="text-right text-yellow-600">
                                            {item.buckets["31-60"] > 0 ? formatCurrency(item.buckets["31-60"]) : "-"}
                                        </TableCell>
                                        <TableCell className="text-right text-orange-600">
                                            {item.buckets["61-90"] > 0 ? formatCurrency(item.buckets["61-90"]) : "-"}
                                        </TableCell>
                                        <TableCell className="text-right text-red-600">
                                            {item.buckets["90+"] > 0 ? formatCurrency(item.buckets["90+"]) : "-"}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
