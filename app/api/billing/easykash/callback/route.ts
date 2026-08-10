/**
 * POST /api/billing/easykash/callback  — PUBLIC, and the only thing standing between the open
 * internet and a free subscription is the signature. So it fails closed on every doubt.
 *
 * The order matters:
 *   1. verify the HMAC over the exact documented field order — 403 on mismatch, missing hash, or
 *      an unconfigured secret;
 *   2. resolve the attempt from OUR OWN `billingAttempts` by numericRef. Nothing org-shaped is
 *      ever read off the wire: the payload's buyer fields are decoration, and an `orgId` in a
 *      callback body would be an instruction from an untrusted source;
 *   3. check the amount (and currency) against the attempt, reject + log if they differ;
 *   4. apply exactly once, keyed on `easykashRef`.
 *
 * Always answer 200 once the signature is good and the payload is understood — a provider that
 * gets a 500 retries forever, and a retry storm on a money path is its own incident.
 */
import { NextRequest, NextResponse } from "next/server";
import { EasyKashCallback, mapProviderStatus, verifyCallbackSignature } from "@/lib/billing/easykash-core";
import { applyPaidPayment, findAttemptByNumericRef, markAttemptStatus } from "@/lib/billing/easykash-service";

export async function POST(request: NextRequest) {
    const payload = await readPayload(request);
    if (!payload) return NextResponse.json({ error: "Unreadable payload" }, { status: 400 });

    const secret = process.env.EASYKASH_HMAC_SECRET;
    if (!verifyCallbackSignature(payload, secret)) {
        // Deliberately terse to the caller, loud in our logs. Never echo the computed hash.
        console.error("[easykash] callback rejected: signature verification failed", {
            hasSecret: Boolean(secret),
            customerReference: payload.customerReference,
            easykashRef: payload.easykashRef,
        });
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const numericRef = Number(String(payload.customerReference ?? "").trim());
    if (!Number.isFinite(numericRef)) {
        console.error("[easykash] callback: customerReference is not one of ours", {
            customerReference: payload.customerReference,
        });
        return NextResponse.json({ error: "Unknown reference" }, { status: 404 });
    }

    const attemptDoc = await findAttemptByNumericRef(numericRef);
    if (!attemptDoc) {
        console.error("[easykash] callback: no billing attempt for reference", { numericRef });
        return NextResponse.json({ error: "Unknown reference" }, { status: 404 });
    }

    const status = mapProviderStatus(payload.status);
    const easykashRef = String(payload.easykashRef ?? "").trim();

    if (status === "paid") {
        if (!easykashRef) {
            console.error("[easykash] callback: PAID with no easykashRef — cannot deduplicate", { numericRef });
            return NextResponse.json({ error: "Missing easykashRef" }, { status: 400 });
        }

        const result = await applyPaidPayment({
            numericRef,
            easykashRef,
            reportedAmount: payload.Amount,
            paymentMethod: payload.PaymentMethod ? String(payload.PaymentMethod) : undefined,
            voucher: payload.voucher ? String(payload.voucher) : undefined,
            source: "callback",
        });

        if (result.outcome === "rejected") {
            // A signed callback whose amount does not match what we asked for is either a
            // provider-side change or an attack; either way it must not extend a subscription.
            console.error("[easykash] callback REJECTED after signature passed", {
                numericRef,
                easykashRef,
                reason: result.reason,
                reportedAmount: payload.Amount,
            });
            await markAttemptStatus(attemptDoc.ref, "failed", {
                failureReason: result.reason,
                lastCallbackAt: new Date(),
            });
            return NextResponse.json({ received: true, applied: false, reason: result.reason }, { status: 200 });
        }

        return NextResponse.json({ received: true, applied: result.outcome === "applied" }, { status: 200 });
    }

    if (status === "unknown") {
        // Do not guess a terminal state — record it and let the reconciler resolve it.
        console.warn("[easykash] callback carried an unrecognised status", { numericRef, status: payload.status });
        await markAttemptStatus(attemptDoc.ref, "pending", {
            providerStatus: String(payload.status ?? ""),
            lastCallbackAt: new Date(),
        });
        return NextResponse.json({ received: true, applied: false }, { status: 200 });
    }

    await markAttemptStatus(attemptDoc.ref, status, {
        providerStatus: String(payload.status ?? ""),
        easykashRef: easykashRef || null,
        lastCallbackAt: new Date(),
    });
    return NextResponse.json({ received: true, applied: false }, { status: 200 });
}

/**
 * The docs do not state the callback's content type, so accept JSON and form encoding both.
 * Values are kept as the RAW STRINGS they arrived as — re-formatting `Amount` (say "11.00" to
 * 11) changes the signature base and would reject every genuine callback.
 */
async function readPayload(request: NextRequest): Promise<EasyKashCallback | null> {
    const contentType = request.headers.get("content-type") || "";
    try {
        if (contentType.includes("application/json")) {
            return (await request.json()) as EasyKashCallback;
        }
        if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
            const form = await request.formData();
            const out: Record<string, unknown> = {};
            form.forEach((v, k) => {
                out[k] = typeof v === "string" ? v : undefined;
            });
            return out as EasyKashCallback;
        }
        // Unlabelled body: try JSON, then form.
        const text = await request.text();
        if (!text) return null;
        try {
            return JSON.parse(text) as EasyKashCallback;
        } catch {
            const out: Record<string, unknown> = {};
            new URLSearchParams(text).forEach((v, k) => {
                out[k] = v;
            });
            return Object.keys(out).length ? (out as EasyKashCallback) : null;
        }
    } catch {
        return null;
    }
}

/** Some providers probe the callback URL with a GET before enabling it. */
export async function GET() {
    return NextResponse.json({ ok: true, endpoint: "easykash-callback" }, { status: 200 });
}
