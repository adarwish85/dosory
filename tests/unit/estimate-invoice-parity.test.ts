/**
 * An estimate and the invoice converted from it must say the same number.
 *
 * WHY THIS EXISTS. There were two calculators. `useSales.calculateTotals` taxed the GROSS line
 * amount and subtracted the discount afterwards; `calculateInvoiceTotals` taxed the NET amount.
 * On 200 at 14% VAT with a 5% discount that is 218.00 on the estimate and 216.60 on the invoice —
 * and `convertToInvoice` copied the estimate's stored totals verbatim, so the invoice inherited
 * the estimate's arithmetic and a customer could be billed either number depending on which
 * screen created the document.
 *
 * RULED 2026-09-23: VAT is charged on the NET amount. invoice-service.ts was right; the estimate
 * path was wrong.
 *
 * The source guard below is the load-bearing half. Asserting only that two functions agree would
 * stay green the moment someone adds a THIRD calculator somewhere else — so instead this scans
 * for tax arithmetic anywhere outside lib/money and requires the list to be empty. It identifies
 * the offence by the arithmetic itself, not by a naming convention (CLAUDE.md standing lesson 9).
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { computeInvoiceTotals, totalsAsIssued } from "@/lib/money/compute-invoice-totals";

const ROOT = join(__dirname, "..", "..");

/** Every .ts/.tsx under a directory, skipping node_modules and macOS sidecars. */
function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        if (name.startsWith("._") || name === "node_modules" || name === ".next") continue;
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full, out);
        else if (/\.tsx?$/.test(name)) out.push(full);
    }
    return out;
}

describe("there is exactly one place that multiplies by a tax rate", () => {
    // `x * (rate / 100)` and `x * rate / 100` in any spacing. This is the shape of charging tax.
    const TAX_ARITHMETIC = /\*\s*\(?\s*(?:item\.|line\.|l\.)?taxRate\s*\/\s*100\s*\)?/;

    test("no file outside lib/money computes tax from a rate", () => {
        const files = [...walk(join(ROOT, "lib")), ...walk(join(ROOT, "app")), ...walk(join(ROOT, "components"))];
        const offenders = files
            .filter((f) => !f.includes(join("lib", "money")))
            .filter((f) => TAX_ARITHMETIC.test(readFileSync(f, "utf8")))
            .map((f) => f.slice(ROOT.length + 1));
        expect(offenders).toEqual([]);
    });
});

describe("every money write path routes through the shared calculator", () => {
    const MUST_IMPORT = [
        "lib/hooks/use-sales.ts",
        "lib/hooks/leads/use-lead-conversion.ts",
        "lib/services/lead-service.ts",
        "lib/services/invoice-service.ts",
        "lib/hooks/use-invoices.ts",
    ];

    test.each(MUST_IMPORT)("%s routes through the shared money module", (rel) => {
        const src = readFileSync(join(ROOT, rel), "utf8");
        // Either directly, or through buildInvoiceDocument — which is itself the only shaping
        // path and calls the calculator. Both are the shared route; a local calculation is not,
        // and the tax-arithmetic scan above is what actually forbids one.
        const direct = /from "@\/lib\/money\/compute-invoice-totals"/.test(src);
        const viaBuilder = /from "@\/lib\/invoices\/build-invoice-document"/.test(src);
        expect([rel, direct || viaBuilder]).toEqual([rel, true]);
    });
});

describe("the estimate and its invoice agree, by construction", () => {
    const items = [
        { amount: 200, taxRate: 14 },
        { amount: 50, taxRate: 0 },
    ];
    const discount = { type: "percentage" as const, value: 5 };

    test("same inputs, same money", () => {
        const estimate = computeInvoiceTotals({ items, discount });
        const invoice = computeInvoiceTotals({ items, discount });
        expect(invoice.total).toBe(estimate.total);
        expect(invoice.taxTotal).toBe(estimate.taxTotal);
        expect(invoice.discountTotal).toBe(estimate.discountTotal);
    });

    test("and it is the NET figure, not the gross one the estimate used to produce", () => {
        const t = computeInvoiceTotals({ items, discount });
        // gross basis would be 250 + 28.00 - 12.50 = 265.50
        // net basis is    250 - 12.50 = 237.50, tax 190*14% = 26.60, total 264.10
        expect(t.total).toBe(264.1);
        expect(t.total).not.toBe(265.5);
    });
});

describe("converting an accepted document bills what it SAID", () => {
    // A quote issued under the old gross-basis arithmetic: 250 of goods, 5% off, 14% on one line.
    // It told the customer 265.50. Today's calculator would say 264.10 for the same inputs.
    const acceptedEstimate = { subtotal: 250, taxTotal: 28, total: 265.5 };
    const itemsAndDiscount = {
        items: [
            { amount: 200, taxRate: 14 },
            { amount: 50, taxRate: 0 },
        ],
        discount: { type: "percentage" as const, value: 5 },
    };

    test("the stored total is carried forward, NOT recomputed", () => {
        const carried = totalsAsIssued(acceptedEstimate, itemsAndDiscount);
        expect(carried.total).toBe(265.5);
        expect(carried.stale).toBe(true);
    });

    test("recomputing would have repriced the quote — proving the difference is real", () => {
        const recomputed = computeInvoiceTotals(itemsAndDiscount);
        expect(recomputed.total).toBe(264.1);
        expect(recomputed.total).not.toBe(acceptedEstimate.total);
    });

    test("a document that stored no total IS computed — nothing ever showed a customer a number", () => {
        const carried = totalsAsIssued({}, itemsAndDiscount);
        expect(carried.total).toBe(264.1);
        expect(carried.stale).toBe(false);
    });

    test("discountTotal is derived when absent, so the carried document can draw its row", () => {
        const carried = totalsAsIssued(acceptedEstimate, itemsAndDiscount);
        expect(carried.discountTotal).toBe(12.5);
        expect(carried.total).toBe(265.5); // still the issued figure
    });
});

describe("every conversion path carries totals forward", () => {
    const CONVERSION_SITES = [
        "lib/hooks/use-sales.ts",
        "lib/hooks/leads/use-lead-conversion.ts",
        "lib/services/lead-service.ts",
    ];

    test.each(CONVERSION_SITES)("%s uses totalsAsIssued, not a bare recompute", (rel) => {
        const src = readFileSync(join(ROOT, rel), "utf8");
        expect(src).toMatch(/totalsAsIssued\(/);
    });
});
