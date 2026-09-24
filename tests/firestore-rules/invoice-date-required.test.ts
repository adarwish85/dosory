/**
 * An invoice cannot be created without a `date` timestamp.
 *
 * WHY THIS IS A RULE AND NOT JUST A BUILDER CHECK. The invoices list orders by `date`, and
 * Firestore silently omits any document that lacks the field named in `orderBy()` — no error, no
 * warning. A document written without it is COUNTED by the summary (an aggregation has no
 * orderBy) and never LISTED. That is the "summary reads 2, list renders 1" defect verified on
 * prod tenant qatestdosory, whose onboarding-written invoice eixKmrrn3RnEFp3JeWrZ has no `date`
 * at all. The same shape also makes the document unpayable and unfinalizable.
 *
 * lib/invoices/build-invoice-document.ts throws on a missing date, and a contract test requires
 * every writer to go through it — but both live in the client bundle, and rules are the only
 * layer a future writer cannot route around. This is the backstop.
 *
 * It also rejects an ISO STRING date, which is what the onboarding writer stored for `dueDate`:
 * a string is not orderable the way the list expects, so accepting it would recreate the defect
 * in a form that merely looks correct.
 *
 * Needs the emulator:  firebase emulators:exec --only firestore "npx jest"
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { addDoc, collection, Timestamp } from "firebase/firestore";

const ORG = "org-invoice-date";
const UID = "user-invoice-date";
const CLAIMS = { orgId: ORG, role: "admin" };

let env: RulesTestEnvironment;

beforeAll(async () => {
    env = await initializeTestEnvironment({
        projectId: "demo-invoice-date-required",
        firestore: { rules: readFileSync(join(__dirname, "..", "..", "firestore.rules"), "utf8") },
    });
});
afterEach(async () => env?.clearFirestore());
afterAll(async () => env?.cleanup());

const invoicesFor = (uid = UID, claims = CLAIMS) =>
    collection(env.authenticatedContext(uid, claims).firestore(), "invoices");

/** The canonical shape buildInvoiceDocument produces, minus whatever a test removes. */
const validInvoice = () => ({
    orgId: ORG,
    createdBy: UID,
    number: 1,
    numberFormatted: "INV-000001",
    customerId: "cust1",
    customerName: "Acme",
    items: [{ id: "1", description: "x", quantity: 1, rate: 100, amount: 100, taxRate: 14 }],
    subtotal: 100,
    discountTotal: 0,
    adjustment: 0,
    taxTotal: 14,
    total: 114,
    amountPaid: 0,
    amountDue: 114,
    status: "draft",
    date: Timestamp.fromDate(new Date("2026-09-24T00:00:00Z")),
    dueDate: Timestamp.fromDate(new Date("2026-10-24T00:00:00Z")),
    currency: "EGP",
});

describe("invoice create requires a date timestamp", () => {
    test("a well-formed invoice is still allowed — the rule must not break normal creation", async () => {
        await assertSucceeds(addDoc(invoicesFor(), validInvoice()));
    });

    test("an invoice with NO date is REJECTED", async () => {
        const { date: _date, ...withoutDate } = validInvoice();
        await assertFails(addDoc(invoicesFor(), withoutDate));
    });

    test("an ISO STRING date is REJECTED — it is not orderable the way the list expects", async () => {
        await assertFails(addDoc(invoicesFor(), { ...validInvoice(), date: "2026-09-24T00:00:00Z" }));
    });

    test("a numeric epoch date is REJECTED for the same reason", async () => {
        await assertFails(addDoc(invoicesFor(), { ...validInvoice(), date: 1790000000000 }));
    });

    test("a null date is REJECTED", async () => {
        await assertFails(addDoc(invoicesFor(), { ...validInvoice(), date: null }));
    });

    test("tenant isolation still holds — the date rule must not have widened anything", async () => {
        await assertFails(addDoc(invoicesFor(), { ...validInvoice(), orgId: "some-other-org" }));
    });
});

