/**
 * STUB hosted-checkout page. Only exists when EASYKASH_MODE=stub.
 *
 * EasyKash publishes no sandbox, so without this nothing about the payment loop could be
 * exercised until real keys existed — and "we'll test it in production, with money" is not a
 * plan. This stands in for their hosted page: it shows what the buyer would see and lets the
 * tester drive the outcome (paid / failed / cash voucher), then hands off to
 * /api/billing/easykash/stub/simulate which posts a correctly-SIGNED callback to the real
 * callback route. Every downstream path is therefore the production path.
 */
import { NextRequest, NextResponse } from "next/server";
import { easykashMode } from "@/lib/billing/easykash-client";

export async function GET(request: NextRequest) {
    if (easykashMode() !== "stub") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const customerReference = request.nextUrl.searchParams.get("customerReference") || "";
    const amount = request.nextUrl.searchParams.get("amount") || "0.00";
    const redirectUrl = request.nextUrl.searchParams.get("redirectUrl") || "/dashboard";

    const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>EasyKash (stub)</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
 body{font:16px/1.5 system-ui,sans-serif;margin:0;display:grid;place-items:center;min-height:100vh;background:#f6f7f9;color:#111}
 .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;max-width:420px;width:92%}
 .tag{display:inline-block;background:#fef3c7;color:#92400e;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:600}
 h1{font-size:20px;margin:12px 0 4px} dl{margin:16px 0;display:grid;grid-template-columns:auto 1fr;gap:6px 16px;font-size:14px}
 dt{color:#6b7280} dd{margin:0;font-weight:600}
 button{width:100%;padding:11px;border-radius:8px;border:1px solid transparent;font-weight:600;cursor:pointer;margin-top:8px}
 .pay{background:#065f46;color:#fff} .cash{background:#1d4ed8;color:#fff} .fail{background:#fff;border-color:#d1d5db}
</style></head><body>
<div class="card">
  <span class="tag">STUB MODE — no real money</span>
  <h1>EasyKash hosted checkout</h1>
  <p style="color:#6b7280;font-size:14px;margin:4px 0 0">This page stands in for EasyKash while no sandbox exists. Each button posts a correctly signed callback to the real endpoint.</p>
  <dl>
    <dt>Reference</dt><dd>${esc(customerReference)}</dd>
    <dt>Amount</dt><dd>${esc(amount)}</dd>
  </dl>
  <form method="POST" action="/api/billing/easykash/stub/simulate">
    <input type="hidden" name="customerReference" value="${esc(customerReference)}">
    <input type="hidden" name="amount" value="${esc(amount)}">
    <input type="hidden" name="redirectUrl" value="${esc(redirectUrl)}">
    <button class="pay"  name="outcome" value="paid">Pay now (card)</button>
    <button class="cash" name="outcome" value="cash">Get a Fawry voucher (stays pending)</button>
    <button class="fail" name="outcome" value="failed">Fail the payment</button>
  </form>
</div></body></html>`;

    return new NextResponse(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}
