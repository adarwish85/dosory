/**
 * The money contract: one calculator, one formatter.
 *
 * The scenario in the first describe block is the one a human reported from prod — 200 of goods,
 * a 5% document discount, a single 14% VAT line — where the screen printed "VAT 13.30%" per line
 * and showed Sub Total 200 + VAT 26.60 against a Total of 216.60, which does not add up because
 * the discount row was never drawn.
 *
 * The LEGACY PARITY block is the important one for safety: it asserts the new calculator returns
 * the SAME total as the shipped `calculateInvoiceTotals` across a spread of inputs. Invoices are
 * live customer documents, so the new function must be a refactor for them, not a repricing. Only
 * the estimate path (which taxed pre-discount) is allowed to move, and that move is asserted in
 * tests/unit/estimate-invoice-parity.test.ts.
 */
import { computeInvoiceTotals, round2, TAX_BASIS } from "@/lib/money/compute-invoice-totals";
import { formatMoney, currencySymbol } from "@/lib/money/format-money";
import type { LineItem } from "@/lib/types";

const line = (amount: number, taxRate?: number) => ({ amount, taxRate });

describe("the reported prod scenario: 200 @ 14% VAT with a 5% discount", () => {
    const totals = computeInvoiceTotals({
        items: [line(200, 14)],
        discount: { type: "percentage", value: 5 },
    });

    test("the discount is a real, named number — not a silently-dropped row", () => {
        expect(totals.discountTotal).toBe(10);
    });

    test("VAT is charged on the NET amount, 190, not on 200", () => {
        // 190 * 14% = 26.60. Taxing gross would give 28.00.
        expect(totals.taxTotal).toBe(26.6);
        expect(totals.taxableTotal).toBe(190);
    });

    test("the total is 216.60", () => {
        expect(totals.total).toBe(216.6);
    });

    test("the document RECONCILES: subtotal - discount + tax + adjustment === total", () => {
        const { subtotal, discountTotal, taxTotal, adjustment, total } = totals;
        expect(round2(subtotal - discountTotal + taxTotal + adjustment)).toBe(total);
    });

    test("the line carries its OWN rate, 14 — the bug printed 13.30 (26.60/200)", () => {
        expect(totals.lines[0].taxRate).toBe(14);
        // The number the old renderer would have shown, proving the two are different.
        expect(round2((totals.taxTotal / totals.subtotal) * 100)).toBe(13.3);
    });

    test("the line's tax amount is persisted too, so nothing downstream re-derives it", () => {
        expect(totals.lines[0].taxAmount).toBe(26.6);
        expect(totals.lines[0].discountAmount).toBe(10);
        expect(totals.lines[0].taxableAmount).toBe(190);
    });
});

describe("the tax basis is a single switch", () => {
    test('it is "net" — the ruling of 2026-09-23', () => {
        expect(TAX_BASIS).toBe("net");
    });
});

describe("mixed rates, which an aggregate rate can never represent", () => {
    const totals = computeInvoiceTotals({
        items: [line(100, 14), line(100, 0), line(100, 5)],
        discount: { type: "fixed", value: 30 },
    });

    test("each line keeps its own rate", () => {
        expect(totals.lines.map((l) => l.taxRate)).toEqual([14, 0, 5]);
    });

    test("the discount is prorated across lines and sums back to the document discount", () => {
        expect(totals.lines.map((l) => l.discountAmount)).toEqual([10, 10, 10]);
        expect(round2(totals.lines.reduce((s, l) => s + l.discountAmount, 0))).toBe(totals.discountTotal);
    });

    test("tax is charged per line on its own net amount", () => {
        // 90*14% = 12.60, 90*0% = 0, 90*5% = 4.50
        expect(totals.lines.map((l) => l.taxAmount)).toEqual([12.6, 0, 4.5]);
        expect(totals.taxTotal).toBe(17.1);
    });

    test("it still reconciles", () => {
        expect(round2(totals.subtotal - totals.discountTotal + totals.taxTotal + totals.adjustment)).toBe(totals.total);
    });
});

describe("edge cases that used to produce NaN or a negative bill", () => {
    test("a zero subtotal does not divide by zero", () => {
        const t = computeInvoiceTotals({ items: [line(0, 14)], discount: { type: "percentage", value: 10 } });
        expect(t.total).toBe(0);
        expect(Number.isNaN(t.taxTotal)).toBe(false);
    });

    test("no items at all is zero, not NaN", () => {
        const t = computeInvoiceTotals({ items: [] });
        expect(t).toMatchObject({ subtotal: 0, discountTotal: 0, taxTotal: 0, total: 0 });
    });

    test("a discount larger than the goods is clamped — never a negative tax base", () => {
        const t = computeInvoiceTotals({ items: [line(100, 14)], discount: { type: "fixed", value: 500 } });
        expect(t.discountTotal).toBe(100);
        expect(t.taxTotal).toBe(0);
        expect(t.total).toBe(0);
    });

    test("a negative discount is clamped to zero rather than inflating the bill", () => {
        const t = computeInvoiceTotals({ items: [line(100, 14)], discount: { type: "fixed", value: -50 } });
        expect(t.discountTotal).toBe(0);
        expect(t.total).toBe(114);
    });

    test("the signed adjustment lands in the total and in the reconciliation", () => {
        const t = computeInvoiceTotals({ items: [line(100)], adjustment: -0.37 });
        expect(t.total).toBe(99.63);
        expect(round2(t.subtotal - t.discountTotal + t.taxTotal + t.adjustment)).toBe(t.total);
    });

    test("float dust never reaches the total", () => {
        const t = computeInvoiceTotals({ items: [line(0.1), line(0.2)] });
        expect(t.subtotal).toBe(0.3);
        expect(t.total).toBe(0.3);
    });
});

