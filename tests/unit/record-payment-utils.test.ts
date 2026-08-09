/**
 * F6 — record-payment form logic (pure; no emulator).
 * Mirrors the processPayment callable's contract (functions/src/finance.ts).
 */
import {
    draftInvoicesAwaitingFinalize,
    isDraft,
    isPayable,
    payableInvoices,
    remainingBalance,
    validateAmount,
} from "@/lib/payments/record-payment-utils";

type Inv = Parameters<typeof isPayable>[0];
const inv = (over: Partial<Inv>): Inv =>
    ({ status: "sent", total: 100, amountPaid: 0, amountDue: 100, ...over }) as Inv;

describe("record-payment utils (F6)", () => {
    test("payable: sent/viewed/partial/overdue with balance; never paid/void/cancelled", () => {
        expect(isPayable(inv({ status: "sent" }))).toBe(true);
        expect(isPayable(inv({ status: "viewed" }))).toBe(true);
        expect(isPayable(inv({ status: "overdue" }))).toBe(true);
        expect(isPayable(inv({ status: "partial", amountPaid: 40, amountDue: 60 }))).toBe(true);
        expect(isPayable(inv({ status: "paid", amountPaid: 100, amountDue: 0 }))).toBe(false);
        expect(isPayable(inv({ status: "void" }))).toBe(false);
        expect(isPayable(inv({ status: "cancelled" }))).toBe(false);
    });

    test("a DRAFT is no longer payable — the contract changed 2026-08-09", () => {
        // This assertion used to read `isPayable(draft) === true`, mirroring a server that
        // accepted the payment. It should never have: finalizeInvoice is the only path that
        // DEBITS Accounts Receivable, so paying a draft credited a receivable that was never
        // debited (measured at AR net -100). processPayment now rejects it; the form must not
        // offer what the server refuses.
        expect(isDraft(inv({ status: "draft" }))).toBe(true);
        expect(isPayable(inv({ status: "draft" }))).toBe(false);
    });

    test("drafts with a balance are surfaced separately, so the form can say WHY", () => {
        // Dropping them silently is the failure mode this avoids: a user looking for an
        // invoice that is simply absent has no way to tell whether it is missing or blocked.
        const list = [inv({ status: "draft" }), inv({ status: "sent" }), inv({ status: "draft", amountDue: 0 })];
        expect(draftInvoicesAwaitingFinalize(list)).toHaveLength(1);
        expect(payableInvoices(list)).toHaveLength(1);
    });

    test("zero remaining balance is not payable even if status lagged", () => {
        expect(isPayable(inv({ status: "sent", amountPaid: 100, amountDue: 0 }))).toBe(false);
    });

    test("legacy invoices without amountDue fall back to total - amountPaid", () => {
        const legacy = { status: "sent", total: 150, amountPaid: 50 } as unknown as Inv;
        expect(remainingBalance(legacy)).toBe(100);
        expect(isPayable(legacy)).toBe(true);
    });

    test("payableInvoices filters a mixed list", () => {
        const list = [
            inv({ status: "sent" }),
            inv({ status: "paid", amountDue: 0 }),
            inv({ status: "partial", amountDue: 25 }),
            inv({ status: "void" }),
        ];
        expect(payableInvoices(list)).toHaveLength(2);
    });

    test("validateAmount: positive, within balance (server's 0.01 epsilon honored)", () => {
        const i = inv({ amountDue: 60 });
        expect(validateAmount(0, i)).toEqual({ ok: false, reason: "not-positive" });
        expect(validateAmount(-5, i)).toEqual({ ok: false, reason: "not-positive" });
        expect(validateAmount(NaN, i)).toEqual({ ok: false, reason: "not-positive" });
        expect(validateAmount(60, i)).toEqual({ ok: true }); // exact payoff
        expect(validateAmount(60.005, i)).toEqual({ ok: true }); // inside epsilon, server accepts
        expect(validateAmount(60.02, i)).toEqual({ ok: false, reason: "exceeds-balance" });
        expect(validateAmount(100, i)).toEqual({ ok: false, reason: "exceeds-balance" });
    });
});
