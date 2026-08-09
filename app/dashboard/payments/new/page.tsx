"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Loader2, Receipt } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useInvoices } from "@/lib/hooks/use-invoices";
import { usePaymentModes } from "@/lib/hooks/use-settings";
import { useTranslation } from "@/lib/i18n";
import {
    draftInvoicesAwaitingFinalize,
    payableInvoices,
    remainingBalance,
    validateAmount,
} from "@/lib/payments/record-payment-utils";

/**
 * F6: real route for the "Record Payment" quick action (was a 404 — route-fall-through
 * rule in CLAUDE.md §7). Thin form over the EXISTING payment path: submission goes
 * through useInvoices().recordPayment → the processPayment callable, which owns the
 * data contract (transactional payment doc + invoice amountPaid/amountDue/status +
 * auto journal entry). This page never writes Firestore directly.
 */
export default function RecordPaymentPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const preselectedInvoiceId = searchParams.get("invoiceId") || "";

    const { invoices, loading: invoicesLoading, recordPayment } = useInvoices({ status: "all", limit: 500 });
    const { paymentModes, loading: modesLoading } = usePaymentModes();

    const [invoiceId, setInvoiceId] = useState(preselectedInvoiceId);
    const [amountStr, setAmountStr] = useState("");
    const [mode, setMode] = useState("");
    const [date, setDate] = useState<Date>(new Date());
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const openInvoices = useMemo(() => payableInvoices(invoices), [invoices]);
    // Drafts are NOT payable — processPayment rejects them, because finalizing is what debits
    // Accounts Receivable. Listing them as disabled with a reason beats dropping them silently:
    // a user looking for an invoice that is simply missing has no way to tell why.
    const draftInvoices = useMemo(() => draftInvoicesAwaitingFinalize(invoices), [invoices]);
    const selected = openInvoices.find((i) => i.id === invoiceId);
    const balance = selected ? remainingBalance(selected) : 0;
    const amount = parseFloat(amountStr);
    const amountCheck = selected && amountStr !== "" ? validateAmount(amount, selected) : null;

    const currencyFmt = (v: number) =>
        new Intl.NumberFormat("en-US", { style: "currency", currency: selected?.currency || "USD" }).format(v);

    const selectInvoice = (id: string) => {
        setInvoiceId(id);
        const inv = openInvoices.find((i) => i.id === id);
        // Prefill with the full remaining balance — the common case.
        if (inv) setAmountStr(String(Math.round(remainingBalance(inv) * 100) / 100));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selected || !amountCheck?.ok || !mode || submitting) return;
        setSubmitting(true);
        try {
            await recordPayment(selected.id, amount, mode, date, note || undefined);
            toast.success(t("payments.new.success"));
            router.push("/dashboard/accounting/payments");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t("payments.new.failed"));
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">{t("payments.new.title")}</h1>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label className="text-red-500">{t("payments.new.invoice")}</Label>
                            <Select value={invoiceId} onValueChange={selectInvoice} disabled={invoicesLoading}>
                                <SelectTrigger>
                                    <SelectValue
                                        placeholder={
                                            invoicesLoading
                                                ? t("common.loading")
                                                : openInvoices.length === 0
                                                  ? t("payments.new.noOpenInvoices")
                                                  : t("payments.new.selectInvoice")
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {openInvoices.map((inv) => (
                                        <SelectItem key={inv.id} value={inv.id}>
                                            {(inv.numberFormatted || inv.number || inv.id) +
                                                " — " +
                                                t("payments.new.due", {
                                                    amount: new Intl.NumberFormat("en-US", {
                                                        style: "currency",
                                                        currency: inv.currency || "USD",
                                                    }).format(remainingBalance(inv)),
                                                })}
                                        </SelectItem>
                                    ))}
                                    {draftInvoices.map((inv) => (
                                        <SelectItem key={inv.id} value={inv.id} disabled>
                                            {(inv.numberFormatted || inv.number || inv.id) +
                                                " — " +
                                                t("payments.new.finalizeFirst")}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selected && (
                                <p className="text-sm text-gray-500">
                                    {t("payments.new.balanceHint", { balance: currencyFmt(balance) })}
                                </p>
                            )}
                            {draftInvoices.length > 0 && (
                                <p className="text-sm text-amber-600">{t("payments.new.finalizeFirstHint")}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-red-500">{t("common.amount")}</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={amountStr}
                                    onChange={(e) => setAmountStr(e.target.value)}
                                    disabled={!selected}
                                />
                                {amountCheck && !amountCheck.ok && (
                                    <p className="text-sm text-red-600">
                                        {amountCheck.reason === "not-positive"
                                            ? t("payments.new.amountNotPositive")
                                            : t("payments.new.amountExceeds", { balance: currencyFmt(balance) })}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-red-500">{t("accounting.payments.paymentMode")}</Label>
                                <Select value={mode} onValueChange={setMode} disabled={modesLoading}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("payments.new.selectMode")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {paymentModes
                                            .filter((m) => m.isActive !== false)
                                            .map((m) => (
                                                <SelectItem key={m.id} value={m.name}>
                                                    {m.name}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t("common.date")}</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP") : t("common.pickDate")}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label>{t("payments.new.note")}</Label>
                            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
                                {t("common.cancel")}
                            </Button>
                            <Button type="submit" disabled={!selected || !mode || !amountCheck?.ok || submitting}>
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t("payments.new.submit")}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
