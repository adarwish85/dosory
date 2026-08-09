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

// ---------------------------------------------------------------------------
// RULE (b) — a receivable may only be credited if it was debited first.
// RULE (c) — a receivable that was debited must be reversed when the invoice is voided.
//
// Both were measured on 2026-08-09 (AR net -100 and +250 respectively) and fixed the same
// day. The behavioural proof lives in tests/backend/finance.test.ts, which needs the
// emulator; these are the structural guards that run everywhere, including a bare
// `npx jest`.
// ---------------------------------------------------------------------------
describe("rule (b) — a draft invoice cannot take a payment", () => {
    const finance = () => read("functions/src/finance.ts");

    test("processPayment rejects a draft, and says what to do about it", () => {
        const src = finance();
        const fn = src.slice(src.indexOf("export const processPayment"));
        const body = fn.slice(0, fn.indexOf("export const finalizeInvoice"));
        expect(body).toMatch(/invoice\?\.status === "draft"/);
        expect(body).toMatch(/Finalize it before recording a payment/);
    });

    test("the rejection is keyed on `status`, NOT on `isFinalized`", () => {
        // `isFinalized` is only written by finalizeInvoice, which failed for every tenant
        // until 2026-08-08 — requiring it would block payment on legitimately-sent invoices.
        const src = finance();
        const fn = src.slice(src.indexOf("export const processPayment"));
        const body = fn.slice(0, fn.indexOf("export const finalizeInvoice"));
        expect(body).not.toMatch(/!invoice\?\.isFinalized/);
    });

    test("the record-payment form refuses drafts too, and explains why", () => {
        const utils = read("lib/payments/record-payment-utils.ts");
        expect(utils).toMatch(/export function isDraft/);
        expect(utils).toMatch(/if \(isDraft\(inv\)\) return false;/);
        expect(utils).toMatch(/draftInvoicesAwaitingFinalize/);

        const page = read("app/dashboard/payments/new/page.tsx");
        expect(page).toMatch(/draftInvoicesAwaitingFinalize/);
        expect(page).toMatch(/payments\.new\.finalizeFirst/);
    });

    test("the 'finalize first' copy exists in BOTH locales", () => {
        for (const locale of ["en", "ar"]) {
            const json = JSON.parse(read(`lib/i18n/locales/${locale}.json`));
            expect(typeof json["payments.new.finalizeFirst"]).toBe("string");
            expect(typeof json["payments.new.finalizeFirstHint"]).toBe("string");
        }
    });
});

