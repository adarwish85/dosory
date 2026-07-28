import type { Invoice } from "@/lib/types";

/**
 * Pure helpers for the record-payment form (/dashboard/payments/new).
 * Mirrors the processPayment callable's contract (functions/src/finance.ts):
 *  - an invoice is payable unless paid/void/cancelled and while any balance remains
 *  - a payment must be > 0 and must not exceed the remaining balance (0.01 epsilon,
 *    same as the server's overpayment check)
 */

const UNPAYABLE_STATUSES = new Set(["paid", "void", "cancelled"]);

export function remainingBalance(inv: Pick<Invoice, "total" | "amountPaid" | "amountDue">): number {
    // amountDue is maintained by processPayment; fall back to total-amountPaid for
    // invoices that predate it.
    if (typeof inv.amountDue === "number") return inv.amountDue;
    return (inv.total || 0) - (inv.amountPaid || 0);
}

export function isPayable(inv: Pick<Invoice, "status" | "total" | "amountPaid" | "amountDue">): boolean {
    if (UNPAYABLE_STATUSES.has(inv.status)) return false;
    return remainingBalance(inv) > 0.009;
}

export function payableInvoices<T extends Pick<Invoice, "status" | "total" | "amountPaid" | "amountDue">>(
    invoices: T[]
): T[] {
    return invoices.filter(isPayable);
}

export type AmountValidation = { ok: true } | { ok: false; reason: "not-positive" | "exceeds-balance" };

export function validateAmount(
    amount: number,
    inv: Pick<Invoice, "total" | "amountPaid" | "amountDue">
): AmountValidation {
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, reason: "not-positive" };
    // Same epsilon the server uses: newPaid > total + 0.01 rejects.
    if (amount > remainingBalance(inv) + 0.01) return { ok: false, reason: "exceeds-balance" };
    return { ok: true };
}
