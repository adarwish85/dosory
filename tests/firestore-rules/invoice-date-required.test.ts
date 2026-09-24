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
