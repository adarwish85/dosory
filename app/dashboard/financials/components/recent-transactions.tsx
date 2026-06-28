"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePayments } from "@/lib/hooks/use-payments";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export function RecentTransactions() {
    const { t } = useTranslation();
    const { payments, loading } = usePayments({ limit: 10 });

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("financials.transactions.title")}</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("common.date")}</TableHead>
                            <TableHead>{t("financials.transactions.customer")}</TableHead>
                            <TableHead>{t("financials.transactions.invoice")}</TableHead>
                            <TableHead>{t("financials.transactions.mode")}</TableHead>
                            <TableHead className="text-right">{t("financials.transactions.amount")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground">
                                    {t("financials.transactions.empty")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            payments.map((payment) => (
                                <TableRow key={payment.id}>
                                    <TableCell>{formatDate(payment.date.toDate())}</TableCell>
                                    <TableCell className="font-medium">{payment.customerName}</TableCell>
                                    <TableCell>{payment.invoiceNumber}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">
                                            {payment.paymentMode}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-green-600">
                                        +{formatCurrency(payment.amount)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
