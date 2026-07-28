/**
 * F1 — provisioning convergence (emulator).
 *
 * Reproduces the 2026-07-28 smoke incident: signup's provision call dies mid-flight and the
 * tenant is left half-provisioned. The fix contract is that /api/tenants/provision (→
 * provisionTenant) is IDEMPOTENT and CONVERGENT: calling it again from ANY partial state
 * yields a fully provisioned tenant with no duplicate side effects — which is exactly what
 * the dashboard's login-time guard (useEnsureProvisioned) relies on.
 *
 * Run against the Firestore emulator (skipped otherwise):
 *   firebase emulators:exec --only firestore --project demo-provision-convergence \
 *     "npx jest tests/unit/provisioning-convergence.test.ts"
 */
import { generateKeyPairSync } from "node:crypto";

// The lib/firebase-admin singleton demands a structurally valid service-account key even
// under the emulator. Provide a throwaway one (real RSA key generated in-process — nothing
// secret, never leaves the test) BEFORE the module is imported.
const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
});
process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({
    type: "service_account",
    project_id: "demo-provision-convergence",
    private_key_id: "test",
    private_key: privateKey,
    client_email: "test@demo-provision-convergence.iam.gserviceaccount.com",
    client_id: "0",
});
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "demo-provision-convergence";

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
const d = emulator ? describe : describe.skip;

d("provisionTenant convergence (F1)", () => {
    const ORG = "conv-test-org";
    const UID = "conv-test-uid";
    // Deferred imports so the env vars above are set before the admin singleton initializes.
    let adminDb: FirebaseFirestore.Firestore;
    let provisionTenant: (orgId: string, createdBy: string) => Promise<void>;

    const SEEDED = ["currencies", "taxes", "paymentModes", "emailTemplates"] as const;

    const orgDocs = async (coll: string) => (await adminDb.collection(coll).where("orgId", "==", ORG).get()).docs;

    const snapshotState = async () => {
        const state: Record<string, number> = {};
        for (const c of SEEDED) state[c] = (await orgDocs(c)).length;
        state.subscription = (await adminDb.collection("subscriptions").doc(ORG).get()).exists ? 1 : 0;
        return state;
    };

    const wipe = async () => {
        for (const c of SEEDED) {
            for (const doc of await orgDocs(c)) await doc.ref.delete();
        }
        await adminDb.collection("subscriptions").doc(ORG).delete();
        await adminDb.doc(`organizations/${ORG}/settings/general`).delete();
    };

    const assertFullyProvisioned = async () => {
        const sub = await adminDb.collection("subscriptions").doc(ORG).get();
        expect(sub.exists).toBe(true);
        expect(sub.data()!.status).toBe("trialing");
        expect(sub.data()!.tenantId).toBe(ORG);
        expect((await orgDocs("currencies")).length).toBe(1);
        expect((await orgDocs("taxes")).length).toBe(1);
        expect((await orgDocs("paymentModes")).length).toBe(2);
        expect((await orgDocs("emailTemplates")).length).toBe(2);
        const settings = await adminDb.doc(`organizations/${ORG}/settings/general`).get();
        expect(settings.exists).toBe(true);
        expect(settings.data()!.currency).toBe("USD");
    };

    beforeAll(async () => {
        ({ adminDb } = await import("@/lib/firebase-admin"));
        ({ provisionTenant } = await import("@/lib/provisioning/seed-tenant-defaults"));
    });

    beforeEach(wipe);

    test("stranded tenant (nothing provisioned) converges in one call", async () => {
        // Signup's stranded state: org + claims exist, provision never landed. From the
        // provisioning module's perspective that is simply "no docs yet".
        await provisionTenant(ORG, UID);
        await assertFullyProvisioned();
    });

    test("killed after subscription, before defaults → converges", async () => {
        // Simulate the process dying between seedSubscription and seedDefaults.
        await adminDb.collection("subscriptions").doc(ORG).set({
            tenantId: ORG,
            status: "trialing",
            planId: "plan_trial",
            createdBy: UID,
        });
        await provisionTenant(ORG, UID);
        await assertFullyProvisioned();
    });

    test("killed after some defaults, before subscription → converges", async () => {
        // Inverse partial state: one seeded collection exists, no subscription doc.
        await adminDb.collection("currencies").add({ orgId: ORG, code: "USD", name: "US Dollar", isDefault: true });
        await provisionTenant(ORG, UID);
        const sub = await adminDb.collection("subscriptions").doc(ORG).get();
        expect(sub.exists).toBe(true);
        // currencies had a doc → seedIfEmpty must NOT double-seed it.
        expect((await orgDocs("currencies")).length).toBe(1);
        expect((await orgDocs("paymentModes")).length).toBe(2);
    });

    test("second call is a no-op (idempotent — zero duplicate side effects)", async () => {
        await provisionTenant(ORG, UID);
        const before = await snapshotState();
        const subBefore = (await adminDb.collection("subscriptions").doc(ORG).get()).data();

        await provisionTenant(ORG, UID); // the login-time guard's re-invocation

        const after = await snapshotState();
        expect(after).toEqual(before); // no duplicated seeds anywhere
        const subAfter = (await adminDb.collection("subscriptions").doc(ORG).get()).data();
        // subscription untouched (same createdAt — not rewritten)
        expect(subAfter!.createdAt).toEqual(subBefore!.createdAt);
        await assertFullyProvisioned();
    });

    test("CONCURRENT calls converge without duplicate seeds (R1)", async () => {
        // The real-world race: signup's retry overlapping a still-running handler, or two
        // dashboard tabs healing at once. Deterministic org-scoped seed doc IDs make the
        // writers converge on the same docs; auto-IDs would duplicate here.
        await Promise.all([provisionTenant(ORG, UID), provisionTenant(ORG, UID), provisionTenant(ORG, UID)]);
        await assertFullyProvisioned(); // exact counts: 1 currency, 1 tax, 2 modes, 2 templates
    });

    test("does not leak into another org's namespace", async () => {
        const OTHER = "conv-other-org";
        await adminDb.collection("currencies").add({ orgId: OTHER, code: "EUR", name: "Euro" });
        await provisionTenant(ORG, UID);
        const other = await adminDb.collection("currencies").where("orgId", "==", OTHER).get();
        expect(other.size).toBe(1); // untouched
        for (const doc of other.docs) await doc.ref.delete();
    });
});
