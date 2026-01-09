"use client";

import { useEffect, useState } from "react";
import { useFinancialReports, BalanceSheetReport } from "@/lib/hooks/use-financial-reports";
import { useFinance } from "@/lib/hooks/use-finance"; // To get detailed account list
import { Account } from "@/lib/types/finance";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrency } from "@/lib/hooks/use-currency";
import { Download, RefreshCcw } from "lucide-react";

export default function BalanceSheetPage() {
    const { getBalanceSheet, loading } = useFinancialReports();
    const { accounts } = useFinance();
    const { formatCurrency } = useCurrency();
    const [report, setReport] = useState<BalanceSheetReport | null>(null);

    const fetchReport = async () => {
        const data = await getBalanceSheet();
        setReport(data);
    };

    useEffect(() => {
        fetchReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Helper to render account section
    const AccountSection = ({
        title,
        type,
        accounts,
        total,
    }: {
        title: string;
        type: string;
        accounts: Account[];
        total: number;
    }) => (
        <div className="space-y-2">
            <h3 className="font-semibold text-lg border-b pb-2">{title}</h3>
            <div className="space-y-1">
                {accounts
                    .filter((a) => a.type === type && Math.abs(a.balance) > 0)
                    .map((acc) => (
                        <div key={acc.id} className="flex justify-between py-1 text-sm">
                            <span className="text-gray-600">
                                {acc.code} - {acc.name}
                            </span>
                            <span className="font-mono">
                                {formatCurrency(type === "asset" || type === "expense" ? acc.balance : -acc.balance)}
                            </span>
                        </div>
                    ))}

                {/* For Equity, add Net Income Line */}
                {type === "equity" && report && report.netIncomeYTD !== 0 && (
                    <div className="flex justify-between py-1 text-sm font-medium text-blue-600">
                        <span>Net Income (YTD)</span>
                        <span className="font-mono">{formatCurrency(report.netIncomeYTD)}</span>
                    </div>
                )}

                <div className="flex justify-between py-2 font-bold border-t mt-2">
                    <span>Total {title}</span>
                    <span>{formatCurrency(total)}</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <PageHeader title="Balance Sheet" description="Financial position of your organization as of today.">
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchReport} disabled={loading}>
                        <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Export PDF
                    </Button>
                </div>
            </PageHeader>

            {report && (
                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle>Assets</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <AccountSection title="Assets" type="asset" accounts={accounts} total={report.assets} />
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-1 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Liabilities</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <AccountSection
                                    title="Liabilities"
                                    type="liability"
                                    accounts={accounts}
                                    total={report.liabilities}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Equity</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <AccountSection
                                    title="Equity"
                                    type="equity"
                                    accounts={accounts}
                                    total={report.equity}
                                />
                            </CardContent>
                        </Card>

                        <Card className="bg-gray-50">
                            <CardContent className="pt-6">
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Total Liabilities & Equity</span>
                                    <span>{formatCurrency(report.liabilities + report.equity)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </Card>
                </div>
            )}
        </div>
    );
}
