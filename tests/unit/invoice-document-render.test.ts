/**
 * What an invoice document is allowed to print.
 *
 * Two defects, both reported from prod on the same screen:
 *
 *  1. The page reconstructed ONE tax rate as `taxTotal / subTotal` and stamped it on every line.
 *     That is only correct when every line shares a rate and nothing is discounted. With a 14%
 *     line under a 5% discount it printed "VAT 13.30%" — on the document a customer is sent.
 *     The rate is now stored per line, so re-deriving one is banned outright.
 *
 *  2. The page hardcoded the literal string "EGP" in front of every figure, so every tenant's
 *     invoice claimed to be in Egyptian pounds whatever currency it was actually issued in.
 *     Money is formatted from the DOCUMENT's own currency (ruled 2026-09-23).
 *
 * And the document must RECONCILE: with the discount row drawn, subtotal - discount + tax +
 * adjustment has to equal the printed total. It did not, because the discount row was missing
 * entirely — the screen showed 200 + 26.60 against a total of 216.60.
 *
 * These are source assertions on purpose. There is no DOM test harness in this repo
 * (testEnvironment is "node", testMatch is *.test.ts, and @testing-library is not a dependency),
 * so the reachable guarantee is that the offending expressions are absent from the file that
 * renders the document.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { computeInvoiceTotals, round2 } from "@/lib/money/compute-invoice-totals";

const ROOT = join(__dirname, "..", "..");
const DETAIL = join(ROOT, "app", "dashboard", "invoices", "[id]", "page.tsx");
const src = readFileSync(DETAIL, "utf8");

describe("the invoice document never re-derives a tax rate", () => {
    test("no aggregate rate is computed from taxTotal / subTotal", () => {
        // Any spelling of the division, not just the one that shipped.
        expect(src).not.toMatch(/tax(Total)?\s*\/\s*sub[tT]otal/i);
    });

    test("no variable called taxPercentage survives", () => {
        expect(src).not.toMatch(/\btaxPercentage\b/);
    });

    test("the per-line rate comes from the line itself", () => {
        expect(src).toMatch(/item\.taxRate/);
    });
});

describe("the invoice document is priced in its own currency", () => {
    test("the literal EGP prefix is gone", () => {
        expect(src).not.toMatch(/EGP\{/);
    });

    test("money goes through formatMoney", () => {
        expect(src).toMatch(/from "@\/lib\/money\/format-money"/);
        expect(src).toMatch(/formatMoney\(/);
    });

    test("the currency used is the document's own field", () => {
        expect(src).toMatch(/invoice\.currency/);
    });
});

describe("the document shows every row needed to add up", () => {
    test("a discount row is rendered", () => {
        expect(src).toMatch(/invoices\.detail\.discount/);
    });

    test("amount due comes from the stored amountDue, not from the total", () => {
        // A partially-paid invoice showed the full total as still owing.
        expect(src).toMatch(/invoice\.amountDue/);
    });
});

describe("the arithmetic the document prints actually reconciles", () => {
    // The exact prod repro: 200 of goods, 5% document discount, one 14% VAT line.
    const totals = computeInvoiceTotals({
        items: [{ amount: 200, taxRate: 14 }],
        discount: { type: "percentage", value: 5 },
    });

    test("subtotal - discount + tax + adjustment === total", () => {
        expect(round2(totals.subtotal - totals.discountTotal + totals.taxTotal + totals.adjustment)).toBe(totals.total);
    });

    test("the rows a reader adds up are the ones the document has to show", () => {
        expect(totals.subtotal).toBe(200);
        expect(totals.discountTotal).toBe(10);
        expect(totals.taxTotal).toBe(26.6);
        expect(totals.total).toBe(216.6);
        // Without the discount row: 200 + 26.60 = 226.60, which is what the screen showed
        // against a total of 216.60 - a 10.00 hole exactly the size of the missing row.
        expect(round2(totals.subtotal + totals.taxTotal)).not.toBe(totals.total);
    });
});
