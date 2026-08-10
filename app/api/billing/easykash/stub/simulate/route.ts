/**
 * STUB callback generator. Only exists when EASYKASH_MODE=stub.
 *
 * Builds a callback payload in EasyKash's exact shape, SIGNS it with the same
 * EASYKASH_HMAC_SECRET the verifier uses, and posts it to the real callback route — so the stub
 * proves the production verifier, not a bypass of it. There is deliberately no way to skip
 * signing: if the secret is missing, this fails, exactly as a real callback would.
 */
import { NextRequest, NextResponse } from "next/server";
import { EasyKashCallback, signCallback } from "@/lib/billing/easykash-core";
import { easykashMode } from "@/lib/billing/easykash-client";

export async function POST(request: NextRequest) {
    if (easykashMode() !== "stub") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const form = await request.formData().catch(() => null);
    const body = form
        ? Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]))
        : ((await request.json().catch(() => ({}))) as Record<string, string>);

    const outcome = String(body.outcome || "paid");
    const customerReference = String(body.customerReference || "");
    const amount = Number(body.amount || 0).toFixed(2);
    const redirectUrl = String(body.redirectUrl || "/dashboard");

    const secret = process.env.EASYKASH_HMAC_SECRET;
    if (!secret) {
        return NextResponse.json(
            { error: "EASYKASH_HMAC_SECRET is not set — cannot sign a stub callback" },
            { status: 500 }
        );
    }

    const isCash = outcome === "cash";
    const payload: EasyKashCallback & Record<string, unknown> = {
        ProductCode: `STUB${customerReference}`,
        Amount: amount,
        ProductType: "Direct Pay",
        PaymentMethod: isCash
            ? "Cash Through Fawry"
            : outcome === "failed"
              ? "Credit & Debit Card"
              : "Credit & Debit Card",
        BuyerName: "Stub Buyer",
        BuyerEmail: "stub@example.test",
        BuyerMobile: "01000000000",
        // "cash" leaves the attempt pending with a voucher — the state a Fawry buyer sits in
        // until they walk to a shop, and the one the reconciler exists to resolve.
        status: outcome === "paid" ? "PAID" : outcome === "failed" ? "FAILED" : "NEW",
        voucher: isCash ? String(900000000000 + Number(customerReference || 0)) : "",
        easykashRef: `STUBREF${customerReference}`,
        VoucherData: "Direct Pay",
        customerReference,
    };
    payload.signatureHash = signCallback(payload, secret);

    const base = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const res = await fetch(`${base}/api/billing/easykash/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const callbackStatus = res.status;

    // Mirror the real provider's redirect back to the merchant, including the display-only params.
    const back = new URL(redirectUrl, base);
    back.searchParams.set("status", outcome === "paid" ? "success" : outcome === "failed" ? "failed" : "pending");
    back.searchParams.set("customerReference", customerReference);
    back.searchParams.set("providerRefNum", String(payload.easykashRef));
    if (isCash) back.searchParams.set("voucher", String(payload.voucher));
    back.searchParams.set("stubCallbackStatus", String(callbackStatus));

    return NextResponse.redirect(back.toString(), { status: 303 });
}
