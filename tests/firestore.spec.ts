import { readFileSync } from "fs";
import * as testing from "@firebase/rules-unit-testing";
import { describe, it, before, after, beforeEach } from "node:test";
import * as assert from "assert";

const PROJECT_ID = "goalo-test-project";
const RULES_PATH = "firestore.rules";

describe("Firestore Security Rules", () => {
    let testEnv: testing.RulesTestEnvironment;

    before(async () => {
        testEnv = await testing.initializeTestEnvironment({
            projectId: PROJECT_ID,
            firestore: {
                rules: readFileSync(RULES_PATH, "utf8"),
                host: "127.0.0.1",
                port: 8080,
            },
        });
    });

    after(async () => {
        await testEnv.cleanup();
    });

    beforeEach(async () => {
        await testEnv.clearFirestore();
    });

    // Helper to get authorized context
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function getAuthedFirestore(auth: any) {
        return testEnv.authenticatedContext(auth.uid, auth).firestore();
    }

    describe("Tenant Isolation", () => {
        const orgId = "org_123";
        const otherOrgId = "org_456";

        // User in Org 1
        const user = { uid: "user_1", orgId: orgId, role: "staff" };

        // User in Org 2
        const otherUser = { uid: "user_2", orgId: otherOrgId, role: "staff" };

        it("should allow user to read leads in their own org", async () => {
            const db = getAuthedFirestore(user);
            const leadRef = db.collection("leads").doc("lead_1");

            await leadRef.set({ orgId: orgId, name: "Lead 1" }); // Set with admin or setup first?
            // Actually we need to set it with someone who CAN write.
            // Let's use admin context to setup data or rely on rule allowing create.

            await assert.doesNotReject(leadRef.get());
        });

        it("should deny user reading leads from another org", async () => {
            const dbAuth = getAuthedFirestore(user);
            const dbOther = getAuthedFirestore(otherUser);

            const leadRef = dbOther.collection("leads").doc("lead_other");
            // Setup data acting as other user
            await leadRef.set({ orgId: otherOrgId, name: "Other Lead" });

            // User 1 tries to read
            await assert.rejects(dbAuth.collection("leads").doc("lead_other").get());
        });

        it("should allow user to create lead with correct orgId", async () => {
            const db = getAuthedFirestore(user);
            await assert.doesNotReject(
                db.collection("leads").add({
                    orgId: orgId,
                    name: "My New Lead",
                })
            );
        });

        it("should deny user creating lead with WRONG orgId", async () => {
            const db = getAuthedFirestore(user);
            await assert.rejects(
                db.collection("leads").add({
                    orgId: otherOrgId, // Malicious attempt
                    name: "Hacked Lead",
                })
            );
        });
    });

    describe("Users Collection", () => {
        const myUid = "my_uid";

        it("should allow user to read their own profile", async () => {
            const db = getAuthedFirestore({ uid: myUid }); // No claims yet
            await assert.doesNotReject(db.collection("users").doc(myUid).get());
        });

        it("should deny reading other user profile", async () => {
            const db = getAuthedFirestore({ uid: myUid });
            await assert.rejects(db.collection("users").doc("other_uid").get());
        });
    });
});
