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
import { computeInvoiceTotals } from "@/lib/money/compute-invoice-totals";

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

    test.each(MUST_IMPORT)("%s imports computeInvoiceTotals", (rel) => {
        const src = readFileSync(join(ROOT, rel), "utf8");
        expect(src).toMatch(/from "@\/lib\/money\/compute-invoice-totals"/);
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
