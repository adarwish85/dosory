/**
 * EasyKash — pure logic. No Firestore, no network, no env. Everything here is testable from a
 * plain `npx jest` run, which is what a payment verifier needs.
 *
 * WHY EasyKash is modelled as INVOICE-AND-RENEW, not as a subscription: EasyKash has no
 * recurring-charge product. Every period is a separate hosted payment that the customer
 * completes by card, wallet, or a Fawry/Aman cash voucher. So the platform issues a fresh
 * attempt per period, emails the link, and extends the subscription when the callback confirms
 * payment. There is nothing to "cancel" at the provider; a tenant simply stops paying.
 *
 * Spec: https://easykash.gitbook.io/easykash-apis-documentation
 */

import { createHmac, timingSafeEqual } from "crypto";

// ---------------------------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------------------------

/**
 * The fields whose values are concatenated to form the signature base, IN THIS ORDER.
 * Straight from the callback-verification page: "ProductCode, Amount, ProductType,
 * PaymentMethod, status, easykashRef, customerReference". The order is load-bearing — any other
 * permutation produces a different hash and every callback would be rejected.
 */
export const SIGNATURE_FIELDS = [
    "ProductCode",
    "Amount",
    "ProductType",
    "PaymentMethod",
    "status",
    "easykashRef",
    "customerReference",
] as const;

export type EasyKashCallback = {
    ProductCode?: unknown;
    Amount?: unknown;
    ProductType?: unknown;
    PaymentMethod?: unknown;
    status?: unknown;
    easykashRef?: unknown;
    customerReference?: unknown;
    signatureHash?: unknown;
    voucher?: unknown;
    BuyerEmail?: unknown;
    BuyerMobile?: unknown;
    BuyerName?: unknown;
    VoucherData?: unknown;
    Timestamp?: unknown;
};

/**
 * Concatenate the signed fields. Values are used verbatim as strings — notably `Amount` arrives
 * as "11.00", and re-formatting it (parseFloat, toFixed, locale) changes the hash. An absent
 * field contributes an empty string, which is what the documented example does for `voucher`
 * (not a signed field, but the same principle).
 */
export function buildSignatureBase(payload: EasyKashCallback): string {
    return SIGNATURE_FIELDS.map((f) => {
        const v = (payload as Record<string, unknown>)[f];
        return v === undefined || v === null ? "" : String(v);
    }).join("");
}

/**
 * HMAC-SHA512, hex digest, compared in constant time.
 *
 * Fails CLOSED: a missing secret, a missing signatureHash, or any length/content mismatch all
 * return false. A payment verifier that treats "no secret configured" as "allow" is a way to
 * credit a subscription for free.
 */
export function verifyCallbackSignature(payload: EasyKashCallback, secret: string | undefined): boolean {
    if (!secret) return false;
    const provided = payload.signatureHash;
    if (typeof provided !== "string" || provided.length === 0) return false;

    const expected = createHmac("sha512", secret).update(buildSignatureBase(payload), "utf8").digest("hex");

    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(provided.toLowerCase(), "utf8");
    if (a.length !== b.length) return false; // timingSafeEqual throws on length mismatch
    return timingSafeEqual(a, b);
}

/** Sign a payload — used by the stub simulator and by the tests. Same code path as verification. */
export function signCallback(payload: EasyKashCallback, secret: string): string {
    return createHmac("sha512", secret).update(buildSignatureBase(payload), "utf8").digest("hex");
}

// ---------------------------------------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------------------------------------

export type AttemptStatus = "pending" | "paid" | "failed" | "expired" | "cancelled" | "refunded";

/**
 * Map an EasyKash status to ours. Their Payment Inquiry documents:
 * DELIVERED, EXPIRED, FAILED, NEW, PAID, REFUNDED, CANCELED — and the callback "always returns
 * PAID". Anything unrecognised stays `pending` rather than being guessed into a terminal state:
 * a wrong `failed` cancels a subscription the customer actually paid for.
 */
export function mapProviderStatus(raw: unknown): AttemptStatus | "unknown" {
    const s = String(raw ?? "")
        .trim()
        .toUpperCase();
    switch (s) {
        case "PAID":
        case "DELIVERED":
            return "paid";
        case "FAILED":
            return "failed";
        case "EXPIRED":
            return "expired";
        case "CANCELED":
        case "CANCELLED":
            return "cancelled";
        case "REFUNDED":
            return "refunded";
        case "NEW":
            return "pending";
        default:
            return "unknown";
    }
}

// ---------------------------------------------------------------------------------------------
// Money + period math
// ---------------------------------------------------------------------------------------------

/**
 * Compare the amount a callback reports against the amount we recorded on the attempt.
 * Amounts arrive as strings ("11.00"); compare numerically at 2dp so "11" and "11.00" agree,
 * while 11 vs 11.5 does not. A mismatch must REJECT — the attempt is the source of truth for
 * what we asked to be paid.
 */
