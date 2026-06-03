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

// ============================================
// Phase 3.0.1 — conversations.messages tenant gate
// ============================================
// Live chat path is conversations/{convId}/messages/{msgId}; the message subcollection
// has no orgId field of its own, so it gates on parent conv's orgId via get().
describe("Conversation messages subcollection — parent-orgId gate", () => {
    beforeEach(async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            const db = ctx.firestore();
            await db
                .collection("conversations")
                .doc("conv_a")
                .set({
                    orgId: TENANT_A,
                    participants: ["alice", "alice2"],
                    unreadCounts: { alice: 0, alice2: 0 },
                });
            await db
                .collection("conversations")
                .doc("conv_b")
                .set({
                    orgId: TENANT_B,
                    participants: ["bob"],
                    unreadCounts: { bob: 0 },
                });
            await db
                .collection("conversations")
                .doc("conv_a")
                .collection("messages")
                .doc("msgA")
                .set({ content: "hello A", senderId: "alice" });
            await db
                .collection("conversations")
                .doc("conv_b")
                .collection("messages")
                .doc("msgB")
                .set({ content: "hello B", senderId: "bob" });
        });
    });

    it("tenantA CAN read message under own conversation", async () => {
        await assertSucceeds(
            alice().firestore().collection("conversations").doc("conv_a").collection("messages").doc("msgA").get()
        );
    });

    it("tenantA CANNOT read message under tenantB conversation", async () => {
        await assertFails(
            alice().firestore().collection("conversations").doc("conv_b").collection("messages").doc("msgB").get()
        );
    });

    it("tenantA CANNOT write message into tenantB conversation", async () => {
        await assertFails(
            alice()
                .firestore()
                .collection("conversations")
                .doc("conv_b")
                .collection("messages")
                .doc("hack")
                .set({ content: "ouch", senderId: "alice" })
        );
    });

    it("tenantA CAN write a new message under own conversation", async () => {
        await assertSucceeds(
            alice()
                .firestore()
                .collection("conversations")
                .doc("conv_a")
                .collection("messages")
                .doc("fresh")
                .set({ content: "fresh msg", senderId: "alice" })
        );
    });

    it("unauthenticated CANNOT read any message", async () => {
        await assertFails(
            anon().firestore().collection("conversations").doc("conv_a").collection("messages").doc("msgA").get()
        );
    });

    it("superadmin CAN read tenantB message", async () => {
        await assertSucceeds(
            sa().firestore().collection("conversations").doc("conv_b").collection("messages").doc("msgB").get()
        );
    });
});

// Regression coverage for use-chat.ts sendMessage(): a single batch that writes the
// message AND updates the parent conversation (unreadCounts, lastMessage). A rule
// gap on either leg fails the whole batch — this asserts the real send path.
describe("Conversation batched send (regression for use-chat sendMessage)", () => {
    beforeEach(async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            const db = ctx.firestore();
            await db
                .collection("conversations")
                .doc("conv_a")
                .set({
                    orgId: TENANT_A,
                    participants: ["alice", "alice2"],
                    unreadCounts: { alice: 0, alice2: 0 },
                });
            await db
                .collection("conversations")
                .doc("conv_b")
                .set({
                    orgId: TENANT_B,
                    participants: ["bob"],
                    unreadCounts: { bob: 0 },
                });
        });
    });

    it("org member CAN batch: write message + update parent conv (own org)", async () => {
        const db = alice().firestore();
        const batch = db.batch();
        const msgRef = db.collection("conversations").doc("conv_a").collection("messages").doc();
        batch.set(msgRef, { content: "hi", senderId: "alice" });
        const convRef = db.collection("conversations").doc("conv_a");
        batch.update(convRef, {
            lastMessage: { content: "hi", senderId: "alice" },
            "unreadCounts.alice2": 1,
        });
        await assertSucceeds(batch.commit());
    });

    it("cross-tenant member CANNOT batch: write message + update parent conv (other org)", async () => {
        const db = alice().firestore();
        const batch = db.batch();
        const msgRef = db.collection("conversations").doc("conv_b").collection("messages").doc();
        batch.set(msgRef, { content: "infiltrate", senderId: "alice" });
        const convRef = db.collection("conversations").doc("conv_b");
        batch.update(convRef, {
            lastMessage: { content: "infiltrate", senderId: "alice" },
            "unreadCounts.bob": 99,
        });
        await assertFails(batch.commit());
    });
});

