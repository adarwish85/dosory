/**
 * Canonical payment-mode → ledger-account classification.
 *
 * THE DEFECT THIS REPLACES (found 2026-08-09 by tests/backend/finance.test.ts, confirmed on
 * prod): processPayment classified with
 *
 *     ["bank_transfer", "cheque", "card"].includes(paymentMode.toLowerCase())
 *
 * while /dashboard/payments/new writes the payment mode's DISPLAY NAME (`value={m.name}`).
 * `"Bank Transfer".toLowerCase()` is `"bank transfer"` — a SPACE, not an underscore — so the
 * list matched nothing and EVERY payment posted to Cash (1000). All 12 prod orgs offer exactly
 * "Bank Transfer" and "Cash"; all 3 real payments carry "Bank Transfer".
 *
 * The rule now, in priority order:
 *   1. the tenant's own `paymentModes` document — its `type` (or `slug`) is the authority;
 *   2. otherwise, the NAME normalized for case and separators;
 *   3. otherwise `unknown`, which posts to Cash exactly as before but is logged and stamped on
 *      the payment, so it can be found later instead of silently becoming a cash sale.
 *
 * Matching on a display name is inherently fragile — a tenant can rename "Bank Transfer" to
 * "Wire" or "تحويل بنكي" at any time — which is why the DOCUMENT wins over the string.
 */

export type PaymentModeType = "cash" | "bank" | "unknown";

/** Ledger account codes. Kept here so the mapping lives with the classification. */
export const ACCOUNT_CODE_BY_TYPE: Record<PaymentModeType, string> = {
    bank: "1010", // Bank
    cash: "1000", // Cash
    unknown: "1000", // unchanged default — see the module note
};

/**
 * Lower-case, collapse every separator run to a single underscore, drop anything else.
 * "Bank Transfer" / "bank-transfer" / "BANK  TRANSFER" all become "bank_transfer".
 */
export function normalizeModeKey(raw: string): string {
    return String(raw ?? "")
        .trim()
        .toLowerCase()
        .replace(/[\s\-/.]+/g, "_")
        .replace(/[^a-z0-9_]/g, "")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");
}

// Deliberately conservative: only names whose accounting treatment is unambiguous. Anything
// else resolves to `unknown` and gets logged, rather than being guessed into the books.
const BANK_KEYS = new Set([
    "bank_transfer",
    "bank",
    "banktransfer",
    "wire",
    "wire_transfer",
    "transfer",
    "cheque",
    "check",
    "card",
    "credit_card",
    "debit_card",
]);

const CASH_KEYS = new Set(["cash", "petty_cash", "cash_on_hand"]);

/** Classify from a display name / slug alone (step 2 of the rule above). */
export function classifyByName(raw: string): PaymentModeType {
    const key = normalizeModeKey(raw);
    if (!key) return "unknown";
    if (BANK_KEYS.has(key)) return "bank";
    if (CASH_KEYS.has(key)) return "cash";
    return "unknown";
}

/** Normalize whatever a paymentModes document carries in `type` / `slug`. */
export function classifyFromDoc(doc: { type?: unknown; slug?: unknown } | null | undefined): PaymentModeType {
    if (!doc) return "unknown";
    const explicit = normalizeModeKey(String(doc.type ?? ""));
    if (explicit === "bank" || explicit === "cash") return explicit;
    if (explicit) {
        const viaType = classifyByName(explicit);
        if (viaType !== "unknown") return viaType;
    }
    if (doc.slug) return classifyByName(String(doc.slug));
    return "unknown";
}

export function accountCodeFor(type: PaymentModeType): string {
    return ACCOUNT_CODE_BY_TYPE[type];
}
