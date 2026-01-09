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

interface RecordPaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customerId: string;
    customerName: string;
}

export function RecordPaymentDialog({ open, onOpenChange, customerId, customerName }: RecordPaymentDialogProps) {
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
            toast.error("Please fill in all required fields");
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        setSubmitting(true);
        try {
            await recordPayment(selectedInvoiceId, numAmount, paymentMode, date, note);
            toast.success("Payment recorded successfully");
            onOpenChange(false);
            // Reset form
            setSelectedInvoiceId("");
            setAmount("");
            setNote("");
            setPaymentMode("Bank Transfer");
        } catch (error: any) {
            console.error("Error recording payment:", error);
            toast.error(error.message || "Failed to record payment");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                    <DialogDescription>Record a payment received from {customerName}.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Invoice Selection */}
                    <div className="space-y-2">
                        <Label>Invoice</Label>
                        <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
                            <SelectTrigger>
                                <SelectValue
                                    placeholder={loadingInvoices ? "Loading invoices..." : "Select Invoice to Pay"}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {outstandingInvoices.length === 0 ? (
                                    <SelectItem value="none" disabled>
                                        No outstanding invoices
                                    </SelectItem>
                                ) : (
                                    outstandingInvoices.map((inv) => (
                                        <SelectItem key={inv.id} value={inv.id}>
                                            {inv.number} - Due: ${inv.amountDue.toFixed(2)}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                        <Label>Amount Received</Label>
                        <Input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                        />
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <Label>Payment Date</Label>
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
                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Payment Mode */}
                    <div className="space-y-2">
                        <Label>Payment Mode</Label>
                        <Select value={paymentMode} onValueChange={setPaymentMode}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Cheque">Cheque</SelectItem>
                                <SelectItem value="Credit Card">Credit Card</SelectItem>
                                <SelectItem value="PayPal">PayPal</SelectItem>
                                <SelectItem value="Stripe">Stripe</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Note */}
                    <div className="space-y-2">
                        <Label>Note / Transaction ID</Label>
                        <Textarea
                            placeholder="Enter transaction details..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting || !selectedInvoiceId}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Record Payment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