// ============================================
// Stage 3.0.4 — platform/{docId} read scope (split: named-public vs SA-only catchall)
// ============================================
// platform/settings, platform/landing, platform/siteDesign read by anonymous landing/signup pages → stay public
// any OTHER platform/* doc (e.g. emailTemplates parent, future docs) → admin-only catchall
describe("Platform docs read scope — named public vs SA-only catchall", () => {
    beforeEach(async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            const db = ctx.firestore();
            await db
                .collection("platform")
                .doc("settings")
                .set({ allowSignups: true, maintenanceMode: false, platformName: "Dosory" });
            await db
                .collection("platform")
                .doc("landing")
                .set({ hero: { headline: "Welcome" } });
            await db.collection("platform").doc("siteDesign").set({ primaryColor: "#9b8cff" });
            // Sensitive catch-all example: should NOT be readable by anon/auth, only SA
            await db.collection("platform").doc("emailTemplates").set({ defaultSubject: "Hi" });
        });
    });

    it("anonymous CAN read platform/settings (signup needs it)", async () => {
        await assertSucceeds(anon().firestore().collection("platform").doc("settings").get());
    });

    it("anonymous CAN read platform/landing (legacy + public)", async () => {
        await assertSucceeds(anon().firestore().collection("platform").doc("landing").get());
    });

    it("anonymous CAN read platform/siteDesign (public landing renders this)", async () => {
        await assertSucceeds(anon().firestore().collection("platform").doc("siteDesign").get());
    });

    it("anonymous CANNOT read platform/emailTemplates (catch-all SA-only)", async () => {
        await assertFails(anon().firestore().collection("platform").doc("emailTemplates").get());
    });

    it("authenticated tenant user CANNOT read platform/emailTemplates", async () => {
        await assertFails(alice().firestore().collection("platform").doc("emailTemplates").get());
    });

    it("superadmin CAN read platform/emailTemplates", async () => {
        await assertSucceeds(sa().firestore().collection("platform").doc("emailTemplates").get());
    });

    it("anonymous CANNOT write any platform/* doc (write stays SA-only)", async () => {
        await assertFails(anon().firestore().collection("platform").doc("settings").set({ hacked: true }));
    });

    it("tenant user CANNOT write any platform/* doc", async () => {
        await assertFails(alice().firestore().collection("platform").doc("settings").update({ hacked: true }));
    });

    it("superadmin CAN write platform/settings", async () => {
        await assertSucceeds(sa().firestore().collection("platform").doc("settings").update({ touched: true }));
    });
});

// ============================================
// Stage 3.0.3 — analytics/{cat}/events orgId gate on create
// ============================================
describe("Analytics events — orgId gate on create", () => {
    it("authenticated user CAN create event for own org", async () => {
        await assertSucceeds(
            alice()
                .firestore()
                .collection("analytics")
                .doc("onboarding")
                .collection("events")
                .doc("ev1")
                .set({ orgId: TENANT_A, event: "started", userId: "alice" })
        );
    });

    it("authenticated user CANNOT create event claiming other tenant's orgId", async () => {
        await assertFails(
            alice()
                .firestore()
                .collection("analytics")
                .doc("onboarding")
                .collection("events")
                .doc("ev_spoof")
                .set({ orgId: TENANT_B, event: "fake", userId: "alice" })
        );
    });

    it("authenticated user CANNOT create event WITHOUT orgId field", async () => {
        await assertFails(
            alice()
                .firestore()
                .collection("analytics")
                .doc("onboarding")
                .collection("events")
                .doc("ev_noorg")
                .set({ event: "missing-org", userId: "alice" })
        );
    });

    it("unauthenticated CANNOT create event", async () => {
        await assertFails(
            anon()
                .firestore()
                .collection("analytics")
                .doc("onboarding")
                .collection("events")
                .doc("ev_anon")
                .set({ orgId: TENANT_A, event: "x" })
        );
    });
});

// ============================================
// Stage 3.0.5 — staff/{docId} create: middle clause now requires owning the org
// ============================================
// Self-signup case: a user creating their own admin staff doc must own the org they claim
// (the signup flow creates organizations/{orgId} with ownerId=user.uid in step 2, BEFORE the staff doc in step 4)
describe("Staff create — middle clause requires org ownership", () => {
    beforeEach(async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            const db = ctx.firestore();
            // Self-signup precondition: org exists with alice as owner
            await db
                .collection("organizations")
                .doc("alice_org")
                .set({ orgId: "alice_org", ownerId: "alice", name: "Alice's Co" });
            // Other org owned by bob (used for cross-tenant spoof test)
            await db
                .collection("organizations")
                .doc("bob_org")
                .set({ orgId: "bob_org", ownerId: "bob", name: "Bob's Co" });
        });
    });

    it("self-signup: user CAN create own staff doc claiming an org they OWN", async () => {
        await assertSucceeds(
            alice()
                .firestore()
                .collection("staff")
                .doc("alice@example.com")
                .set({ authUid: "alice", orgId: "alice_org", email: "alice@example.com", isAdmin: true })
        );
    });

    it("cross-tenant spoof: user CANNOT create staff doc claiming an org they DO NOT own", async () => {
        await assertFails(
            alice()
                .firestore()
                .collection("staff")
                .doc("spoof@example.com")
                .set({ authUid: "alice", orgId: "bob_org", email: "spoof@example.com", isAdmin: true })
        );
    });

    it("user CANNOT create staff doc with someone else's authUid", async () => {
        await assertFails(
            alice()
                .firestore()
                .collection("staff")
                .doc("evil@example.com")
                .set({ authUid: "bob", orgId: "alice_org", email: "evil@example.com" })
        );
    });
});
