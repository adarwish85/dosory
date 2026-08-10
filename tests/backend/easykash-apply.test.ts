/**
 * The money transaction: `applyPaidPayment` against a real Firestore (emulator).
 *
 * These are the assertions that decide whether a tenant's subscription is extended, and the ones
 * a signature test cannot make: exactly-once under retries, refusal on a wrong amount, and —
 * learned the expensive way in this codebase — that extending a subscription MERGES rather than
 * replacing, because `computedEntitlements` is what every entitlement check reads.
 *
 * Needs the emulator:  firebase emulators:exec --only firestore "npx jest"
 */
import * as admin from "firebase-admin";

const EMULATOR = process.env.FIRESTORE_EMULATOR_HOST;
const d = EMULATOR ? describe : describe.skip;
if (!EMULATOR) {
    console.warn("SKIPPING easykash-apply: no FIRESTORE_EMULATOR_HOST. Run under `firebase emulators:exec`.");
}

// The service reads `@/lib/firebase-admin`, which demands a real service-account key. Against
// the emulator there are no credentials, so initialise the default app FIRST — the module's
// `if (!admin.apps.length)` guard then leaves it alone.
if (EMULATOR && !admin.apps.length) {
    admin.initializeApp({ projectId: "goalo-easykash-apply" });
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { applyPaidPayment, createAttempt, issueNumericRef } = require("@/lib/billing/easykash-service");

const db = admin.firestore();
const ORG = "org_ek";

const wipe = async () => {
    for (const c of ["billingAttempts", "platformBillingRecords", "subscriptions", "counters"]) {
        const snap = await db.collection(c).get();
        await Promise.all(snap.docs.map((doc) => doc.ref.delete()));
    }
};

const seedSubscription = async (over: Record<string, unknown> = {}) =>
    db
        .collection("subscriptions")
        .doc(ORG)
        .set({
            tenantId: ORG,
            planId: "plan_starter",
            planVersion: 1,
            status: "trialing",
            billingCycle: "monthly",
            addons: [],
            // The field the PayPal route destroys with a whole-document set().
            computedEntitlements: { limits: { maxUsers: 3, storageGB: 10 }, enabledModules: ["crm"] },
            ...over,
        });

const newAttempt = async (over: Record<string, unknown> = {}) => {
    const numericRef = await issueNumericRef();
    const id = await createAttempt({
        numericRef,
        orgId: ORG,
        planId: "plan_starter",
        planName: "Starter",
        billingCycle: "monthly",
        amount: 500,
        currency: "EGP",
        status: "pending",
        provider: "easykash",
        purpose: "subscribe",
        ...over,
    });
    return { id, numericRef };
};

d("applyPaidPayment", () => {
    beforeEach(wipe);
    afterAll(async () => {
        await wipe();
        await Promise.all(admin.apps.map((a) => a?.delete()));
    });

    test("issues collision-proof references: strictly increasing, never repeated", async () => {
        const sequential: number[] = [];
        for (let i = 0; i < 8; i++) sequential.push(await issueNumericRef());
        expect(sequential).toEqual([...sequential].sort((a, b) => a - b));
        expect(new Set(sequential).size).toBe(sequential.length);
        expect(Math.min(...sequential)).toBeGreaterThanOrEqual(100000);

        // CONCURRENT is the case that matters: two admins checking out at the same instant must
        // not receive the same reference, or the second callback credits the first tenant's
        // subscription. The counter is a transaction, so contenders retry rather than collide —
        // which also means one counter document serialises checkouts. At a few subscriptions a
        // day that is irrelevant; it would need sharding long before it became a bottleneck.
        const concurrent = await Promise.all(Array.from({ length: 5 }, () => issueNumericRef()));
        const all = [...sequential, ...concurrent];
        expect(new Set(all).size).toBe(all.length);
    }, 30000);

    test("extends the subscription, records the platform revenue, and marks the attempt paid", async () => {
        await seedSubscription();
        const { id, numericRef } = await newAttempt();

        const result = await applyPaidPayment({
            numericRef,
            easykashRef: "EKREF1",
            reportedAmount: "500.00",
            paymentMethod: "Credit & Debit Card",
            source: "callback",
        });
        expect(result.outcome).toBe("applied");

        const attempt = (await db.collection("billingAttempts").doc(id).get()).data()!;
        expect(attempt.status).toBe("paid");
        expect(attempt.easykashRef).toBe("EKREF1");

        const sub = (await db.collection("subscriptions").doc(ORG).get()).data()!;
        expect(sub.status).toBe("active");
        expect(sub.paymentProvider).toBe("easykash");
        expect(sub.currentPeriodEnd.toDate().getTime()).toBeGreaterThan(Date.now());

        const record = (await db.collection("platformBillingRecords").doc("EKREF1").get()).data()!;
        expect([record.orgId, record.amount, record.currency]).toEqual([ORG, 500, "EGP"]);
        expect(record.provider).toBe("easykash");
    });

    test("does NOT clobber computedEntitlements — the PayPal-route failure mode", () => {
        // app/api/paypal/capture-order writes the subscription with a whole-document .set(), so
        // it would erase computedEntitlements and strip the tenant of every module. This path
        // must merge.
        return (async () => {
            await seedSubscription();
            const { numericRef } = await newAttempt();
            await applyPaidPayment({ numericRef, easykashRef: "EKREF2", reportedAmount: 500, source: "callback" });

            const sub = (await db.collection("subscriptions").doc(ORG).get()).data()!;
            expect(sub.computedEntitlements).toEqual({
                limits: { maxUsers: 3, storageGB: 10 },
                enabledModules: ["crm"],
            });
            expect(sub.planVersion).toBe(1);
            expect(sub.addons).toEqual([]);
        })();
    });

    test("is idempotent on easykashRef — a retried callback cannot buy two periods", async () => {
        await seedSubscription();
        const { numericRef } = await newAttempt();

        const first = await applyPaidPayment({
            numericRef,
            easykashRef: "EKREF3",
            reportedAmount: 500,
            source: "callback",
        });
        const firstEnd = (await db.collection("subscriptions").doc(ORG).get())
            .data()!
            .currentPeriodEnd.toDate()
            .getTime();

        const second = await applyPaidPayment({
            numericRef,
            easykashRef: "EKREF3",
            reportedAmount: 500,
            source: "callback",
        });
        const secondEnd = (await db.collection("subscriptions").doc(ORG).get())
            .data()!
            .currentPeriodEnd.toDate()
            .getTime();

        expect([first.outcome, second.outcome]).toEqual(["applied", "duplicate"]);
        expect(secondEnd).toBe(firstEnd); // the period did NOT move a second time
        expect((await db.collection("platformBillingRecords").get()).size).toBe(1);
    });

    test("a callback and the reconciler racing the same payment still apply it once", async () => {
        await seedSubscription();
        const { numericRef } = await newAttempt();
        const results = await Promise.all([
            applyPaidPayment({ numericRef, easykashRef: "EKREF4", reportedAmount: 500, source: "callback" }),
            applyPaidPayment({ numericRef, easykashRef: "EKREF4", reportedAmount: 500, source: "reconciler" }),
        ]);
        expect(results.filter((r) => r.outcome === "applied")).toHaveLength(1);
        expect((await db.collection("platformBillingRecords").get()).size).toBe(1);
    });

    test("REJECTS an amount that does not match the attempt, and writes nothing", async () => {
        await seedSubscription();
        const { numericRef } = await newAttempt();

        const result = await applyPaidPayment({
            numericRef,
            easykashRef: "EKREF5",
            reportedAmount: "1.00",
            source: "callback",
        });

        expect(result).toEqual({ outcome: "rejected", reason: "amount-mismatch" });
        expect((await db.collection("platformBillingRecords").get()).size).toBe(0);
        const sub = (await db.collection("subscriptions").doc(ORG).get()).data()!;
        expect(sub.status).toBe("trialing"); // untouched
    });

    test("REJECTS a currency that does not match the attempt", async () => {
        await seedSubscription();
        const { numericRef } = await newAttempt();
        const result = await applyPaidPayment({
            numericRef,
            easykashRef: "EKREF6",
            reportedAmount: 500,
            reportedCurrency: "USD",
            source: "callback",
        });
        expect(result).toEqual({ outcome: "rejected", reason: "currency-mismatch" });
        expect((await db.collection("platformBillingRecords").get()).size).toBe(0);
    });

    test("a reference we never issued is rejected — the wire never names the tenant", async () => {
        await seedSubscription();
        const result = await applyPaidPayment({
            numericRef: 999999999,
            easykashRef: "EKREF7",
            reportedAmount: 500,
            source: "callback",
        });
        expect(result).toEqual({ outcome: "rejected", reason: "no-attempt" });
    });

    test("renewing early keeps the unused days; renewing late starts from now", async () => {
        const future = new Date(Date.now() + 10 * 86400000);
        await seedSubscription({ currentPeriodEnd: admin.firestore.Timestamp.fromDate(future), status: "active" });
        const a = await newAttempt({ purpose: "renewal" });
        await applyPaidPayment({
            numericRef: a.numericRef,
            easykashRef: "EKREF8",
            reportedAmount: 500,
            source: "callback",
        });

        const end = (await db.collection("subscriptions").doc(ORG).get()).data()!.currentPeriodEnd.toDate();
        // one month ON TOP of the 10 days remaining, not one month from today
        expect(end.getTime()).toBeGreaterThan(Date.now() + 35 * 86400000);

        await wipe();
        const past = new Date(Date.now() - 30 * 86400000);
        await seedSubscription({ currentPeriodEnd: admin.firestore.Timestamp.fromDate(past), status: "past_due" });
        const b = await newAttempt({ purpose: "renewal" });
        await applyPaidPayment({
            numericRef: b.numericRef,
            easykashRef: "EKREF9",
            reportedAmount: 500,
            source: "callback",
        });

        const end2 = (await db.collection("subscriptions").doc(ORG).get()).data()!.currentPeriodEnd.toDate();
        expect(end2.getTime()).toBeGreaterThan(Date.now() + 25 * 86400000);
        expect(end2.getTime()).toBeLessThan(Date.now() + 35 * 86400000);
    });

    test("a paid renewal clears the grace bookkeeping from the previous lapse", async () => {
        await seedSubscription({
            status: "past_due",
            graceUntil: admin.firestore.Timestamp.fromDate(new Date()),
            renewalAttemptId: "old_attempt",
        });
        const { numericRef } = await newAttempt({ purpose: "renewal" });
        await applyPaidPayment({ numericRef, easykashRef: "EKREF10", reportedAmount: 500, source: "callback" });

        const sub = (await db.collection("subscriptions").doc(ORG).get()).data()!;
        expect(sub.status).toBe("active");
        expect("graceUntil" in sub).toBe(false);
        expect("renewalAttemptId" in sub).toBe(false);
    });
});
