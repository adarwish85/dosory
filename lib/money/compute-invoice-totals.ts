/**
 * THE invoice/estimate/credit-note total calculator. One function, no second copy.
 *
 * WHY THIS EXISTS. Three calculators disagreed on the same inputs. `calculateInvoiceTotals`
 * (invoice-service.ts) taxed the amount AFTER discount; `useSales.calculateTotals` taxed BEFORE
 * it and subtracted the discount afterwards. On 200 at 14% VAT with a 5% discount that is 216.60
 * versus 218.00 — and because lead conversion copies an estimate's stored totals verbatim into a
 * new invoice, which number a customer was billed depended on which screen created the document.
 *
 * It also returns PER-LINE results. The invoice detail page used to reconstruct a single tax rate
 * as `taxTotal / subtotal` and stamp it on every line, which is only correct when every line
 * shares one rate and nothing is discounted; with a discount it printed "VAT 13.30%" for a 14%
 * line. A renderer must never re-derive a rate — it reads `lines[i].taxRate` from here (or from
 * the stored document, which now persists the same numbers).
 *
 * ROUNDING. Every component is rounded to 2dp and `total` is composed from the ROUNDED parts, so
 * `subtotal - discountTotal + taxTotal + adjustment === total` holds exactly. That identity is
 * what lets the document reconcile on screen; compute the total from unrounded parts and the
 * printed rows stop adding up by a cent.
 */

/** A minor-unit-safe 2dp round. Money is never stored or shown at more precision than this. */
export function round2(n: number): number {
    if (!Number.isFinite(n)) return 0;
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface DiscountInput {
    type: "percentage" | "fixed";
    value: number;
}

/** What the calculator needs from a line. `amount` is quantity x rate, already computed. */
export interface LineInput {
    amount: number;
    /** Percent, e.g. 14 for 14%. Absent or 0 means untaxed. */
    taxRate?: number;
}

export interface ComputedLine {
    /** The line's own pre-discount amount. */
    amount: number;
    /** The rate actually applied, persisted so no renderer recomputes one. */
    taxRate: number;
    /** This line's share of the document discount. */
    discountAmount: number;
    /** What tax was charged on, after TAX_BASIS is applied. */
    taxableAmount: number;
    /** The tax charged on this line, persisted alongside the rate. */
    taxAmount: number;
}

export interface InvoiceTotals {
    subtotal: number;
    discountTotal: number;
    /** Sum of line taxableAmount — subtotal - discountTotal under the "net" basis. */
    taxableTotal: number;
    taxTotal: number;
    adjustment: number;
    total: number;
    lines: ComputedLine[];
}

export interface ComputeTotalsInput {
    items: LineInput[];
    discount?: DiscountInput | null;
    /** Signed manual correction applied last (rounding, goodwill, a late fee). */
    adjustment?: number;
}

/**
 * Whether tax is charged on the amount NET of discount, or on the GROSS line amount.
 *
 * RULED 2026-09-23: "net" — VAT is charged after the discount. Reversing this is this one
 * constant; nothing else in the codebase encodes the order, which is the whole point of routing
 * every surface through this function.
 */
export const TAX_BASIS: "net" | "gross" = "net";

export function computeInvoiceTotals(input: ComputeTotalsInput): InvoiceTotals {
    const items = input.items || [];
    const adjustment = round2(input.adjustment || 0);

    const subtotal = round2(items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0));

    let discountTotal = 0;
    if (input.discount && input.discount.value) {
        discountTotal =
            input.discount.type === "percentage"
                ? round2(subtotal * (Number(input.discount.value) / 100))
                : round2(Number(input.discount.value) || 0);
    }
    // A discount can never exceed the goods, and never go negative — either would invert the
    // sign of the tax base and bill a customer a negative VAT.
    discountTotal = Math.min(Math.max(discountTotal, 0), subtotal);

    // Spread the document-level discount across lines in proportion to their amount, so each
    // line can carry its own tax base. Guard subtotal === 0: the ratio divides by it and a NaN
    // would propagate into the persisted total.
    const lines: ComputedLine[] = items.map((item) => {
        const amount = round2(Number(item.amount) || 0);
        const taxRate = Number(item.taxRate) || 0;
        const share = subtotal > 0 ? amount / subtotal : 0;
        const lineDiscount = round2(discountTotal * share);
        const taxableAmount = TAX_BASIS === "net" ? round2(amount - lineDiscount) : amount;
        const taxAmount = round2(taxableAmount * (taxRate / 100));
        return { amount, taxRate, discountAmount: lineDiscount, taxableAmount, taxAmount };
    });

    const taxTotal = round2(lines.reduce((sum, l) => sum + l.taxAmount, 0));
    const taxableTotal = round2(lines.reduce((sum, l) => sum + l.taxableAmount, 0));

    // Composed from the ROUNDED parts on purpose — see the header note on reconciliation.
    const total = round2(subtotal - discountTotal + taxTotal + adjustment);

    return { subtotal, discountTotal, taxableTotal, taxTotal, adjustment, total, lines };
}
