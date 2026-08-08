/**
 * RETIREMENT OF THE `support_tickets` COLLECTION (2026-08-08).
 *
 * The collection was superseded by `tickets`/`tenantId` in the 2026-08-07 Sweep E migration
 * (commit 08839d8b). It is empty in prod and no code path references it. This file is the
 * fail-then-pass evidence pair for locking it down.
 *
 * WHAT THIS FILE PROVED, AND WHY IT MATTERS:
 * Deleting the permissive `match /support_tickets/{docId}` block on its own does NOT deny
 * access. firestore.rules ends with a GENERIC FALL-THROUGH:
 *
 *     match /{collection}/{docId} {
 *       allow read, write: if isAuthenticated()
 *         && resource.data.orgId != null
 *         && request.auth.token.orgId == resource.data.orgId;
 *       ...
 *     }
 *
 * Firestore grants access if ANY matching rule allows it, so a deleted block simply falls
 * through to that one and the collection stays readable and writable by org members.
 *
 * Replacing the block with `allow read, write: if false` did NOT help either — a false allow
 * cannot override another rule's allow, so that attempt was equally a no-op and this suite
 * still failed. Actual denial required excluding the collection INSIDE the catch-all, via
 * `isRetiredCollection()`. The standalone deny block is retained only to declare intent at
 * the collection's own match path; it enforces nothing on its own.
 *
 * Recorded runs (full output in TEST-REPORT-2026-07-28.md):
 *   RUN 1, before any change      — "ALLOWED" PASSED ×2, "denied" FAILED ×3.
 *   RUN 2, standalone deny block  — byte-identical to RUN 1: the deny was a no-op.
 *   RUN 3, catch-all exclusion    — "ALLOWED" FAILED ×2, "denied" PASSED ×3. Enforced.
 * The now-inverted "ALLOWED" assertion is kept below as `describe.skip`, verbatim, so the
 * before-state stays reproducible: un-skip it and it fails, which is the proof the lockdown
 * is real and still in force.
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { addDoc, collection, deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const ORG = "org-retire-test";
const UID = "uid-retire-test";
const CLAIMS = { orgId: ORG, role: "admin" };

let env: RulesTestEnvironment;

beforeAll(async () => {
    env = await initializeTestEnvironment({
        projectId: "demo-support-tickets-retirement",
        firestore: { rules: readFileSync(join(__dirname, "..", "..", "firestore.rules"), "utf8") },
    });
});
afterEach(async () => env?.clearFirestore());
afterAll(async () => env?.cleanup());

/** Seed one legacy doc that carries the caller's own orgId — the best case for access. */
async function seedLegacyDoc(id = "legacy-1") {
    await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "support_tickets", id), {
            orgId: ORG,
            subject: "legacy",
            status: "open",
        });
    });
}

// ---------------------------------------------------------------------------
// BEFORE-STATE (recorded, now inverted). Un-skipping this must FAIL.
// ---------------------------------------------------------------------------
describe.skip("[before-state] support_tickets was reachable by an org member", () => {
    test("org member could READ a legacy support_tickets doc", async () => {
        await seedLegacyDoc();
        const db = env.authenticatedContext(UID, CLAIMS).firestore();
        await assertSucceeds(getDoc(doc(db, "support_tickets", "legacy-1")));
    });

    test("org member could CREATE a support_tickets doc", async () => {
        const db = env.authenticatedContext(UID, CLAIMS).firestore();
        await assertSucceeds(addDoc(collection(db, "support_tickets"), { orgId: ORG, subject: "new", status: "open" }));
    });
});

// ---------------------------------------------------------------------------
// AFTER-STATE — the live guard.
// ---------------------------------------------------------------------------
describe("support_tickets is retired and denied to everyone", () => {
    test("org member CANNOT read a legacy doc that carries their own orgId", async () => {
        await seedLegacyDoc();
        const db = env.authenticatedContext(UID, CLAIMS).firestore();
        await assertFails(getDoc(doc(db, "support_tickets", "legacy-1")));
    });

    test("org member CANNOT create", async () => {
        const db = env.authenticatedContext(UID, CLAIMS).firestore();
        await assertFails(addDoc(collection(db, "support_tickets"), { orgId: ORG, subject: "new", status: "open" }));
    });

    test("org member CANNOT update or delete a legacy doc", async () => {
        await seedLegacyDoc();
        const db = env.authenticatedContext(UID, CLAIMS).firestore();
        await assertFails(updateDoc(doc(db, "support_tickets", "legacy-1"), { status: "closed" }));
        await assertFails(deleteDoc(doc(db, "support_tickets", "legacy-1")));
    });

    test("the nested messages subcollection is denied too", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "support_tickets", "legacy-1", "messages", "m1"), {
                orgId: ORG,
                body: "hi",
            });
        });
        const db = env.authenticatedContext(UID, CLAIMS).firestore();
        await assertFails(getDoc(doc(db, "support_tickets", "legacy-1", "messages", "m1")));
    });

    test("an unauthenticated caller is denied (unchanged, stated for completeness)", async () => {
        await seedLegacyDoc();
        const db = env.unauthenticatedContext().firestore();
        await assertFails(getDoc(doc(db, "support_tickets", "legacy-1")));
    });

    test("the REPLACEMENT collection is unaffected — tickets still works", async () => {
        // Guards against over-broad denial: retiring the old collection must not touch the new.
        const db = env.authenticatedContext(UID, CLAIMS).firestore();
        await assertSucceeds(addDoc(collection(db, "tickets"), { tenantId: ORG, subject: "live", status: "open" }));
    });
});
