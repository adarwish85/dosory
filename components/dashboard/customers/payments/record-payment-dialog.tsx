"use client";

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useInvoices } from "@/lib/hooks/use-invoices";
import { toast } from "sonner";
import { Invoice } from "@/lib/types";
import { useTranslation } from "@/lib/i18n";

interface RecordPaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customerId: string;
    customerName: string;
}

export function RecordPaymentDialog({ open, onOpenChange, customerId, customerName }: RecordPaymentDialogProps) {
    const { t } = useTranslation();
    const { invoices, loading: loadingInvoices, recordPayment } = useInvoices({ customerId });
    const [outstandingInvoices, setOutstandingInvoices] = useState<Invoice[]>([]);

    // Form State
    const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
    const [amount, setAmount] = useState("");
    const [paymentMode, setPaymentMode] = useState("Bank Transfer");
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Filter for outstanding invoices when invoices load
    useEffect(() => {
        if (invoices) {
            const outstanding = invoices.filter(
                (inv) => inv.status !== "paid" && inv.status !== "cancelled" && inv.status !== "draft"
            );
            setOutstandingInvoices(outstanding);
        }
    }, [invoices]);

    // When invoice is selected, auto-fill amount
    useEffect(() => {
        if (selectedInvoiceId) {
            const inv = outstandingInvoices.find((i) => i.id === selectedInvoiceId);
            if (inv) {
                setAmount(inv.amountDue.toString());
            }
        }
    }, [selectedInvoiceId, outstandingInvoices]);

    const handleSubmit = async () => {
        if (!selectedInvoiceId || !amount || !date) {
            toast.error(t("customers.payments.fillRequired"));
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            toast.error(t("customers.payments.invalidAmount"));
            return;
        }

        setSubmitting(true);
        try {
            await recordPayment(selectedInvoiceId, numAmount, paymentMode, date, note);
            toast.success(t("customers.payments.recordSuccess"));
            onOpenChange(false);
            // Reset form
            setSelectedInvoiceId("");
            setAmount("");
            setNote("");
            setPaymentMode("Bank Transfer");
        } catch (error: any) {
            console.error("Error recording payment:", error);
            toast.error(error.message || t("customers.payments.recordError"));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("customers.payments.title")}</DialogTitle>
                    <DialogDescription>{t("customers.payments.description", { name: customerName })}</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Invoice Selection */}
                    <div className="space-y-2">
                        <Label>{t("customers.payments.invoice")}</Label>
                        <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
                            <SelectTrigger>
                                <SelectValue
                                    placeholder={loadingInvoices ? t("customers.payments.loadingInvoices") : t("customers.payments.selectInvoice")}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {outstandingInvoices.length === 0 ? (
                                    <SelectItem value="none" disabled>
                                        {t("customers.payments.noOutstanding")}
                                    </SelectItem>
                                ) : (
                                    outstandingInvoices.map((inv) => (
                                        <SelectItem key={inv.id} value={inv.id}>
                                            {inv.number} - {t("customers.payments.due")}: ${inv.amountDue.toFixed(2)}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                        <Label>{t("customers.payments.amountReceived")}</Label>
                        <Input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                        />
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <Label>{t("customers.payments.paymentDate")}</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>{t("customers.payments.pickDate")}</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Payment Mode */}
                    <div className="space-y-2">
                        <Label>{t("customers.payments.paymentMode")}</Label>
                        <Select value={paymentMode} onValueChange={setPaymentMode}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Bank Transfer">{t("customers.payments.mode.bankTransfer")}</SelectItem>
                                <SelectItem value="Cash">{t("customers.payments.mode.cash")}</SelectItem>
                                <SelectItem value="Cheque">{t("customers.payments.mode.cheque")}</SelectItem>
                                <SelectItem value="Credit Card">{t("customers.payments.mode.creditCard")}</SelectItem>
                                <SelectItem value="PayPal">{t("customers.payments.mode.paypal")}</SelectItem>
                                <SelectItem value="Stripe">{t("customers.payments.mode.stripe")}</SelectItem>
                                <SelectItem value="Other">{t("customers.payments.mode.other")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Note */}
                    <div className="space-y-2">
                        <Label>{t("customers.payments.note")}</Label>
                        <Textarea
                            placeholder={t("customers.payments.notePlaceholder")}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t("common.cancel")}
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting || !selectedInvoiceId}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t("customers.payments.recordPayment")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
