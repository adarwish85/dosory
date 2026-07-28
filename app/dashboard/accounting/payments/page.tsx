"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, Loader2, Receipt } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { usePayments, type Payment } from "@/lib/hooks/use-payments";
import type { Timestamp } from "firebase/firestore";

/**
 * F2 fix: this page previously rendered a hardcoded fixture array (EGIC / INV-0001xx rows)
 * for EVERY tenant — fake-but-real-looking financial data, flagged in the 2026-07-28 smoke.
 * Now wired to the tenant's real payments via usePayments (orgId-scoped onSnapshot,
 * ordered date desc — served by the payments(orgId,date DESC) composite index).
 *
 * Field tolerance: payments are written by two paths whose shapes differ slightly —
 * the processPayment callable (paymentMode, invoice `number`, no customerName) and
 * client-side records (method, formatted invoiceNumber, customerName). Render both.
 */

// Legacy/client docs may carry `method`/`customerName`/`currency` instead of the
// processPayment shape — a superset view keeps both renderable.
type PaymentRow = Payment & { method?: string; customerName?: string; currency?: string };

function formatDate(ts?: Timestamp): string {
    if (!ts || typeof ts.toDate !== "function") return "-";
    return ts.toDate().toLocaleDateString("en-GB");
}

export default function PaymentsPage() {
    const { t } = useTranslation();
    const { payments, loading, error } = usePayments();
    const [searchQuery, setSearchQuery] = useState("");
    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return payments as PaymentRow[];
        return (payments as PaymentRow[]).filter((p) =>
            [p.invoiceNumber, p.customerName, p.customerId, p.paymentMode ?? p.method, String(p.amount ?? "")]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q))
        );
    }, [payments, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const rows = filtered.slice(start, start + pageSize);

    const formatAmount = (p: PaymentRow) =>
        new Intl.NumberFormat("en-US", { style: "currency", currency: p.currency || "USD" }).format(p.amount || 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <Select
                        value={String(pageSize)}
                        onValueChange={(v) => {
                            setPageSize(Number(v));
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[70px]">
                            <SelectValue placeholder="25" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline">{t("common.export")}</Button>
                    <Button variant="outline" size="icon" onClick={() => window.location.reload()}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder={t("common.searchPlaceholder")}
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
            </div>

            <div className="border rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">
                                {t("accounting.payments.paymentNumber")}
                            </TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">
                                {t("accounting.payments.invoiceNumber")}
                            </TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">
                                {t("accounting.payments.paymentMode")}
                            </TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">
                                {t("accounting.payments.transactionId")}
                            </TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">
                                {t("accounting.payments.customer")}
                            </TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">
                                {t("common.amount")}
                            </TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">
                                {t("common.date")}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-gray-500">
                                    <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
                                    {t("common.loading")}
                                </TableCell>
                            </TableRow>
                        ) : error ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-red-600">
                                    {t("common.error")}
                                </TableCell>
                            </TableRow>
                        ) : rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-gray-500">
                                    <Receipt className="h-6 w-6 inline-block mr-2 text-gray-400" />
                                    {t("accounting.payments.empty")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((row, i) => (
                                <TableRow key={row.id} className="group">
                                    <TableCell className="min-w-[80px] py-3 font-medium text-gray-900">
                                        {start + i + 1}
                                    </TableCell>
                                    <TableCell className="text-gray-900">{row.invoiceNumber ?? "-"}</TableCell>
                                    <TableCell className="text-gray-900 capitalize">
                                        {row.paymentMode ?? row.method ?? "-"}
                                    </TableCell>
                                    <TableCell className="text-gray-900">-</TableCell>
                                    <TableCell className="text-gray-900">
                                        {row.customerName ?? row.customerId ?? "-"}
                                    </TableCell>
                                    <TableCell className="text-gray-900 font-medium">{formatAmount(row)}</TableCell>
                                    <TableCell className="text-gray-500">{formatDate(row.date)}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center text-sm text-gray-500 gap-2 mt-4 ml-1">
                {t("accounting.payments.showingEntries", {
                    from: filtered.length === 0 ? 0 : start + 1,
                    to: Math.min(start + pageSize, filtered.length),
                    total: filtered.length,
                })}
                <div className="flex gap-1 ml-auto">
                    <Button
                        variant="ghost"
                        disabled={safePage <= 1}
                        onClick={() => setPage(safePage - 1)}
                        className={safePage <= 1 ? "text-gray-400" : "text-gray-900 hover:bg-gray-100"}
                    >
                        {t("common.previous")}
                    </Button>
                    <Button variant="secondary" className="bg-gray-200 text-gray-900 h-8 w-8 p-0">
                        {safePage}
                    </Button>
                    <Button
                        variant="ghost"
                        disabled={safePage >= totalPages}
                        onClick={() => setPage(safePage + 1)}
                        className={safePage >= totalPages ? "text-gray-400" : "text-gray-900 hover:bg-gray-100"}
                    >
                        {t("common.next")}
                    </Button>
                </div>
            </div>
        </div>
    );
}
