/**
 * One definition per summary card, and no currency is ever added to another.
 *
 * The two surfaces disagreed on all three cards, so the same invoices produced different figures
 * depending on which one you read. The source assertions at the bottom are what stop a third
 * surface inventing a fourth meaning.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { summariseInvoices, topGroups, type SummarisableInvoice } from "@/lib/money/invoice-summary";

const ROOT = join(__dirname, "..", "..");
const NOW = new Date("2026-09-24T12:00:00Z");
const past = new Date("2026-09-01T00:00:00Z");
const future = new Date("2026-12-01T00:00:00Z");

const run = (invoices: SummarisableInvoice[], orgDefaultCurrency = "USD") =>
    summariseInvoices(invoices, { orgDefaultCurrency, now: NOW });

describe("COLLECTED is cash actually received", () => {
    test("it sums amountPaid, not the total of paid invoices", () => {
        // A partially paid invoice: 1000 billed, 250 received. The old QuickStatsBar counted
        // nothing (status is not "paid"); the old chip counted 250. One of them had to go.
        const s = run([{ currency: "USD", status: "partial", total: 1000, amountPaid: 250, amountDue: 750 }]);
        expect(s.collected).toEqual([{ currency: "USD", amount: 250, count: 1 }]);
    });

    test("cash on a cancelled invoice still counts as collected", () => {
        // It was received. Whether the document was later killed is a different question.
        const s = run([{ currency: "USD", status: "cancelled", total: 100, amountPaid: 100, amountDue: 0 }]);
        expect(s.collected).toEqual([{ currency: "USD", amount: 100, count: 1 }]);
    });
});

describe("OUTSTANDING excludes what nobody owes", () => {
    const invoices: SummarisableInvoice[] = [
        { currency: "USD", status: "sent", amountDue: 100, dueDate: future },
        { currency: "USD", status: "draft", amountDue: 999, dueDate: future },
        { currency: "USD", status: "cancelled", amountDue: 777, dueDate: future },
        { currency: "USD", status: "void", amountDue: 555, dueDate: future },
    ];

    test("a draft is not money owed", () => {
        expect(run(invoices).outstanding).toEqual([{ currency: "USD", amount: 100, count: 1 }]);
    });

    test("the old behaviour would have read 2431 — the figure an owner read as money owed", () => {
        const naive = invoices.reduce((sum, i) => sum + (i.amountDue || 0), 0);
        expect(naive).toBe(2431);
        expect(run(invoices).outstanding[0].amount).not.toBe(naive);
    });
});

describe("OVERDUE is a fact about the date", () => {
    test("past due date counts even when the status has not been updated yet", () => {
        // trialExpiryCheck-style jobs set status on a schedule; the date does not wait for them.
        const s = run([{ currency: "USD", status: "sent", amountDue: 300, dueDate: past }]);
        expect(s.overdue).toEqual([{ currency: "USD", amount: 300, count: 1 }]);
    });

    test("a future due date is not overdue", () => {
        expect(run([{ currency: "USD", status: "sent", amountDue: 300, dueDate: future }]).overdue).toEqual([]);
    });

    test("a draft past its due date is still not owed, so not overdue", () => {
        expect(run([{ currency: "USD", status: "draft", amountDue: 300, dueDate: past }]).overdue).toEqual([]);
    });

    test("a Firestore Timestamp is accepted, not just a Date", () => {
        const ts = { toDate: () => past };
        expect(run([{ currency: "USD", status: "sent", amountDue: 42, dueDate: ts }]).overdue[0].amount).toBe(42);
    });

    test("a missing due date is never silently treated as overdue", () => {
        expect(run([{ currency: "USD", status: "sent", amountDue: 42 }]).overdue).toEqual([]);
    });
});

describe("currencies are grouped, never summed together", () => {
    const mixed: SummarisableInvoice[] = [
        { currency: "EGP", status: "sent", amountDue: 1000, amountPaid: 0, dueDate: future },
        { currency: "USD", status: "sent", amountDue: 200, amountPaid: 0, dueDate: future },
        { currency: "EGP", status: "sent", amountDue: 8, amountPaid: 0, dueDate: future },
    ];

    test("each currency is its own line, largest first", () => {
        expect(run(mixed).outstanding).toEqual([
            { currency: "EGP", amount: 1008, count: 2 },
            { currency: "USD", amount: 200, count: 1 },
        ]);
    });

    test("nothing anywhere produces the blended 1208", () => {
        const s = run(mixed);
        expect(s.outstanding.some((g) => g.amount === 1208)).toBe(false);
    });
});

describe("a document with no currency is counted, and named", () => {
    const invoices: SummarisableInvoice[] = [
        { currency: "EGP", status: "sent", amountDue: 100, dueDate: future },
        { status: "sent", amountDue: 50, dueDate: future },
    ];

    test("it joins the org-default group rather than vanishing", () => {
        const s = run(invoices, "EGP");
        expect(s.outstanding).toEqual([{ currency: "EGP", amount: 150, count: 2 }]);
    });

    test("and it is reported separately so the label can name it", () => {
        expect(run(invoices, "EGP").noCurrencyCount).toBe(1);
    });

    test("an empty-string currency counts as missing, not as a currency called ''", () => {
        expect(run([{ currency: "  ", status: "sent", amountDue: 1, dueDate: future }]).noCurrencyCount).toBe(1);
    });
});

describe("topGroups caps a card at two lines", () => {
    const four = [
        { currency: "EGP", amount: 4, count: 1 },
        { currency: "USD", amount: 3, count: 1 },
        { currency: "GBP", amount: 2, count: 1 },
        { currency: "EUR", amount: 1, count: 1 },
    ];

    test("two shown, the rest counted", () => {
        const d = topGroups(four);
        expect(d.shown.map((g) => g.currency)).toEqual(["EGP", "USD"]);
        expect(d.overflowCurrencies).toBe(2);
    });

    test("a single-currency tenant sees exactly one line and no overflow", () => {
        const d = topGroups([{ currency: "EGP", amount: 9, count: 3 }]);
        expect(d.shown).toHaveLength(1);
        expect(d.overflowCurrencies).toBe(0);
    });

    test("no invoices at all is empty, not a zero row", () => {
        expect(topGroups([])).toEqual({ shown: [], overflowCurrencies: 0 });
    });
});

describe("both surfaces use the shared definitions", () => {
    const SURFACES = ["app/dashboard/invoices/page.tsx", "components/dashboard/invoices/invoice-header.tsx"];

    test.each(SURFACES)("%s imports summariseInvoices", (rel) => {
        expect(readFileSync(join(ROOT, rel), "utf8")).toMatch(/from "@\/lib\/money\/invoice-summary"/);
    });

    test.each(SURFACES)("%s does not sum amountDue or amountPaid itself", (rel) => {
        const src = readFileSync(join(ROOT, rel), "utf8");
        // NOT [^)]* — that cannot cross the ")" in "(sum, inv)" and so never matched the real
        // code, making this assertion unfailable. Verified it fires on the pre-fix source.
        expect(src).not.toMatch(/reduce\([\s\S]{0,160}?amountDue/);
        expect(src).not.toMatch(/reduce\([\s\S]{0,160}?amountPaid/);
    });

    test("the header no longer hardcodes a currency", () => {
        const src = readFileSync(join(ROOT, "components/dashboard/invoices/invoice-header.tsx"), "utf8");
        expect(src).not.toMatch(/currency:\s*"EGP"/);
    });
});