describe("rule (c) — voiding a finalized invoice reverses its receivable", () => {
    const voidFn = () => {
        const src = read("functions/src/finance.ts");
        return src.slice(src.indexOf("export const voidInvoice"));
    };

    test("voidInvoice looks up the original entry and posts a reversal linked to it", () => {
        const body = voidFn();
        expect(body).toMatch(/where\("referenceType", "==", "invoice"\)/);
        expect(body).toMatch(/reversesEntryId/);
        expect(body).toMatch(/of Invoice #\$\{label\}/);
        expect(body).toMatch(/terminalStatus === "cancelled" \? "Cancellation" : "Void"/);
    });

    test("the reversal is the MIRROR of the finalize entry: DR income, CR receivable", () => {
        const body = voidFn();
        const lines = body.slice(body.indexOf("lines: ["));
        // income line carries the debit, AR line carries the credit
        expect(lines).toMatch(/accountId: incomeAccount\.id,[\s\S]{0,120}debit: amount/);
        expect(lines).toMatch(/accountId: arAccount\.id,[\s\S]{0,120}credit: amount/);
    });

    test("the reversal id is deterministic, so voiding twice cannot double-reverse", () => {
        expect(voidFn()).toMatch(/doc\(`je-void-\$\{invoiceId\}`\)/);
    });

    test("all reads happen before any write (Firestore rejects the other order)", () => {
        const body = voidFn();
        const firstWrite = body.indexOf("t.update(invoiceRef");
        const lastRead = Math.max(body.lastIndexOf("await t.get("), body.lastIndexOf("findAccountByCode(t"));
        expect(lastRead).toBeGreaterThan(-1);
        expect(lastRead).toBeLessThan(firstWrite);
    });

    test("a void with nothing posted is logged, not treated as an error", () => {
        expect(voidFn()).toMatch(/no invoice journal entry to reverse/);
    });
});

describe("payment modes are classified by DATA, not by a display name", () => {
    test("finance.ts no longer matches a hardcoded list against the raw mode string", () => {
        const src = read("functions/src/finance.ts");
        expect(src).not.toMatch(/\["bank_transfer", "cheque", "card"\]\.includes/);
        expect(src).toMatch(/resolvePaymentModeType/);
    });

    test("the tenant's paymentModes document wins over the name", () => {
        const src = read("functions/src/finance.ts");
        const fn = src.slice(src.indexOf("async function resolvePaymentModeType"));
        const body = fn.slice(0, fn.indexOf("\n}"));
        expect(body).toMatch(/collection\("paymentModes"\)/);
        expect(body).toMatch(/classifyFromDoc/);
        // the name is the FALLBACK, so it must come after the document lookup
        expect(body.indexOf("classifyFromDoc")).toBeLessThan(body.indexOf("return classifyByName"));
    });

    test("separator and case differences cannot change the account", () => {
        const src = read("functions/src/payment-modes.ts");
        expect(src).toMatch(/replace\(\/\[\\s\\-\/\.\]\+\/g, "_"\)/);
        expect(src).toMatch(/toLowerCase\(\)/);
    });

    test("the seeded modes carry an explicit `type`", () => {
        const seed = read("lib/provisioning/seed-tenant-defaults.ts");
        const block = seed.slice(seed.indexOf('seedIfEmpty("paymentModes"'));
        const body = block.slice(0, block.indexOf("]);"));
        const modes = body.match(/name: "[^"]+"/g) || [];
        expect(modes.length).toBeGreaterThan(0);
        expect((body.match(/type: "(bank|cash)"/g) || []).length).toBe(modes.length);
    });
});

describe("every terminal invoice status posts its reversal (panel finding, 2026-08-09)", () => {
    test("the client routes BOTH void and cancelled through the callable", () => {
        // `cancelled` is the only kill action the UI offers, and it used to fall through to a
        // bare updateDoc: no reversal, and `amountDue` left intact so AR aging kept billing it.
        const src = read("lib/hooks/use-invoices.ts");
        expect(src).toMatch(/newStatus === "void" \|\| newStatus === "cancelled"/);
        const fn = src.slice(src.indexOf("const updateStatus"));
        const body = fn.slice(0, fn.indexOf("\n    );"));
        // the direct updateDoc fallback must come AFTER the callable branch
        expect(body.indexOf('httpsCallable(functions, "voidInvoice")')).toBeLessThan(body.indexOf("updateDoc(doc(db"));
    });

    test("analytics stops counting a cancelled invoice, as it does a void", () => {
        const src = read("functions/src/analytics.ts");
        const fn = src.slice(src.indexOf("const isValidStatus"));
        expect(fn.slice(0, 220)).toMatch(/status !== "cancelled"/);
    });

    test("the void lookup cannot select its own reversal", () => {
        // Comment-stripped: the comment explaining why a `where("reversesEntryId", …)` filter is
        // WRONG here would otherwise satisfy the negative assertion below.
        const src = read("functions/src/finance.ts")
            .split("\n")
            .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*"))
            .join("\n");
        const fn = src.slice(src.indexOf("export const voidInvoice"));
        // reversals are filtered in memory — a `== null` filter would drop every legitimate
        // original, which has no such field at all (Sweep C).
        expect(fn).toMatch(/docs\.find\(\(d\) => !d\.data\(\)\.reversesEntryId\)/);
        expect(fn).not.toMatch(/where\("reversesEntryId"/);
    });

    test("the correction plan does not count a reversal as an unreversed receivable", () => {
        const src = read("scripts/audit/audit-payment-je-corrections.ts");
        expect(src).toMatch(/referenceType === "invoice" && !d\.data\(\)\.reversesEntryId/);
        expect(src).toMatch(/reversedInvoiceIds/);
    });
});