export function amountsMatch(expected: number, reported: unknown): boolean {
    const r = typeof reported === "number" ? reported : parseFloat(String(reported ?? ""));
    if (!Number.isFinite(r)) return false;
    return Math.round(expected * 100) === Math.round(r * 100);
}

export type BillingCycleLike = "monthly" | "annual";

/**
 * Extend a period by one billing cycle.
 *
 * Renewal is measured from the CURRENT period end when that is still in the future, so paying
 * early does not throw away the days already bought; from `now` when the subscription has
 * already lapsed, so a tenant who pays late gets a full period rather than one that is already
 * partly spent.
 *
 * Month arithmetic clamps to the end of a short month: 31 Jan + 1 month is 28/29 Feb, not
 * 3 March. JavaScript's Date rolls over, so the clamp is explicit.
 */
export function computeNextPeriod(
    cycle: BillingCycleLike,
    now: Date,
    currentPeriodEnd?: Date | null
): { start: Date; end: Date } {
    const start =
        currentPeriodEnd && currentPeriodEnd.getTime() > now.getTime() ? new Date(currentPeriodEnd) : new Date(now);
    return { start, end: addCycle(start, cycle) };
}

export function addCycle(from: Date, cycle: BillingCycleLike): Date {
    const d = new Date(from);
    const day = d.getDate();
    if (cycle === "annual") {
        d.setFullYear(d.getFullYear() + 1);
    } else {
        d.setMonth(d.getMonth() + 1);
    }
    // If the target month is shorter, Date has rolled into the next month — pull it back.
    if (d.getDate() !== day) d.setDate(0);
    return d;
}

// ---------------------------------------------------------------------------------------------
// Plan pricing
// ---------------------------------------------------------------------------------------------

export type PlanLike = {
    id?: string;
    name?: string;
    currency?: string;
    isFree?: boolean;
    /**
     * MINOR UNITS (cents/piastres). The Super Admin plan editor labels this field
     * "Monthly Price (cents)" with the placeholder "4900 = $49.00", and its table formats it as
     * `cents / 100` — so 4900 means 49.00, not 4,900.
     */
    billing?: { monthlyPrice?: number; annualPrice?: number };
};

export type PriceResolution =
    | { ok: true; amount: number; currency: string }
    | { ok: false; reason: "free-plan" | "no-price" | "no-currency" };

/**
 * Resolve what to charge for a plan + cycle.
 *
 * FAILS CLOSED, deliberately. The two published plans in prod (`plan_starter`,
 * `plan_professional`) carry NO `currency` and NO `billing.monthlyPrice`/`annualPrice` at all —
 * verified 2026-08-09. A resolver that defaulted to 0 would hand out paid plans for nothing, and
 * one that defaulted to a currency would bill the wrong money. Checkout must refuse and say so.
 */
export function resolvePlanPrice(plan: PlanLike | null | undefined, cycle: BillingCycleLike): PriceResolution {
    if (!plan) return { ok: false, reason: "no-price" };
    if (plan.isFree) return { ok: false, reason: "free-plan" };

    // UNIT CONVERSION, and the only place it happens. The plan stores MINOR units; EasyKash's
    // Pay API takes a MAJOR-unit amount ("Amount must be in the currency being sent"). Passing
    // the stored number straight through charges 100× — a 49.00 plan would bill 4,900.
    const raw = cycle === "annual" ? plan.billing?.annualPrice : plan.billing?.monthlyPrice;
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return { ok: false, reason: "no-price" };
    if (!Number.isInteger(raw)) return { ok: false, reason: "no-price" }; // minor units are whole
    const amount = Math.round(raw) / 100;

    const currency = typeof plan.currency === "string" ? plan.currency.trim().toUpperCase() : "";
    if (!SUPPORTED_CURRENCIES.includes(currency)) return { ok: false, reason: "no-currency" };

    return { ok: true, amount, currency };
}

/** EasyKash's documented currency list. Anything else is rejected before we call them. */
export const SUPPORTED_CURRENCIES = ["EGP", "USD", "SAR", "EUR", "GBP", "QAR", "AED", "KWD"];

// ---------------------------------------------------------------------------------------------
// Customer reference
// ---------------------------------------------------------------------------------------------

/**
 * The Pay API types `customerReference` as a number, and it comes back on the callback as a
 * string ("TEST11111" in their own example). So we issue a NUMBER, send a number, and compare
 * as a string — never parse the returned value back into a number and compare numerically,
 * which would make "0123" and "123" the same reference.
 */
export function customerReferenceMatches(numericRef: number, reported: unknown): boolean {
    return String(numericRef) === String(reported ?? "").trim();
}
