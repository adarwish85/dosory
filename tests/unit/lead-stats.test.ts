/**
 * Leads stat-cards regression (emulator).
 *
 * The 2026-07-28 bug: a combined `{count(), sum("value")}` aggregation excludes every
 * document lacking the summed field — tenants whose leads carry no `value` saw TOTAL 0
 * while the table showed rows. fetchLeadStats splits count from sum; this suite pins:
 *   - total counts docs WITH AND WITHOUT `value`
 *   - totalValue sums only docs that have it
 *   - starred/qualified are real org-scoped server counts
 *   - org isolation of every number
 *
 * Run: firebase emulators:exec --only firestore --project demo-lead-stats \
 *        "npx jest tests/unit/lead-stats.test.ts"
 */
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import type { Firestore } from "firebase/firestore";
import { fetchLeadStats } from "@/lib/hooks/leads/fetch-lead-stats";

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
const d = emulator ? describe : describe.skip;

d("fetchLeadStats (leads stat cards)", () => {
    let env: RulesTestEnvironment;
    const ORG = "stats-org";

    beforeAll(async () => {
        env = await initializeTestEnvironment({
            projectId: "demo-lead-stats",
            // Open rules: this suite tests aggregation SEMANTICS, not authz —
            // tenant isolation authz is pinned by the 187-test rules suite.
            firestore: {
                rules: `rules_version = '2'; service cloud.firestore { match /databases/{db}/documents { match /{doc=**} { allow read, write: if true; } } }`,
            },
        });
        await env.withSecurityRulesDisabled(async (ctx) => {
            const db = ctx.firestore();
            const mk = (id: string, data: Record<string, unknown>) => db.collection("leads").doc(id).set(data);
            // The regression case: leads WITHOUT a `value` field must still be counted.
            await mk("no-value-1", { orgId: ORG, name: "A", status: "new" });
            await mk("no-value-2", { orgId: ORG, name: "B", status: "qualified" });
            await mk("valued-1", { orgId: ORG, name: "C", status: "new", value: 500 });
            await mk("valued-starred", { orgId: ORG, name: "D", status: "qualified", value: 1500, isStarred: true });
            await mk("other-org", { orgId: "other", name: "X", status: "qualified", value: 9999, isStarred: true });
        });
    });

    afterAll(async () => {
        await env.cleanup();
    });

    test("total counts ALL org leads, including those without `value` (the regression)", async () => {
        const ctx = env.unauthenticatedContext();
        const stats = await fetchLeadStats(ctx.firestore() as unknown as Firestore, ORG);
        expect(stats.total).toBe(4); // combined {count,sum} would have returned 2
    });

    test("totalValue sums only docs carrying `value`; starred/qualified are server counts; org-isolated", async () => {
        const ctx = env.unauthenticatedContext();
        const stats = await fetchLeadStats(ctx.firestore() as unknown as Firestore, ORG);
        expect(stats.totalValue).toBe(2000);
        expect(stats.starred).toBe(1);
        expect(stats.qualified).toBe(2);
        const other = await fetchLeadStats(ctx.firestore() as unknown as Firestore, "other");
        expect(other).toEqual({ total: 1, totalValue: 9999, starred: 1, qualified: 1 });
    });

    test("view-own extra constraint scopes every number", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await ctx.firestore().collection("leads").doc("mine").set({
                orgId: ORG,
                name: "Mine",
                status: "qualified",
                value: 100,
                isStarred: true,
                assignedTo: "staff-1",
            });
        });
        const { where } = await import("firebase/firestore");
        const ctx = env.unauthenticatedContext();
        const stats = await fetchLeadStats(ctx.firestore() as unknown as Firestore, ORG, [
            where("assignedTo", "==", "staff-1"),
        ]);
        expect(stats).toEqual({ total: 1, totalValue: 100, starred: 1, qualified: 1 });
    });
});