/**
 * THE EXCLUSION AUDIT.
 *
 * Excluding `invoices` from the generic `match /{collection}/{docId}` means its own block is now
 * the ONLY rule governing the collection — for every operation, not just create. Two risks follow
 * and both are proven here rather than argued:
 *
 *   1. An operation left UNSTATED on an excluded collection is a deny, which silently breaks a
 *      live feature. All four are asserted below as ALLOWED for a same-tenant member.
 *   2. The mirror risk: the dedicated block ending up BROADER than the catch-all was. Each
 *      cross-tenant and unauthenticated case is asserted as DENIED.
 *
 * The one deliberate difference from the catch-all is super-admin access, which the dedicated
 * block has always granted and the catch-all never did (an SA's token orgId does not match a
 * tenant's). That predates this change; it is asserted here so it is recorded rather than assumed.
 */
describe("exclusion audit: the /invoices block alone governs all four operations", () => {
    const seed = async (docId: string, orgId: string) =>
        env.withSecurityRulesDisabled(async (ctx) => {
            await ctx
                .firestore()
                .collection("invoices")
                .doc(docId)
                .set({ ...validInvoice(), orgId });
        });

    const asOrg = (uid: string, orgId: string) => env.authenticatedContext(uid, { orgId }).firestore();
    const OTHER = "org-other";

    test("ALLOWED — same-tenant member can READ", async () => {
        await seed("d1", ORG);
        await assertSucceeds(asOrg(UID, ORG).collection("invoices").doc("d1").get());
    });

    test("ALLOWED — same-tenant member can UPDATE", async () => {
        await seed("d2", ORG);
        await assertSucceeds(asOrg(UID, ORG).collection("invoices").doc("d2").update({ notes: "x" }));
    });

    test("ALLOWED — same-tenant member can DELETE", async () => {
        await seed("d3", ORG);
        await assertSucceeds(asOrg(UID, ORG).collection("invoices").doc("d3").delete());
    });

    test("ALLOWED — same-tenant member can CREATE (with a date)", async () => {
        await assertSucceeds(addDoc(invoicesFor(), validInvoice()));
    });

    test("DENIED — other tenant cannot READ", async () => {
        await seed("d4", ORG);
        await assertFails(asOrg("intruder", OTHER).collection("invoices").doc("d4").get());
    });

    test("DENIED — other tenant cannot UPDATE", async () => {
        await seed("d5", ORG);
        await assertFails(asOrg("intruder", OTHER).collection("invoices").doc("d5").update({ notes: "x" }));
    });

    test("DENIED — other tenant cannot DELETE", async () => {
        await seed("d6", ORG);
        await assertFails(asOrg("intruder", OTHER).collection("invoices").doc("d6").delete());
    });

    test("DENIED — other tenant cannot CREATE into this org", async () => {
        await assertFails(asOrg("intruder", OTHER).collection("invoices").doc("spoof").set(validInvoice()));
    });

    test("DENIED — unauthenticated cannot READ or WRITE", async () => {
        await seed("d7", ORG);
        const anon = env.unauthenticatedContext().firestore();
        await assertFails(anon.collection("invoices").doc("d7").get());
        await assertFails(anon.collection("invoices").doc("d8").set(validInvoice()));
    });

    test("DENIED — a token with NO orgId cannot reach a document with no orgId", async () => {
        // The catch-all required `resource.data.orgId != null` explicitly; the dedicated block
        // compares claim to field. This pins that null == null does not become a backdoor.
        await env.withSecurityRulesDisabled(async (ctx) => {
            await ctx.firestore().collection("invoices").doc("orphan").set({ total: 1 });
        });
        const noClaim = env.authenticatedContext("noclaim", {}).firestore();
        await assertFails(noClaim.collection("invoices").doc("orphan").get());
    });

    test("ALLOWED, and deliberate — super admin reads across tenants", async () => {
        await seed("d9", ORG);
        const saDb = env.authenticatedContext("sa", { isSuperAdmin: true }).firestore();
        await assertSucceeds(saDb.collection("invoices").doc("d9").get());
    });
});
