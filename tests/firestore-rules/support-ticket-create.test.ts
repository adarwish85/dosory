/**
 * SMOKING GUN for the long-standing ticket-create failure.
 *
 * Symptom: "Failed to create ticket: permission-denied" for every user, in every tenant —
 * `tickets` had never received a single app-written doc.
 *
 * The denial is NOT on the ticket write. `TicketService.createTicket` first calls
 * `SupportSettingsService.getSettings(tenantId)` → `getDoc(settings/{tenantId}_support)`.
 * That doc does not exist for ANY tenant (the root `settings` collection is empty in prod),
 * and the rule reads `resource.data.orgId` — on a missing doc `resource` is null, the
 * expression errors, and the READ is denied. The error propagates out of createTicket before
 * addDoc runs, so it surfaces as a ticket-create failure.
 *
 * (The barrel `@/lib/hooks` resolves `useSupportTickets` to lib/hooks/use-tickets.ts →
 * TicketService → the `tickets` collection keyed by `tenantId` — NOT lib/hooks/use-support.ts
 * → `support_tickets`. That shadowing is why the earlier investigation read the wrong file.)
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

const ORG = "qasmoke20260728131942";
const UID = "mdp62bAtwMg2z7GEjYXjXQunNEB2";
const CLAIMS = { orgId: ORG, role: "admin" };

let env: RulesTestEnvironment;

beforeAll(async () => {
    env = await initializeTestEnvironment({
        projectId: "demo-support-ticket-create",
        firestore: { rules: readFileSync(join(__dirname, "..", "..", "firestore.rules"), "utf8") },
    });
});
afterEach(async () => env?.clearFirestore());
afterAll(async () => env?.cleanup());

describe("ticket create — the real path (tickets + tenantId)", () => {
    test("the ticket write ITSELF is allowed (proves the write was never the problem)", async () => {
        const db = env.authenticatedContext(UID, CLAIMS).firestore();
        await assertSucceeds(
            addDoc(collection(db, "tickets"), {
                subject: "QA",
                description: "d",
                priority: "medium",
                category: "General",
                status: "open",
                tenantId: ORG, // TicketService sets this from profile.orgId
                slaStatus: "on_track",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            })
        );
    });

    test("THE BUG: reading the MISSING settings/{tenantId}_support doc is DENIED", async () => {
        // createTicket awaits this read first; the rule dereferences resource.data.orgId,
        // which errors when the document does not exist.
        const db = env.authenticatedContext(UID, CLAIMS).firestore();
        await assertFails(getDoc(doc(db, "settings", `${ORG}_support`)));
    });

    test("the same read SUCCEEDS once the doc exists with a matching orgId", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "settings", `${ORG}_support`), { orgId: ORG });
        });
        const db = env.authenticatedContext(UID, CLAIMS).firestore();
        await assertSucceeds(getDoc(doc(db, "settings", `${ORG}_support`)));
    });

    test("a foreign tenant still cannot read another org's settings doc", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "settings", `${ORG}_support`), { orgId: ORG });
        });
        const other = env.authenticatedContext("other-uid", { orgId: "someone-else", role: "admin" }).firestore();
        await assertFails(getDoc(doc(other, "settings", `${ORG}_support`)));
    });
});
