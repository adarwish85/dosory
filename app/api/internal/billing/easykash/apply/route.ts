/**
 * POST /api/internal/billing/easykash/apply — internal only, shared-secret gated.
 *
 * WHY THIS EXISTS. The reconciler (a Cloud Function) sometimes learns that a payment succeeded
 * that no callback ever delivered. Applying it there would mean a SECOND implementation of the
 * "extend the subscription and write the platform record" transaction, in a different package
 * with a different admin SDK major — and two implementations of a money transaction is precisely
 * how a fix lands on the copy nobody calls (CLAUDE.md: calculateInvoiceTotals, the ticket saga).
 * So there is one writer, `applyPaidPayment`, and the reconciler calls it through this route.
 *
 * Gate: the same `x-internal-admin-secret` pattern as /api/internal/usage/recompute. Fails
 * closed — a missing or wrong secret, or an unconfigured INTERNAL_ADMIN_SECRET, all 403.
 */
import { NextRequest, NextResponse } from "next/server";
import { applyPaidPayment } from "@/lib/billing/easykash-service";

export async function POST(request: NextRequest) {
    const secret = request.headers.get("x-internal-admin-secret");
    const expected = process.env.INTERNAL_ADMIN_SECRET;
    if (!expected || secret !== expected) {
        return NextResponse.json({ error: "Forbidden: invalid or missing internal secret" }, { status: 403 });
    }

    try {
        const body = (await request.json()) as {
            numericRef?: number | string;
            easykashRef?: string;
            amount?: unknown;
            paymentMethod?: string;
            voucher?: string;
        };

        const numericRef = Number(String(body.numericRef ?? "").trim());
        const easykashRef = String(body.easykashRef || "").trim();
        if (!Number.isFinite(numericRef) || !easykashRef) {
            return NextResponse.json({ error: "numericRef and easykashRef are required" }, { status: 400 });
        }

        const result = await applyPaidPayment({
            numericRef,
            easykashRef,
            reportedAmount: body.amount,
            paymentMethod: body.paymentMethod,
            voucher: body.voucher,
            source: "reconciler",
        });

        if (result.outcome === "rejected") {
            console.error("[easykash] reconciler apply rejected", { numericRef, easykashRef, reason: result.reason });
            return NextResponse.json({ applied: false, reason: result.reason }, { status: 409 });
        }
        return NextResponse.json({ applied: result.outcome === "applied", outcome: result.outcome });
    } catch (error) {
        console.error("[easykash] internal apply failed", error);
        return NextResponse.json({ error: "apply failed" }, { status: 500 });
    }
}
