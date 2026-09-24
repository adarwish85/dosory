/**
 * The one way to put an invoice number on a screen.
 *
 * WHY. Documents carry BOTH `number` (a raw counter value, e.g. 2) and `numberFormatted`
 * (e.g. "INV-000002"). The list, the document heading and the pay page printed the raw one; the
 * activity feed, the statement and the reports printed the formatted one. So the same invoice was
 * "2" on one screen and "INV-000002" on the next, and neither could be searched for reliably.
 *
 * It is worse on older documents. Until 2026-07-17 the counter transaction was permission-denied
 * for every tenant, and the generator silently fell back to `Date.now()` — so some live invoices
 * have `number: 1782922104393`. Printing the raw field puts a 13-digit timestamp in front of a
 * customer; `numberFormatted` at least prefixes it.
 */

export interface InvoiceNumberLike {
    numberFormatted?: string | number | null;
    number?: string | number | null;
    id?: string;
}

/**
 * The customer-facing label for an invoice. Prefers the formatted number, falls back to the raw
 * one for documents written before it was stored, and finally to the document id so a row is
 * never blank.
 */
export function invoiceNumberLabel(invoice: InvoiceNumberLike | null | undefined): string {
    if (!invoice) return "-";
    const formatted = invoice.numberFormatted;
    if (formatted !== undefined && formatted !== null && String(formatted).trim() !== "") {
        return String(formatted);
    }
    const raw = invoice.number;
    if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
        return String(raw);
    }
    return invoice.id ? String(invoice.id) : "-";
}
