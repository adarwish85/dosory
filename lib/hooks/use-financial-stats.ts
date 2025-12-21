"use client";

import { useInvoices } from "@/lib/hooks/use-invoices";
import { useExpenses } from "@/lib/hooks/use-expenses"; // Assuming this exists based on dir listing
import { usePayments } from "@/lib/hooks/use-payments";

export function useFinancialStats() {
    // We fetch all records for now to calculate totals client-side
    // optimization: In a real app with large data, this should be a Cloud Function or dedicated stats document
    const { invoiceStats, loading: invoicesLoading } = useInvoices();
    const { expenseStats, expenses, loading: expensesLoading } = useExpenses();
    const { totalRevenue, payments, loading: paymentsLoading } = usePayments();

    const loading = invoicesLoading || expensesLoading || paymentsLoading;

    // Use pre-calculated stats or defaults
    const totalExpenses = expenseStats?.total || 0;
    const netProfit = totalRevenue - totalExpenses;

    // Calculate outstanding
    const totalOutstanding = invoiceStats?.totalDue || 0;

    return {
        loading,
        totalRevenue,
        totalExpenses,
        netProfit,
        totalOutstanding,
        stats: {
            ...invoiceStats,
            paymentCount: payments.length,
            expenseCount: expenses.length
        }
    };
}
