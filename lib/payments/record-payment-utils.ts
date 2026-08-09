import type { Invoice } from "@/lib/types";

/**
 * Pure helpers for the record-payment form (/dashboard/payments/new).
 * Mirrors the processPayment callable's contract (functions/src/finance.ts):
 *  - an invoice is payable unless paid/void/cancelled and while any balance remains
 *  - a payment must be > 0 and must not exceed the remaining balance (0.01 epsilon,
 *    same as the server's overpayment check)
 */

const UNPAYABLE_STATUSES = new Set(["paid", "void", "cancelled"]);

/**
 * A draft has no receivable yet — finalizeInvoice is the only path that DEBITS Accounts
 * Receivable, so paying one first credits AR with no matching debit and the books stop
 * reconciling. processPayment rejects it server-side (2026-08-09); this keeps the form from
 * offering an invoice the server will refuse, and `draftReason` gives the UI something honest
 * to say instead of an unexplained absence.
 */
const DRAFT_STATUSES = new Set(["draft"]);

export function isDraft(inv: Pick<Invoice, "status">): boolean {
    return DRAFT_STATUSES.has(inv.status);
}

export function remainingBalance(inv: Pick<Invoice, "total" | "amountPaid" | "amountDue">): number {
    // amountDue is maintained by processPayment; fall back to total-amountPaid for
    // invoices that predate it.
    if (typeof inv.amountDue === "number") return inv.amountDue;
    return (inv.total || 0) - (inv.amountPaid || 0);
}

export function isPayable(inv: Pick<Invoice, "status" | "total" | "amountPaid" | "amountDue">): boolean {
    if (UNPAYABLE_STATUSES.has(inv.status)) return false;
    if (isDraft(inv)) return false; // finalize first — see DRAFT_STATUSES
    return remainingBalance(inv) > 0.009;
}

/** Drafts that WOULD be payable once finalized — the form lists them as blocked, not missing. */
export function draftInvoicesAwaitingFinalize<T extends Pick<Invoice, "status" | "total" | "amountPaid" | "amountDue">>(
    invoices: T[]
): T[] {
    return invoices.filter((inv) => isDraft(inv) && remainingBalance(inv) > 0.009);
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