/**
 * A FROZEN copy of the arithmetic that shipped in lib/services/invoice-service.ts before the
 * refactor, reproduced verbatim. It is duplicated here on purpose: `calculateInvoiceTotals` now
 * delegates to `computeInvoiceTotals`, so comparing against the live export would compare the new
 * function with itself and pass no matter what it did (CLAUDE.md standing lesson 9 — a guard that
 * cannot fail blesses everything). Comparing against this frozen copy is what actually proves no
 * live invoice is repriced. Do not "simplify" it to call the real implementation.
 */
function legacyCalculateInvoiceTotals(
    items: LineItem[],
    discount?: { type: "percentage" | "fixed"; value: number },
    adjustment: number = 0
) {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    let discountAmount = 0;
    if (discount) {
        discountAmount = discount.type === "percentage" ? subtotal * (discount.value / 100) : discount.value;
    }
    const taxableAmount = subtotal - discountAmount;
    const taxTotal = items.reduce((sum, item) => {
        if (item.taxRate && subtotal > 0) {
            const itemTaxable = item.amount * (taxableAmount / subtotal);
            return sum + itemTaxable * (item.taxRate / 100);
        }
        return sum;
    }, 0);
    const total = taxableAmount + taxTotal + (adjustment || 0);
    return { subtotal, taxTotal, total };
}

describe("LEGACY PARITY — invoices must not be repriced by this refactor", () => {
    // Every shape the shipped calculator supported. If any of these diverge, the refactor is a
    // repricing of live customer documents and must stop for a ruling, not ship.
    const cases: Array<{
        name: string;
        items: LineItem[];
        discount?: { type: "percentage" | "fixed"; value: number };
        adjustment?: number;
    }> = [
        {
            name: "the reported scenario",
            items: [{ amount: 200, taxRate: 14 }] as LineItem[],
            discount: { type: "percentage", value: 5 },
        },
        { name: "no discount, single rate", items: [{ amount: 1000, taxRate: 14 }] as LineItem[] },
        {
            name: "mixed rates, fixed discount",
            items: [
                { amount: 100, taxRate: 14 },
                { amount: 100, taxRate: 5 },
            ] as LineItem[],
            discount: { type: "fixed", value: 30 },
        },
        {
            name: "untaxed lines",
            items: [{ amount: 250 }, { amount: 750 }] as LineItem[],
            discount: { type: "percentage", value: 10 },
        },
        { name: "with a signed adjustment", items: [{ amount: 500, taxRate: 14 }] as LineItem[], adjustment: -12.5 },
        {
            name: "zero subtotal",
            items: [{ amount: 0, taxRate: 14 }] as LineItem[],
            discount: { type: "percentage", value: 5 },
        },
    ];

    test.each(cases)("$name: total matches the shipped calculator", ({ items, discount, adjustment }) => {
        const legacy = legacyCalculateInvoiceTotals(items, discount, adjustment);
        const next = computeInvoiceTotals({ items, discount, adjustment });
        expect(next.total).toBe(round2(legacy.total));
        expect(next.subtotal).toBe(round2(legacy.subtotal));
        expect(next.taxTotal).toBe(round2(legacy.taxTotal));
    });
});

describe("formatMoney takes the DOCUMENT's currency and has no org fallback", () => {
    test("the same amount formats differently per currency", () => {
        expect(formatMoney(1234.5, "USD")).toContain("1,234.50");
        expect(formatMoney(1234.5, "USD")).toContain("$");
        expect(formatMoney(1234.5, "EGP")).toContain("1,234.50");
        expect(formatMoney(1234.5, "EGP")).not.toContain("$");
    });

    test("currency is a required parameter — there is no one-argument call", () => {
        // A compile-time guarantee; asserted here so deleting the requirement fails a test too.
        expect(formatMoney.length).toBeGreaterThanOrEqual(2);
    });

    test("a non-finite amount formats as zero rather than NaN", () => {
        expect(formatMoney(NaN, "USD")).toContain("0.00");
        expect(formatMoney(Infinity, "USD")).toContain("0.00");
    });

    test("an unknown currency code degrades instead of throwing", () => {
        expect(() => formatMoney(10, "NOTACODE")).not.toThrow();
        expect(formatMoney(10, "NOTACODE")).toContain("10.00");
    });

    test("an empty currency falls back to USD rather than rendering undefined", () => {
        expect(formatMoney(10, "")).toContain("$");
    });

    test("currencySymbol is document-scoped too", () => {
        expect(currencySymbol("USD")).toBe("$");
        expect(typeof currencySymbol("EGP")).toBe("string");
    });
});
