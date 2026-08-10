/**
 * EasyKash HTTP client — Pay API and Payment Inquiry.
 *
 * STUB MODE. EasyKash publishes no sandbox, so `EASYKASH_MODE=stub` swaps the network calls for
 * a local simulation: `createPayment` returns a link to our own stub page, and
 * /api/billing/easykash/stub/simulate produces a correctly-SIGNED callback. That makes the whole
 * loop — checkout, callback, subscription extension, reconciler — verifiable end to end before
 * any real key exists, and it is the only mode the emulator suite ever uses. It refuses to run
 * when NEXT_PUBLIC_APP_URL points at the live domain, so it cannot be left on by accident.
 *
 * Secrets are read from the environment only (EASYKASH_API_KEY, EASYKASH_HMAC_SECRET), declared
 * in apphosting.yaml as Secret Manager references. No value is ever stored in Firestore or logged.
 */

const PAY_URL = "https://back.easykash.net/api/directpayv1/pay";
const INQUIRE_URL = "https://back.easykash.net/api/cash-api/inquire";

export type EasyKashMode = "live" | "stub";

export function easykashMode(): EasyKashMode {
    return process.env.EASYKASH_MODE === "stub" ? "stub" : "live";
}

export function easykashConfigured(): boolean {
    return easykashMode() === "stub" || Boolean(process.env.EASYKASH_API_KEY);
}

export type PayRequest = {
    amount: number;
    currency: string;
    name: string;
    email: string;
    mobile: string;
    redirectUrl: string;
    customerReference: number;
    /** Hours a cash (Fawry/Aman) voucher stays payable. Their default is 3; we ask for 24. */
    cashExpiry?: number;
};

export type PayResult = { ok: true; redirectUrl: string; productCode: string } | { ok: false; error: string };

/**
 * POST /api/directpayv1/pay
 *
 * `paymentOptions` is deliberately OMITTED so the buyer sees every method enabled on the
 * account. Sending a subset here silently hides Fawry/wallets from customers who need them.
 */
export async function createPayment(req: PayRequest): Promise<PayResult> {
    if (easykashMode() === "stub") {
        const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        if (/dosory\.com/i.test(base)) {
            return { ok: false, error: "EASYKASH_MODE=stub refuses to run against the live domain" };
        }
        const productCode = `STUB${req.customerReference}`;
        const url = new URL(`${base}/api/billing/easykash/stub/checkout`);
        url.searchParams.set("customerReference", String(req.customerReference));
        url.searchParams.set("amount", req.amount.toFixed(2));
        url.searchParams.set("redirectUrl", req.redirectUrl);
        return { ok: true, redirectUrl: url.toString(), productCode };
    }

    const apiKey = process.env.EASYKASH_API_KEY;
    if (!apiKey) return { ok: false, error: "EASYKASH_API_KEY is not configured" };

    let res: Response;
    try {
        res = await fetch(PAY_URL, {
            method: "POST",
            headers: { authorization: apiKey, "Content-Type": "application/json" },
            body: JSON.stringify({
                amount: req.amount,
                currency: req.currency,
                name: req.name,
                email: req.email,
                mobile: req.mobile,
                redirectUrl: req.redirectUrl,
                customerReference: req.customerReference,
                cashExpiry: req.cashExpiry ?? 24,
            }),
        });
    } catch (error) {
        return { ok: false, error: `network error calling EasyKash: ${String(error)}` };
    }

    const text = await res.text();
    if (!res.ok) return { ok: false, error: `EasyKash returned ${res.status}: ${text.slice(0, 300)}` };

    let body: { redirectUrl?: string };
    try {
        body = JSON.parse(text);
    } catch {
        return { ok: false, error: `EasyKash returned unparseable JSON: ${text.slice(0, 300)}` };
    }
    if (!body.redirectUrl) return { ok: false, error: "EasyKash response carried no redirectUrl" };

    return { ok: true, redirectUrl: body.redirectUrl, productCode: productCodeFromUrl(body.redirectUrl) };
}

/** "https://www.easykash.net/DirectPayV1/{productCode}" — the code is the last path segment. */
export function productCodeFromUrl(url: string): string {
    try {
        const parts = new URL(url).pathname.split("/").filter(Boolean);
        return parts[parts.length - 1] || "";
    } catch {
        return "";
    }
}

export type InquiryResult =
    | { ok: true; status: string; easykashRef?: string; amount?: unknown; paymentMethod?: string; voucher?: string }
    | { ok: false; error: string };

/** POST /api/cash-api/inquire — the reconciler's only source of truth about a stale attempt. */
export async function inquirePayment(customerReference: number | string): Promise<InquiryResult> {
    const apiKey = process.env.EASYKASH_API_KEY;
    if (!apiKey) return { ok: false, error: "EASYKASH_API_KEY is not configured" };

    let res: Response;
    try {
        res = await fetch(INQUIRE_URL, {
            method: "POST",
            headers: { authorization: apiKey, "Content-Type": "application/json" },
            body: JSON.stringify({ customerReference: String(customerReference) }),
        });
    } catch (error) {
        return { ok: false, error: `network error calling EasyKash inquiry: ${String(error)}` };
    }

    const text = await res.text();
    if (!res.ok) return { ok: false, error: `inquiry returned ${res.status}: ${text.slice(0, 300)}` };

    try {
        const body = JSON.parse(text) as Record<string, unknown>;
        return {
            ok: true,
            status: String(body.status ?? ""),
            easykashRef: body.easykashRef ? String(body.easykashRef) : undefined,
            amount: body.Amount,
            paymentMethod: body.PaymentMethod ? String(body.PaymentMethod) : undefined,
            voucher: body.voucher ? String(body.voucher) : undefined,
        };
    } catch {
        return { ok: false, error: `inquiry returned unparseable JSON: ${text.slice(0, 300)}` };
    }
}
