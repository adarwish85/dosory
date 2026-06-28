"use client";

import { useState, useMemo } from "react";
import { useCustomer } from "@/components/dashboard/customers/customer-context";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Download, Mail, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { useStatement } from "@/lib/hooks/use-statement";
import { format, startOfMonth, startOfQuarter, startOfYear, endOfDay, subMonths } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useOrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export default function StatementPage() {
    const { t } = useTranslation();
    const { customer, loading: customerLoading } = useCustomer();
    const { settings: orgSettings } = useOrganizationSettings();

    // Date Range State
    const [period, setPeriod] = useState<"month" | "quarter" | "year" | "all">("month");

    // Calculate dates based on period
    const dateRange = useMemo(() => {
        const now = new Date();
        let start: Date | undefined;
        const end: Date | undefined = endOfDay(now);

        switch (period) {
            case "month":
                start = startOfMonth(now);
                break;
            case "quarter":
                start = startOfQuarter(now);
                break;
            case "year":
                start = startOfYear(now);
                break;
            case "all":
                start = undefined; // No start date means from beginning
                break;
        }

        return { start, end };
    }, [period]);

    const { transactions, summary, loading: statementLoading } = useStatement({
        customerId: customer?.id || "",
        startDate: dateRange.start,
        endDate: dateRange.end
    });

    const loading = customerLoading || statementLoading;

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const customerName = customer?.company || t("customers.statement.customerFallback");

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: customer?.currency || 'USD'
        }).format(amount);
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{t("customers.statement.title")}</h2>
                <div className="flex items-center gap-2">
                    <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
                        <SelectTrigger className="w-[180px] bg-white">
                            <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                            <SelectValue placeholder={t("customers.statement.selectPeriod")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="month">{t("customers.statement.thisMonth")}</SelectItem>
                            <SelectItem value="quarter">{t("customers.statement.thisQuarter")}</SelectItem>
                            <SelectItem value="year">{t("customers.statement.thisYear")}</SelectItem>
                            <SelectItem value="all">{t("customers.statement.allTime")}</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button variant="outline" size="icon" className="bg-white text-gray-600" title={t("customers.statement.print")}>
                        <Printer className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="bg-white text-gray-600" title={t("customers.statement.downloadPdf")}>
                        <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="bg-white text-gray-600" title={t("customers.statement.emailStatement")}>
                        <Mail className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Statement Container (The Paper) */}
            <div className="rounded-none sm:rounded-md border bg-white shadow-sm print:shadow-none print:border-none">

                {/* Statement Content */}
                <div className="p-8 space-y-8 min-h-[800px]">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b pb-8">
                        <div>
                            {/* Placeholder for Organization Logo */}
                            <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400 font-medium">
                                LOGO
                            </div>
                        </div>
                        <div className="text-right text-sm text-gray-600 leading-relaxed">
                            <p className="font-bold text-gray-900 text-lg mb-1">{orgSettings?.companyName || t("customers.statement.yourCompany")}</p>
                            {/* We would fetch org address from settings here if available */}
                        </div>
                    </div>

                    {/* Addresses & Summary Header */}
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <h3 className="text-xs uppercase font-semibold text-gray-500 mb-2">{t("customers.statement.billTo")}</h3>
                            <p className="text-base font-bold text-gray-900">{customerName}</p>
                            {customer?.address?.street && (
                                <p className="text-sm text-gray-600">{customer.address.street}</p>
                            )}
                            {customer?.address?.city && (
                                <p className="text-sm text-gray-600">
                                    {customer.address.city}, {customer.address.state} {customer.address.zipCode}
                                </p>
                            )}
                            {customer?.address?.country && (
                                <p className="text-sm text-gray-600">{customer.address.country}</p>
                            )}
                            {customer?.vatNumber && (
                                <p className="text-xs text-gray-500 mt-2">{t("customers.statement.vat")}: {customer.vatNumber}</p>
                            )}
                        </div>
                        <div className="text-right space-y-4">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">{t("customers.statement.statement")}</h3>
                                <p className="text-sm text-gray-500">
                                    {dateRange.start ? (
                                        <>
                                            {format(dateRange.start, "MMM d, yyyy")} - {format(new Date(), "MMM d, yyyy")}
                                        </>
                                    ) : (
                                        t("customers.statement.allTime")
                                    )}
                                </p>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-md border text-left w-64 ml-auto">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-500">{t("customers.statement.openingBalance")}:</span>
                                    <span className="font-medium text-gray-900">{formatCurrency(summary.openingBalance)}</span>
                                </div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-500">{t("customers.statement.invoiced")}:</span>
                                    <span className="font-medium text-gray-900">{formatCurrency(summary.invoicedAmount)}</span>
                                </div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-500">{t("customers.statement.paid")}:</span>
                                    <span className="font-medium text-gray-900">({formatCurrency(summary.amountPaid)})</span>
                                </div>
                                <div className="border-t my-2"></div>
                                <div className="flex justify-between font-bold">
                                    <span className="text-gray-900">{t("customers.statement.balanceDue")}:</span>
                                    <span className={cn("text-gray-900", summary.closingBalance > 0 ? "text-red-600" : "text-green-600")}>
                                        {formatCurrency(summary.closingBalance)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="pt-4">
                        <div className="border rounded-md overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                                        <TableHead className="font-semibold text-gray-900 w-[120px]">{t("common.date")}</TableHead>
                                        <TableHead className="font-semibold text-gray-900">{t("customers.statement.col.transaction")}</TableHead>
                                        <TableHead className="font-semibold text-gray-900">{t("customers.statement.col.details")}</TableHead>
                                        <TableHead className="font-semibold text-gray-900 text-right">{t("customers.statement.col.amount")}</TableHead>
                                        <TableHead className="font-semibold text-gray-900 text-right">{t("customers.statement.col.payments")}</TableHead>
                                        <TableHead className="font-semibold text-gray-900 text-right">{t("customers.statement.col.balance")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {/* Opening Balance Row if applicable */}
                                    {summary.openingBalance !== 0 && (
                                        <TableRow className="bg-gray-50/50 italic text-gray-500">
                                            <TableCell>{dateRange.start ? format(dateRange.start, "MMM d, yyyy") : "-"}</TableCell>
                                            <TableCell>{t("customers.statement.openingBalance")}</TableCell>
                                            <TableCell>{t("customers.statement.balanceBroughtForward")}</TableCell>
                                            <TableCell className="text-right">-</TableCell>
                                            <TableCell className="text-right">-</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(summary.openingBalance)}</TableCell>
                                        </TableRow>
                                    )}

                                    {transactions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                                                {t("customers.statement.noTransactions")}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        transactions.map((tx) => (
                                            <TableRow key={`${tx.type}-${tx.id}`} className="hover:bg-gray-50/50">
                                                <TableCell className="text-gray-600">
                                                    {format(tx.date, "MMM d, yyyy")}
                                                </TableCell>
                                                <TableCell className="font-medium text-gray-900">
                                                    {tx.reference}
                                                </TableCell>
                                                <TableCell className="text-gray-600 max-w-[200px] truncate">
                                                    <div className="flex items-center gap-2">
                                                        {tx.description}
                                                        {tx.status === "paid" && <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 text-[10px] h-5 px-1.5">{t("customers.statement.status.paid")}</Badge>}
                                                        {tx.status === "partially_paid" && <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200 text-[10px] h-5 px-1.5">{t("customers.statement.status.partial")}</Badge>}
                                                        {tx.status === "overdue" && <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200 text-[10px] h-5 px-1.5">{t("customers.statement.status.overdue")}</Badge>}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right text-gray-900">
                                                    {tx.type === "invoice" ? formatCurrency(tx.originalAmount || tx.amount) : "-"}
                                                </TableCell>
                                                <TableCell className="text-right text-gray-600">
                                                    {(tx.type === "payment" || tx.type === "credit_note") ? formatCurrency(Math.abs(tx.amount)) : "-"}
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-gray-900">
                                                    {formatCurrency(tx.runningBalance)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Footer Balance */}
                        <div className="flex justify-end pt-4">
                            <div className="flex gap-8 items-center bg-gray-900 text-white px-6 py-3 rounded-md shadow-sm">
                                <span className="font-medium text-gray-300">{t("customers.statement.balanceDue")}</span>
                                <span className="font-bold text-xl">{formatCurrency(summary.closingBalance)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
