import { readFileSync } from "fs";
import {
    initializeTestEnvironment,
    assertFails,
    assertSucceeds,
    RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

const PROJECT_ID = "demo-tenant-isolation";
const RULES_PATH = "firestore.rules";

const TENANT_A = "tenantA";
const TENANT_B = "tenantB";

// 13 root collections scoped to orgId (proposals dropped in Phase 2.1).
const COLLECTIONS = [
    "leads",
    "customers",
    "customer_files",
    "contacts",
    "projects",
    "tasks",
    "files",
    "activities",
    "invoices",
    "estimates",
    "reminders",
    "notifications",
    "settings",
] as const;

let env: RulesTestEnvironment;

beforeAll(async () => {
    env = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
            rules: readFileSync(RULES_PATH, "utf8"),
            host: "127.0.0.1",
            port: 8080,
        },
    });
}, 30000);

afterAll(async () => {
    await env.cleanup();
});

beforeEach(async () => {
    await env.clearFirestore();
});

// Auth contexts
const alice = () => env.authenticatedContext("alice", { orgId: TENANT_A });
const bob = () => env.authenticatedContext("bob", { orgId: TENANT_B });
const sa = () => env.authenticatedContext("sa-uid", { isSuperAdmin: true });
const anon = () => env.unauthenticatedContext();

// Seed a doc with security rules bypassed (admin write).
async function seedDoc(collection: string, docId: string, orgId: string) {
    await env.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection(collection).doc(docId).set({
            orgId,
            seededAt: Date.now(),
        });
    });
}

describe.each(COLLECTIONS)("Tenant isolation: /%s/", (col) => {
    it("tenantA user CAN read own-tenant doc", async () => {
        await seedDoc(col, "ownDoc", TENANT_A);
        await assertSucceeds(alice().firestore().collection(col).doc("ownDoc").get());
    });

    it("tenantA user CAN update own-tenant doc", async () => {
        await seedDoc(col, "ownDoc", TENANT_A);
        await assertSucceeds(alice().firestore().collection(col).doc("ownDoc").update({ touched: true }));
    });

    it("tenantA user CAN create doc with own orgId", async () => {
        await assertSucceeds(alice().firestore().collection(col).doc("newA").set({ orgId: TENANT_A }));
    });

    it("tenantA user CANNOT read tenantB doc", async () => {
        await seedDoc(col, "fromB", TENANT_B);
        await assertFails(alice().firestore().collection(col).doc("fromB").get());
    });

    it("tenantA user CANNOT update tenantB doc", async () => {
        await seedDoc(col, "fromB", TENANT_B);
        await assertFails(alice().firestore().collection(col).doc("fromB").update({ hacked: true }));
    });

    it("tenantA user CANNOT delete tenantB doc", async () => {
        await seedDoc(col, "fromB", TENANT_B);
        await assertFails(alice().firestore().collection(col).doc("fromB").delete());
    });

    it("tenantA user CANNOT create a doc claiming orgId=tenantB (spoof)", async () => {
        await assertFails(alice().firestore().collection(col).doc("spoof").set({ orgId: TENANT_B }));
    });

    it("unauthenticated user CANNOT read", async () => {
        await seedDoc(col, "anyDoc", TENANT_A);
        await assertFails(anon().firestore().collection(col).doc("anyDoc").get());
    });

    it("unauthenticated user CANNOT write", async () => {
        await assertFails(anon().firestore().collection(col).doc("x").set({ orgId: TENANT_A }));
    });

    it("superadmin CAN read across tenants", async () => {
        await seedDoc(col, "fromB", TENANT_B);
        await assertSucceeds(sa().firestore().collection(col).doc("fromB").get());
    });

    it("superadmin CAN write across tenants", async () => {
        await seedDoc(col, "fromB", TENANT_B);
        await assertSucceeds(sa().firestore().collection(col).doc("fromB").update({ saTouched: true }));
    });
});

