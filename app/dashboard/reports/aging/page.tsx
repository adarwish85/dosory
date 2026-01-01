"use client";

import { useEffect, useState } from "react";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { useFinancialReports, AgingReportItem } from "@/lib/hooks/use-financial-reports";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileDown, RefreshCcw } from "lucide-react";
// import jsPDF from "jspdf"; // Will add later
// import autoTable from "jspdf-autotable";

export default function ARAgingPage() {
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
            <PageHeader
                title="Accounts Receivable Aging"
                description="View unpaid customer invoices grouped by overdue duration."
            >
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchReport} disabled={loading}>
                        <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button variant="outline" size="sm" disabled={true}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Export PDF
                    </Button>
                </div>
            </PageHeader>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalStats.total)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Current (0-30)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-semibold text-emerald-600">
                            {formatCurrency(totalStats.current)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">31-60 Days</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-semibold text-yellow-600">{formatCurrency(totalStats.thirty)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">61-90 Days</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-semibold text-orange-600">{formatCurrency(totalStats.sixty)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">90+ Days</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-semibold text-red-600">{formatCurrency(totalStats.ninety)}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Customer Balances</CardTitle>
                    <CardDescription>
                        Aging breakdown by customer. &quot;Current&quot; includes invoices not yet overdue or overdue by
                        &le; 30 days.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[300px]">Customer</TableHead>
                                <TableHead className="text-right">Total Due</TableHead>
                                <TableHead className="text-right">0-30 Days</TableHead>
                                <TableHead className="text-right">31-60 Days</TableHead>
                                <TableHead className="text-right">61-90 Days</TableHead>
                                <TableHead className="text-right">90+ Days</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10">
                                        Loading aging data...
                                    </TableCell>
                                </TableRow>
                            ) : report.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                        No outstanding invoices found.
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
