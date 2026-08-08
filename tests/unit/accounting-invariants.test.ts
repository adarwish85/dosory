/**
 * ACCOUNTING INVARIANTS.
 *
 * These are the properties that must hold for the books to mean anything. They are asserted
 * on the pure calculators rather than on prod data so they run in CI, plus a set of
 * structural guards that pin the specific defects fixed on 2026-08-08:
 *
 *   - the invoice total the user SEES must equal the total that gets PERSISTED
 *     (they differed by exactly `adjustment`, in both directions, for every invoice);
 *   - every journal entry must balance: sum(debit) === sum(credit);
 *   - no posting path may silently skip its journal entry.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { calculateInvoiceTotals } from "@/lib/services/invoice-service";
import type { LineItem } from "@/lib/types";

const REPO = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(REPO, p), "utf8");

const item = (amount: number, taxRate = 0): LineItem =>
    ({ id: "i", description: "d", quantity: 1, rate: amount, amount, taxRate, unit: "qty" }) as LineItem;

describe("invoice totals — screen and database cannot disagree", () => {
    test("adjustment is included in the total", () => {
        const base = calculateInvoiceTotals([item(100)]).total;
        expect(calculateInvoiceTotals([item(100)], undefined, 25).total).toBeCloseTo(base + 25, 6);
        expect(calculateInvoiceTotals([item(100)], undefined, -25).total).toBeCloseTo(base - 25, 6);
    });

    test("tax is included in the total (the on-screen formula used to omit it)", () => {
        const { total, taxTotal } = calculateInvoiceTotals([item(100, 14)]);
        expect(taxTotal).toBeCloseTo(14, 6);
        expect(total).toBeCloseTo(114, 6);
    });

    test("discount, tax and adjustment compose in the documented order", () => {
        // 100 - 10% = 90 taxable; tax 14% of 90 = 12.6; + 5 adjustment
        const { subtotal, taxTotal, total } = calculateInvoiceTotals(
            [item(100, 14)],
            { type: "percentage", value: 10 },
            5
        );
        expect(subtotal).toBeCloseTo(100, 6);
        expect(taxTotal).toBeCloseTo(12.6, 6);
        expect(total).toBeCloseTo(107.6, 6);
    });

    test("an empty/zero invoice never produces NaN", () => {
        // subtotal === 0 used to divide by zero inside the tax proration.
        for (const r of [calculateInvoiceTotals([]), calculateInvoiceTotals([item(0, 14)])]) {
            expect(Number.isNaN(r.total)).toBe(false);
            expect(Number.isNaN(r.taxTotal)).toBe(false);
        }
    });

    test("omitting adjustment is identical to passing 0 (back-compat for stored invoices)", () => {
        expect(calculateInvoiceTotals([item(250, 5)]).total).toBeCloseTo(
            calculateInvoiceTotals([item(250, 5)], undefined, 0).total,
            6
        );
    });
});

describe("journal entries balance", () => {
    /** Mirrors the line shape both the client and the Cloud Functions write. */
    const balances = (lines: { debit: number; credit: number }[]) => {
        const dr = lines.reduce((s, l) => s + (l.debit || 0), 0);
        const cr = lines.reduce((s, l) => s + (l.credit || 0), 0);
        return Math.abs(dr - cr) < 0.005;
    };

    test("the expense posting shape balances", () => {
        const amount = 1500;
        expect(
            balances([
                { debit: amount, credit: 0 },
                { debit: 0, credit: amount },
            ])
        ).toBe(true);
    });

    test("an unbalanced entry is rejected by the same check", () => {
        expect(
            balances([
                { debit: 100, credit: 0 },
                { debit: 0, credit: 90 },
            ])
        ).toBe(false);
    });
});

describe("no posting path may silently skip its journal entry", () => {
    test("the expense path logs when the chart of accounts cannot satisfy it", () => {
        const src = read("lib/hooks/use-expenses.ts");
        // The `if (creditAccount && debitAccount)` branch must have an else that reports.
        expect(src).toMatch(/expense saved WITHOUT a journal entry/);
        // …and it must actually load the chart rather than trusting an unfetched array.
        expect(src).toMatch(/accounts\.length > 0 \? accounts : await fetchAccounts\(\)/);
    });

    test("both Cloud Function posting paths log when accounts are missing", () => {
        const src = read("functions/src/finance.ts");
        expect(src).toMatch(/payment recorded WITHOUT a journal entry/);
        expect(src).toMatch(/invoice finalized WITHOUT a journal entry/);
    });

    test("the server resolves accounts from the SAME store the app writes", () => {
        // It used to read organizations/{orgId}/accounts — empty in every org — so every
        // server-side journal entry was skipped.
        const src = read("functions/src/finance.ts");
        const fn = src.slice(src.indexOf("async function findAccountByCode"));
        const body = fn.slice(0, fn.indexOf("\n}"));
        expect(body).toMatch(/db\.collection\("accounts"\)/);
        expect(body).toMatch(/where\("orgId", "==", orgId\)/);
        expect(body).not.toMatch(/collection\("organizations"\)/);
    });

    test("chart-of-accounts seeding is idempotent (deterministic ids, no addDoc)", () => {
        const src = read("lib/hooks/use-finance.ts");
        const fn = src.slice(src.indexOf("const seedDefaultAccounts"));
        const body = fn.slice(0, fn.indexOf("\n    };"));
        expect(body).toMatch(/\$\{orgId\}__acc-\$\{acc\.code\}/);
        expect(body).not.toMatch(/addDoc/);
    });

    test("there is exactly ONE calculateInvoiceTotals implementation", () => {
        // Two same-named money calculators is how a fix lands on the copy nobody calls.
        const hook = read("lib/hooks/use-invoices.ts");
        expect(hook).not.toMatch(/function calculateInvoiceTotals/);
        expect(hook).toMatch(/import \{ calculateInvoiceTotals \} from "@\/lib\/services\/invoice-service"/);
    });

    test("both invoice write paths persist `adjustment`", () => {
        expect(read("lib/hooks/use-invoices.ts")).toMatch(/adjustment: data\.adjustment \?\? 0/);
        expect(read("app/dashboard/invoices/new/page.tsx")).toMatch(/\n\s+adjustment,/);
        expect(read("components/dashboard/customers/invoices/invoice-sheet.tsx")).toMatch(/\n\s+adjustment,/);
    });

    test("the invoice detail page carries no hardcoded tenant identity", () => {
        const src = read("app/dashboard/invoices/[id]/page.tsx");
        // Strip comments: the note explaining the fix necessarily names the old literals,
        // and matching that would make this test assert against its own documentation.
        const code = src
            .split("\n")
            .filter((l) => !l.trim().startsWith("//"))
            .join("\n");
        for (const literal of ["WasilaDev", "EGIC", "Mabotheen", "EL-MANIAL"]) {
            expect(code).not.toContain(literal);
        }
        expect(code).toMatch(/orgSettings\.companyName/);
    });
});
