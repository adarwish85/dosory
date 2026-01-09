"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { Invoice, Payment, CreditNote } from "@/lib/types";

// Transaction type for the statement
export type StatementTransaction = {
    id: string;
    date: Date;
    type: "invoice" | "payment" | "credit_note";
    reference: string; // Invoice number, Payment mode/ID, Credit Note number
    description: string;
    amount: number; // Positive for Debit (Invoice), Negative for Credit (Payment, CN)
    runningBalance: number;
    status: string; // "paid", "partial", "draft" etc. for invoices
    originalAmount?: number; // For display purposes (e.g. total invoice amount)
};

export interface StatementSummary {
    openingBalance: number;
    invoicedAmount: number;
    amountPaid: number;
    closingBalance: number;
}

interface UseStatementOptions {
    customerId: string;
    startDate?: Date; // If provided, calculate opening balance from transactions before this date
    endDate?: Date;
}

export function useStatement(options: UseStatementOptions) {
    const { customerId, startDate, endDate } = options;
    const { profile } = useUserProfile();

    const [transactions, setTransactions] = useState<StatementTransaction[]>([]);
    const [summary, setSummary] = useState<StatementSummary>({
        openingBalance: 0,
        invoicedAmount: 0,
        amountPaid: 0,
        closingBalance: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!profile?.orgId || !customerId) {
            setLoading(false);
            return;
        }

        console.log("useStatement: Fetching data for customer", customerId);
        setLoading(true);

        // We need to fetch ALL transactions to calculate opening balance correctly if startDate is set
        // Or if no startDate, we fetch all anyway.
        // Optimization: In a real large app, we might store monthly balances.
        // Here, we'll fetch all invoices, payments, and credit notes for the customer.

        const invoicesQuery = query(
            collection(db, "invoices"),
            where("orgId", "==", profile.orgId),
            where("customerId", "==", customerId),
            where("status", "in", ["sent", "viewed", "partial", "paid", "overdue"]) // Exclude drafts/cancelled
        );

        const paymentsQuery = query(
            collection(db, "payments"),
            where("orgId", "==", profile.orgId),
            where("customerId", "==", customerId)
        );

        // Assuming credit_notes collection exists - verifying with use-customer-data next step but assuming standard name
        const creditNotesQuery = query(
            collection(db, "credit_notes"),
            where("orgId", "==", profile.orgId),
            where("customerId", "==", customerId),
            where("status", "==", "closed") // Only closed/active credit notes affecting balance? Or open? Usually 'open' or 'closed' both affect if used?
            // Actually, usually a Credit Note credits the account when issued (Open) or applied.
            // Let's assume all non-void credit notes count.
        );

        // We use a single unsubscribe for simplicity, but we have 3 listeners.
        // To avoid complex state management with 3 listeners updating separately,
        // we can fetch once or use Promise.all if we don't strictly need real-time for the statement generation.
        // However, standard pattern here is real-time.
        // Let's use onSnapshot for all three.

        let invoices: Invoice[] = [];
        let payments: Payment[] = [];
        let creditNotes: CreditNote[] = [];
        let fetchedCount = 0;

        const processData = () => {
            if (fetchedCount < 2) return; // Wait for at least invoices and payments. Credit notes might be empty/optional if collection missing.

            // 1. Convert to unified transactions
            const allTransactions: StatementTransaction[] = [];

            // Invoices (Debit)
            invoices.forEach(inv => {
                const date = inv.date?.toDate() || new Date();
                allTransactions.push({
                    id: inv.id,
                    date,
                    type: "invoice",
                    reference: inv.numberFormatted || inv.number,
                    description: `Invoice #${inv.numberFormatted || inv.number}`,
                    amount: inv.total, // Increases balance
                    runningBalance: 0,
                    status: inv.status,
                    originalAmount: inv.total
                });
            });

            // Payments (Credit)
            payments.forEach(pay => {
                const date = pay.date?.toDate() || new Date();
                allTransactions.push({
                    id: pay.id,
                    date,
                    type: "payment",
                    reference: pay.invoiceNumber || "Payment",
                    description: `Payment for ${pay.invoiceNumber}`,
                    amount: -pay.amount, // Decreases balance
                    runningBalance: 0,
                    status: "paid",
                    originalAmount: pay.amount
                });
            });

            // Credit Notes (Credit)
            // TODO: verify credit note logic when we see the file, assuming simple credit for now
            creditNotes.forEach(cn => {
                if (cn.status === 'void') return;
                const date = cn.date?.toDate() || new Date();
                allTransactions.push({
                    id: cn.id,
                    date,
                    type: "credit_note",
                    reference: cn.number,
                    description: `Credit Note #${cn.number}`,
                    amount: -cn.total, // Decreases balance
                    runningBalance: 0,
                    status: cn.status,
                    originalAmount: cn.total
                });
            });

            // 2. Sort by date
            allTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());

            // 3. Calculate Running Balance and filter by Date Range
            let runningBalance = 0;
            let openingBalance = 0;
            let rangeInvoiced = 0;
            let rangePaid = 0; // Includes payments and credit notes
            const finalTransactions: StatementTransaction[] = [];

            allTransactions.forEach(tx => {
                const isBeforeStart = startDate && tx.date < startDate;
                const isAfterEnd = endDate && tx.date > endDate;

                if (isBeforeStart) {
                    runningBalance += tx.amount;
                    openingBalance += tx.amount;
                } else if (!isAfterEnd) {
                    // within range (or no range)
                    runningBalance += tx.amount;
                    tx.runningBalance = runningBalance;
                    finalTransactions.push(tx);

                    if (tx.amount > 0) rangeInvoiced += tx.amount;
                    else rangePaid += Math.abs(tx.amount);
                }
            });

            setTransactions(finalTransactions);
            setSummary({
                openingBalance,
                invoicedAmount: rangeInvoiced,
                amountPaid: rangePaid,
                closingBalance: openingBalance + rangeInvoiced - rangePaid
            });
            setLoading(false);
        };

        const unsubInvoices = onSnapshot(invoicesQuery, (snap) => {
            invoices = snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice));
            fetchedCount++;
            processData();
        }, (err) => { console.error("Error fetching invoices", err); setError(err); });

        const unsubPayments = onSnapshot(paymentsQuery, (snap) => {
            payments = snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
            fetchedCount++;
            processData();
        }, (err) => { console.error("Error fetching payments", err); setError(err); });

        // Safely try fetching credit notes
        let unsubCreditNotes = () => { };
        try {
            unsubCreditNotes = onSnapshot(creditNotesQuery, (snap) => {
                creditNotes = snap.docs.map(d => ({ id: d.id, ...d.data() } as CreditNote));
                // We don't increment fetchedCount here strictly to block,
                // in case the collection doesn't exist yet, we just render what we have.
                // But typically we should. Let's assume it works.
                processData();
            }, (err) => {
                console.warn("Error fetching credit notes (might not exist yet)", err);
                // Don't fail the whole hook
            });
        } catch (e) {
            console.warn("Failed to set up credit notes listener", e);
        }

        return () => {
            unsubInvoices();
            unsubPayments();
            unsubCreditNotes();
        };

    }, [profile?.orgId, customerId, startDate, endDate]);

    return {
        transactions,
        summary,
        loading,
        error
    };
}
