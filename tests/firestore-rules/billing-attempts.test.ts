/**
 * PLATFORM BILLING — server-write-only, own-org read.
 *
 * THE SECURITY BAR, and the mechanism from standing lesson 5: this file's generic
 * `match /{collection}/{docId}` catch-all grants create/write to any authenticated user whose
 * token orgId matches the document's orgId. Firestore grants when ANY matching rule allows, so a
 * standalone `match /billingAttempts/{id} { allow write: if false; }` block is a NO-OP — the
 * catch-all still lets a tenant create its own billing attempt and mark it `paid`, which extends
 * a subscription for free.
 *
 * The FAIL-THEN-PASS pair below pins both halves:
 *   - "the catch-all would have allowed this" reproduces the pre-fix grant path against a
 *     control collection that IS still covered by the catch-all, proving the mechanism is real
 *     and that this suite would have caught the hole;
 *   - the billingAttempts assertions prove the exclusion actually denies.
 * Remove `billingAttempts` from isServerManagedCollection() and the second group fails while the
 * first still passes — which is exactly the asymmetry that made support_tickets take three runs.
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
    RulesTestEnvironment,
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

const PROJECT_ID = "goalo-rules-billing";
const ORG_A = "org_alpha";
const ORG_B = "org_beta";

let env: RulesTestEnvironment;

const asOrg = (orgId: string, uid = `${orgId}_user`) => env.authenticatedContext(uid, { orgId }).firestore();

beforeAll(async () => {
    env = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
            rules: readFileSync(join(__dirname, "..", "..", "firestore.rules"), "utf8"),
            host: "127.0.0.1",
            port: 8080,
        },
    });
});

afterAll(async () => {
    await env?.cleanup();
});

beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, "billingAttempts", "attempt_a"), {
            orgId: ORG_A,
            numericRef: 100001,
            planId: "plan_starter",
            amount: 500,
            currency: "EGP",
            status: "pending",
        });
        await setDoc(doc(db, "platformBillingRecords", "ref_a"), {
            orgId: ORG_A,
            amount: 500,
            currency: "EGP",
        });
        await setDoc(doc(db, "counters", "easykashRef"), { currentNumber: 100001 });
        // CONTROL. Deliberately an invented collection name with NO dedicated rule block, so the
        // only thing that can grant it is the catch-all itself. `customers` was used here first
        // and proved nothing — it has its own block (firestore.rules), so the control passed
        // whether or not the catch-all existed. The panel caught that; this is the fix.
        await setDoc(doc(db, "zz_catchall_probe", "probe_a"), { orgId: ORG_A, name: "probe" });
    });
});

describe("the catch-all grant path is real (control — this is what had to be excluded)", () => {
    test("an org member CAN write a doc in a collection with no rule of its own", async () => {
        // Exactly the grant that would apply to billingAttempts without the exclusion. If the
        // catch-all ever stops granting, THIS goes red — which is what makes the denials below
        // meaningful rather than vacuous.
        await assertSucceeds(updateDoc(doc(asOrg(ORG_A), "zz_catchall_probe", "probe_a"), { name: "probe2" }));
    });

    test("an org member CAN create one", async () => {
        await assertSucceeds(
            setDoc(doc(asOrg(ORG_A), "zz_catchall_probe", "probe_new"), { orgId: ORG_A, name: "New" })
        );
    });
});

describe("billingAttempts — reads scoped to the owning org", () => {
    test("an org member reads its own attempt", async () => {
        await assertSucceeds(getDoc(doc(asOrg(ORG_A), "billingAttempts", "attempt_a")));
    });

    test("another tenant cannot read it", async () => {
        await assertFails(getDoc(doc(asOrg(ORG_B), "billingAttempts", "attempt_a")));
    });

    test("an unauthenticated caller cannot read it", async () => {
        await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "billingAttempts", "attempt_a")));
    });
});

describe("billingAttempts — NO client may write, not even its own org", () => {
    test("cannot mark its own attempt paid (the free-subscription attack)", async () => {
        await assertFails(updateDoc(doc(asOrg(ORG_A), "billingAttempts", "attempt_a"), { status: "paid" }));
    });

    test("cannot create an attempt, even a correctly org-stamped one", async () => {
        await assertFails(
            setDoc(doc(asOrg(ORG_A), "billingAttempts", "forged"), {
                orgId: ORG_A,
                numericRef: 999999,
                amount: 1,
                currency: "EGP",
                status: "paid",
            })
        );
    });

    test("cannot raise the amount, or delete the evidence", async () => {
        await assertFails(updateDoc(doc(asOrg(ORG_A), "billingAttempts", "attempt_a"), { amount: 1 }));
        await assertFails(deleteDoc(doc(asOrg(ORG_A), "billingAttempts", "attempt_a")));
    });
});

describe("platformBillingRecords — the platform revenue trail", () => {
    test("the owning org can read its own records", async () => {
        await assertSucceeds(getDoc(doc(asOrg(ORG_A), "platformBillingRecords", "ref_a")));
    });

    test("another tenant cannot read them", async () => {
        await assertFails(getDoc(doc(asOrg(ORG_B), "platformBillingRecords", "ref_a")));
    });

    test("nobody may forge a payment record", async () => {
        await assertFails(
            setDoc(doc(asOrg(ORG_A), "platformBillingRecords", "forged"), { orgId: ORG_A, amount: 1, currency: "EGP" })
        );
        await assertFails(updateDoc(doc(asOrg(ORG_A), "platformBillingRecords", "ref_a"), { amount: 0 }));
    });
});

describe("counters — admin SDK only", () => {
    test("no client may read or rewind the reference counter", async () => {
        // Rewinding it would mint a duplicate customerReference, and the next callback would
        // credit the wrong tenant's subscription.
        await assertFails(getDoc(doc(asOrg(ORG_A), "counters", "easykashRef")));
        await assertFails(setDoc(doc(asOrg(ORG_A), "counters", "easykashRef"), { currentNumber: 1 }));
    });
});

describe("platform catalog — a tenant cannot invent a plan and price its own subscription", () => {
    test("an org admin cannot create a plans document", async () => {
        // THE ATTACK, reproduced in the emulator before the exclusion existed: create
        // plans/pwn with your own orgId, status "published" and monthlyPrice 1, then buy it
        // through /api/billing/easykash/create-checkout for one cent. The catch-all's
        // `allow create` was satisfied because the forged doc carried the caller's own orgId.
        await assertFails(
            setDoc(doc(asOrg(ORG_A), "plans", "pwn_pro"), {
                orgId: ORG_A,
                id: "pwn_pro",
                name: "Pwn",
                status: "published",
                currency: "EGP",
                billing: { monthlyPrice: 1 },
                versioning: { version: 1 },
                limits: { maxUsers: -1 },
                entitlements: { modules: ["crm", "sales", "hr", "finance"] },
            })
        );
    });

    test("nor edit a real one, nor touch addons", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "plans", "plan_starter"), {
                id: "plan_starter",
                status: "published",
                billing: { monthlyPrice: 4900 },
            });
        });
        await assertFails(updateDoc(doc(asOrg(ORG_A), "plans", "plan_starter"), { billing: { monthlyPrice: 1 } }));
        await assertFails(setDoc(doc(asOrg(ORG_A), "addons", "pwn_addon"), { orgId: ORG_A, name: "Pwn" }));
    });

    test("but any signed-in tenant may READ the catalog — the billing page lists plans", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "plans", "plan_starter"), { id: "plan_starter", status: "published" });
        });
        await assertSucceeds(getDoc(doc(asOrg(ORG_B), "plans", "plan_starter")));
    });
});