describe("Customer notes subcollection — parent-orgId gate", () => {
    beforeEach(async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            const db = ctx.firestore();
            await db.collection("customers").doc("cust_a").set({ orgId: TENANT_A });
            await db.collection("customers").doc("cust_b").set({ orgId: TENANT_B });
            await db
                .collection("customers")
                .doc("cust_a")
                .collection("notes")
                .doc("noteA")
                .set({ description: "in A" });
            await db
                .collection("customers")
                .doc("cust_b")
                .collection("notes")
                .doc("noteB")
                .set({ description: "in B" });
        });
    });

    it("tenantA CAN read note under own customer", async () => {
        await assertSucceeds(
            alice().firestore().collection("customers").doc("cust_a").collection("notes").doc("noteA").get()
        );
    });

    it("tenantA CANNOT read note under tenantB customer", async () => {
        await assertFails(
            alice().firestore().collection("customers").doc("cust_b").collection("notes").doc("noteB").get()
        );
    });

    it("tenantA CANNOT write note into tenantB customer", async () => {
        await assertFails(
            alice()
                .firestore()
                .collection("customers")
                .doc("cust_b")
                .collection("notes")
                .doc("hack")
                .set({ description: "ouch" })
        );
    });

    it("tenantA CAN write a new note under own customer", async () => {
        await assertSucceeds(
            alice()
                .firestore()
                .collection("customers")
                .doc("cust_a")
                .collection("notes")
                .doc("fresh")
                .set({ description: "fresh note" })
        );
    });

    it("unauthenticated CANNOT read any note", async () => {
        await assertFails(
            anon().firestore().collection("customers").doc("cust_a").collection("notes").doc("noteA").get()
        );
    });

    it("superadmin CAN read tenantB note", async () => {
        await assertSucceeds(
            sa().firestore().collection("customers").doc("cust_b").collection("notes").doc("noteB").get()
        );
    });
});

describe("Lead notes subcollection — parent-orgId gate", () => {
    beforeEach(async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            const db = ctx.firestore();
            await db.collection("leads").doc("lead_a").set({ orgId: TENANT_A });
            await db.collection("leads").doc("lead_b").set({ orgId: TENANT_B });
            await db.collection("leads").doc("lead_a").collection("notes").doc("noteA").set({ description: "in A" });
            await db.collection("leads").doc("lead_b").collection("notes").doc("noteB").set({ description: "in B" });
        });
    });

    it("tenantA CAN read note under own lead", async () => {
        await assertSucceeds(
            alice().firestore().collection("leads").doc("lead_a").collection("notes").doc("noteA").get()
        );
    });

    it("tenantA CANNOT read note under tenantB lead", async () => {
        await assertFails(alice().firestore().collection("leads").doc("lead_b").collection("notes").doc("noteB").get());
    });

    it("tenantA CANNOT write note into tenantB lead", async () => {
        await assertFails(
            alice()
                .firestore()
                .collection("leads")
                .doc("lead_b")
                .collection("notes")
                .doc("hack")
                .set({ description: "ouch" })
        );
    });

    it("tenantA CAN write a new note under own lead", async () => {
        await assertSucceeds(
            alice()
                .firestore()
                .collection("leads")
                .doc("lead_a")
                .collection("notes")
                .doc("fresh")
                .set({ description: "fresh note" })
        );
    });

    it("unauthenticated CANNOT read any note", async () => {
        await assertFails(anon().firestore().collection("leads").doc("lead_a").collection("notes").doc("noteA").get());
    });

    it("superadmin CAN read tenantB note", async () => {
        await assertSucceeds(sa().firestore().collection("leads").doc("lead_b").collection("notes").doc("noteB").get());
    });
});

// Sanity: confirm tenantB user behaves the mirror-image of tenantA on one collection.
describe("Mirror sanity (tenantB user)", () => {
    it("tenantB CAN read own and CANNOT read tenantA on /leads/", async () => {
        await seedDoc("leads", "fromA", TENANT_A);
        await seedDoc("leads", "fromB", TENANT_B);
        await assertSucceeds(bob().firestore().collection("leads").doc("fromB").get());
        await assertFails(bob().firestore().collection("leads").doc("fromA").get());
    });
});
