/**
 * The callback ROUTE, end to end against the emulator.
 *
 * The verifier is unit-tested and the transaction is emulator-tested, but neither proves the
 * thing that actually faces the internet: the handler that stitches them together. This drives
 * the real exported POST with real Request objects, which is the only way to catch a route that
 * parses the body one way and hashes it another, or that returns 200 on a bad signature.
 *
 * Needs the emulator:  firebase emulators:exec --only firestore "npx jest"
 */
import * as admin from "firebase-admin";

const EMULATOR = process.env.FIRESTORE_EMULATOR_HOST;
const d = EMULATOR ? describe : describe.skip;

if (EMULATOR && !admin.apps.length) {
    admin.initializeApp({ projectId: "goalo-easykash-route" });
}

const SECRET = "test-hmac-secret-value";
process.env.EASYKASH_HMAC_SECRET = SECRET;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { signCallback } = require("@/lib/billing/easykash-core");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createAttempt, issueNumericRef } = require("@/lib/billing/easykash-service");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST } = require("@/app/api/billing/easykash/callback/route");

const db = admin.firestore();
const ORG = "org_cb";

const wipe = async () => {
    for (const c of ["billingAttempts", "platformBillingRecords", "subscriptions", "counters"]) {
        const snap = await db.collection(c).get();
        await Promise.all(snap.docs.map((doc) => doc.ref.delete()));
    }
};

const makeAttempt = async (amount = 500) => {
    const numericRef = await issueNumericRef();
    const id = await createAttempt({
        numericRef,
        orgId: ORG,
        planId: "plan_starter",
        planName: "Starter",
        billingCycle: "monthly",
        amount,
        currency: "EGP",
        status: "pending",
        provider: "easykash",
        purpose: "subscribe",
    });
    await db
        .collection("subscriptions")
        .doc(ORG)
        .set({
            tenantId: ORG,
            planId: "plan_starter",
            status: "trialing",
            billingCycle: "monthly",
            computedEntitlements: { limits: { maxUsers: 3 }, enabledModules: ["crm"] },
        });
    return { id, numericRef };
};

const payloadFor = (numericRef: number, over: Record<string, unknown> = {}) => {
    const p: Record<string, unknown> = {
        ProductCode: "EDVTEST",
        Amount: "500.00",
        ProductType: "Direct Pay",
        PaymentMethod: "Credit & Debit Card",
        BuyerName: "Test",
        BuyerEmail: "t@example.test",
        BuyerMobile: "01000000000",
        status: "PAID",
        voucher: "",
        easykashRef: `EK${numericRef}`,
        VoucherData: "Direct Pay",
        customerReference: String(numericRef),
        ...over,
    };
    p.signatureHash = signCallback(p, SECRET);
    return p;
};

const post = (body: unknown, contentType = "application/json") =>
    POST(
        new Request("https://app.test/api/billing/easykash/callback", {
            method: "POST",
            headers: { "content-type": contentType },
            body: typeof body === "string" ? body : JSON.stringify(body),
        }) as never
    );

d("POST /api/billing/easykash/callback", () => {
    beforeEach(wipe);
    afterAll(async () => {
        await wipe();
        await Promise.all(admin.apps.map((a) => a?.delete()));
    });

    test("a correctly signed PAID callback extends the subscription", async () => {
        const { numericRef } = await makeAttempt();
        const res = await post(payloadFor(numericRef));

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ received: true, applied: true });
        const sub = (await db.collection("subscriptions").doc(ORG).get()).data()!;
        expect(sub.status).toBe("active");
        expect(sub.computedEntitlements).toBeDefined(); // merged, not replaced
    });

    test("an UNSIGNED callback is rejected 403 and changes nothing", async () => {
        const { numericRef } = await makeAttempt();
        const p = payloadFor(numericRef);
        delete (p as Record<string, unknown>).signatureHash;

        const res = await post(p);
        expect(res.status).toBe(403);
        expect((await db.collection("platformBillingRecords").get()).size).toBe(0);
        expect((await db.collection("subscriptions").doc(ORG).get()).data()!.status).toBe("trialing");
    });

    test("a TAMPERED amount is rejected 403 before anything is read", async () => {
        const { numericRef } = await makeAttempt();
        const p = payloadFor(numericRef);
        p.Amount = "50000.00"; // signature now stale

        const res = await post(p);
        expect(res.status).toBe(403);
        expect((await db.collection("platformBillingRecords").get()).size).toBe(0);
    });

    test("a correctly signed callback for an amount we never asked for is REJECTED, not applied", async () => {
        // Signature valid, business rule violated: the attempt says 500, the callback says 5.
        const { numericRef, id } = await makeAttempt(500);
        const res = await post(payloadFor(numericRef, { Amount: "5.00" }));

        expect(res.status).toBe(200); // acknowledged, so the provider stops retrying
        expect(await res.json()).toMatchObject({ applied: false, reason: "amount-mismatch" });
        expect((await db.collection("platformBillingRecords").get()).size).toBe(0);
        expect((await db.collection("billingAttempts").doc(id).get()).data()!.status).toBe("failed");
        expect((await db.collection("subscriptions").doc(ORG).get()).data()!.status).toBe("trialing");
    });

    test("a reference we never issued is 404 — the wire cannot name a tenant", async () => {
        await makeAttempt();
        const res = await post(payloadFor(987654321));
        expect(res.status).toBe(404);
    });

    test("with NO secret configured, even a genuine callback is refused", async () => {
        const { numericRef } = await makeAttempt();
        const p = payloadFor(numericRef);
        const saved = process.env.EASYKASH_HMAC_SECRET;
        delete process.env.EASYKASH_HMAC_SECRET;
        try {
            const res = await post(p);
            expect(res.status).toBe(403); // fails closed, never "allow because unconfigured"
        } finally {
            process.env.EASYKASH_HMAC_SECRET = saved;
        }
    });

    test("a retried callback is acknowledged but applies once", async () => {
        const { numericRef } = await makeAttempt();
        const p = payloadFor(numericRef);
        const first = await post(p);
        const second = await post(p);

        expect([first.status, second.status]).toEqual([200, 200]);
        expect(await second.json()).toEqual({ received: true, applied: false });
        expect((await db.collection("platformBillingRecords").get()).size).toBe(1);
    });

    test("FORM-encoded callbacks verify too (their docs do not state a content type)", async () => {
        const { numericRef } = await makeAttempt();
        const p = payloadFor(numericRef);
        const form = new URLSearchParams(Object.entries(p).map(([k, v]) => [k, String(v)])).toString();

        const res = await post(form, "application/x-www-form-urlencoded");
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ received: true, applied: true });
    });

    test("a FAILED callback marks the attempt failed and extends nothing", async () => {
        const { numericRef, id } = await makeAttempt();
        const res = await post(payloadFor(numericRef, { status: "FAILED" }));

        expect(res.status).toBe(200);
        expect((await db.collection("billingAttempts").doc(id).get()).data()!.status).toBe("failed");
        expect((await db.collection("subscriptions").doc(ORG).get()).data()!.status).toBe("trialing");
    });

    test("an unrecognised status leaves the attempt PENDING for the reconciler", async () => {
        const { numericRef, id } = await makeAttempt();
        const res = await post(payloadFor(numericRef, { status: "SOMETHING_NEW" }));

        expect(res.status).toBe(200);
        expect((await db.collection("billingAttempts").doc(id).get()).data()!.status).toBe("pending");
    });
});
