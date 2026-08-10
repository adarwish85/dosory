/**
 * POST /api/billing/easykash/create-checkout
 *
 * Starts a platform-subscription payment. Org admins only; the org is taken from the verified
 * token, NEVER from the request body — a caller who could name their own orgId could buy a
 * subscription for someone else's tenant, or point someone else's payment at their own.
 */
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUser } from "@/lib/auth/getAuthenticatedUser";
import { BillingCycleLike, resolvePlanPrice } from "@/lib/billing/easykash-core";
import { createPayment, easykashConfigured, easykashMode } from "@/lib/billing/easykash-client";
import { createAttempt, issueNumericRef } from "@/lib/billing/easykash-service";

export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthenticatedUser(request);
        if (!auth.isAuthenticated || !auth.userId) {
            return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
        }
        const orgId = auth.orgId;
        if (!orgId) {
            return NextResponse.json({ error: "No organization on this account" }, { status: 403 });
        }

        // Org-admin gate. The staff document is keyed by LOWERCASED EMAIL and carries `authUid`
        // (CLAUDE.md staff invariant) — never keyed by uid, so look it up both ways.
        if (!(await isOrgAdmin(orgId, auth.userId, auth.email))) {
            return NextResponse.json({ error: "Only an organization admin can start a payment" }, { status: 403 });
        }

        const body = (await request.json().catch(() => ({}))) as {
            planId?: string;
            billingCycle?: string;
            mobile?: string;
        };
        const planId = String(body.planId || "");
        const billingCycle: BillingCycleLike = body.billingCycle === "annual" ? "annual" : "monthly";
        if (!planId) return NextResponse.json({ error: "planId is required" }, { status: 400 });

        if (!easykashConfigured()) {
            return NextResponse.json({ error: "EasyKash is not configured on this environment" }, { status: 503 });
        }

        const planSnap = await adminDb.collection("plans").doc(planId).get();
        if (!planSnap.exists) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        const plan = planSnap.data() as Record<string, unknown>;
        if (plan.status !== "published") {
            return NextResponse.json({ error: "Plan is not published" }, { status: 400 });
        }

        // Fails closed when the plan carries no price/currency, which is the state BOTH published
        // plans are in today. Charging a default would give a paid plan away for nothing.
        const price = resolvePlanPrice(plan, billingCycle);
        if (!price.ok) {
            return NextResponse.json(
                {
                    error:
                        price.reason === "free-plan"
                            ? "This plan is free — no payment is needed."
                            : "This plan has no price configured for that billing cycle. Ask support to set it before paying.",
                    reason: price.reason,
                },
                { status: 409 }
            );
        }

        // Buyer identity: EasyKash requires name, email AND mobile. Mobile is the one we may not
        // hold, so the UI asks for it and passes it here; we persist it back to the profile so a
        // renewal never has to ask again.
        const buyer = await resolveBuyer(auth.userId, auth.email, body.mobile);
        if (!buyer.mobile) {
            return NextResponse.json(
                { error: "A mobile number is required by the payment provider.", reason: "mobile-required" },
                { status: 422 }
            );
        }

        const numericRef = await issueNumericRef();
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
        const redirectUrl = `${appUrl}/dashboard/billing/easykash/return`;

        const payment = await createPayment({
            amount: price.amount,
            currency: price.currency,
            name: buyer.name,
            email: buyer.email,
            mobile: buyer.mobile,
            redirectUrl,
            customerReference: numericRef,
            cashExpiry: 24,
        });

        if (!payment.ok) {
            console.error("[easykash] pay API failed", { orgId, numericRef, error: payment.error });
            return NextResponse.json({ error: "Could not start the payment. Please try again." }, { status: 502 });
        }

        const attemptId = await createAttempt({
            numericRef,
            orgId,
            planId,
            planName: typeof plan.name === "string" ? plan.name : undefined,
            billingCycle,
            amount: price.amount,
            currency: price.currency,
            status: "pending",
            provider: "easykash",
            purpose: "subscribe",
            productCode: payment.productCode,
            checkoutUrl: payment.redirectUrl,
            createdBy: auth.userId,
        });

        return NextResponse.json({
            attemptId,
            numericRef,
            redirectUrl: payment.redirectUrl,
            amount: price.amount,
            currency: price.currency,
            mode: easykashMode(),
        });
    } catch (error) {
        console.error("[easykash] create-checkout failed", error);
        return NextResponse.json({ error: "Could not start the payment." }, { status: 500 });
    }
}

async function isOrgAdmin(orgId: string, uid: string, email?: string): Promise<boolean> {
    const staff = adminDb.collection("staff");
    const byUid = await staff.where("orgId", "==", orgId).where("authUid", "==", uid).limit(1).get();
    const doc = !byUid.empty
        ? byUid.docs[0]
        : email
          ? await staff
                .doc(email.toLowerCase())
                .get()
                .then((d) => (d.exists && d.data()?.orgId === orgId ? d : null))
          : null;
    if (!doc) return false;
    return doc.data()?.isAdmin === true;
}

async function resolveBuyer(
    uid: string,
    email: string | undefined,
    mobileFromForm?: string
): Promise<{ name: string; email: string; mobile: string }> {
    const userSnap = await adminDb.collection("users").doc(uid).get();
    const user = userSnap.exists ? (userSnap.data() as Record<string, unknown>) : {};
    const mobile = String(mobileFromForm || user.phone || user.mobile || "").trim();

    if (mobileFromForm && mobileFromForm !== user.phone) {
        // Remember it so a renewal does not have to ask again. Best-effort: never block a payment
        // because a profile write failed.
        await adminDb
            .collection("users")
            .doc(uid)
            .set({ phone: mobileFromForm }, { merge: true })
            .catch((e) => console.warn("[easykash] could not persist buyer mobile", e));
    }

    const name =
        [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
        String(user.displayName || user.name || "").trim() ||
        (email ? email.split("@")[0] : "Customer");

    return { name, email: String(user.email || email || ""), mobile };
}
