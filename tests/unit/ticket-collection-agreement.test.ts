/**
 * SWEEP E GUARD — read/write collection agreement for tickets.
 *
 * The bug this prevents (found 2026-08-07): the support module wrote tickets to
 * `tickets`/`tenantId` while three *other* surfaces still read `support_tickets`/`orgId`.
 * Writes succeeded, those three read surfaces stayed permanently empty, and nothing errored
 * — the dashboard cheerfully rendered "All Caught Up!" with two open tickets in the database.
 *
 * A type error cannot catch this: both collections are just strings passed to
 * `collection(db, …)`. So this test asserts the *agreement* directly — every ticket surface
 * must resolve to the same collection, and the retired one must have no callers left.
 *
 * If you are adding a fifth ticket surface and this test fails: do not add your file to the
 * allow-list. Route it through lib/hooks/use-tickets.ts (→ TicketService) like the others.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const REPO = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(REPO, p), "utf8");

/** Every surface that shows or creates a ticket, and the file that owns its query. */
const TICKET_SURFACES = [
    "app/dashboard/support/page.tsx", // main list
    "app/dashboard/support/new/page.tsx", // the writer
    "app/dashboard/customers/[id]/tickets/page.tsx", // customer tab
    "app/dashboard/projects/[id]/tickets/page.tsx", // project tab
    "lib/services/today-service.ts", // dashboard Today view
    "components/dashboard/customers/customer-context.tsx", // customer sidebar count badge
];

const CANONICAL_COLLECTION = "tickets";
const RETIRED_COLLECTION = "support_tickets";

describe("Sweep E — every ticket surface agrees on one collection", () => {
    test.each(TICKET_SURFACES)("%s does not reference the retired collection", (file) => {
        expect(read(file)).not.toMatch(new RegExp(`["']${RETIRED_COLLECTION}["']`));
    });

    test("the retired collection has no callers anywhere in app/, components/ or lib/", () => {
        const hits: string[] = [];
        const walk = (dir: string) => {
            for (const entry of readdirSync(join(REPO, dir))) {
                if (entry === "node_modules" || entry.startsWith(".")) continue;
                const rel = `${dir}/${entry}`;
                if (statSync(join(REPO, rel)).isDirectory()) {
                    walk(rel);
                } else if (/\.(ts|tsx)$/.test(entry)) {
                    // A bare mention in a comment is fine; a Firestore reference is not.
                    if (new RegExp(`(collection|doc)\\(\\s*db\\s*,\\s*["']${RETIRED_COLLECTION}["']`).test(read(rel))) {
                        hits.push(rel);
                    }
                }
            }
        };
        ["app", "components", "lib"].forEach(walk);
        expect(hits).toEqual([]);
    });

    test("the writer and the service it calls both target the canonical collection", () => {
        const service = read("lib/services/ticket-service.ts");
        expect(service).toMatch(new RegExp(`TICKETS_COLLECTION\\s*=\\s*["']${CANONICAL_COLLECTION}["']`));
        // createTicket must write through that constant, not a literal.
        const createTicket = service.slice(service.indexOf("static async createTicket"));
        expect(createTicket.slice(0, createTicket.indexOf("\n    static "))).toMatch(
            /addDoc\(collection\(db, TICKETS_COLLECTION\)/
        );
    });

    test("the three migrated read surfaces go through the canonical hook/service", () => {
        expect(read("app/dashboard/customers/[id]/tickets/page.tsx")).toMatch(/useSupportTickets/);
        expect(read("app/dashboard/projects/[id]/tickets/page.tsx")).toMatch(/useSupportTickets/);
        // today-service queries Firestore directly; pin the collection AND the tenant key.
        const today = read("lib/services/today-service.ts");
        const getTickets = today.slice(today.indexOf("private async getTickets"));
        const body = getTickets.slice(0, getTickets.indexOf("\n    private "));
        expect(body).toMatch(/collection\(db, "tickets"\)/);
        expect(body).toMatch(/where\("tenantId", "==", orgId\)/);
    });

    test("the customer sidebar count badge scopes tickets by tenantId, not orgId", () => {
        // A fourth reader, missed by the first pass of this migration: the shared count loop
        // applied where("orgId","==",…) to every collection. Ticket docs have no orgId, so
        // the badge read 0 forever — and the loop's catch reported the failure as a zero.
        const src = read("components/dashboard/customers/customer-context.tsx");
        expect(src).toMatch(/\{ key: "tickets", collection: "tickets", tenantField: "tenantId" \}/);
        expect(src).toMatch(/where\(tenantField \?\? "orgId", "==", orgId\)/);
    });

    test("use-support.ts no longer exports ticket hooks (they wrote the retired collection)", () => {
        const src = read("lib/hooks/use-support.ts");
        expect(src).not.toMatch(/export function useTickets\b/);
        expect(src).not.toMatch(/export function useTicketReplies\b/);
        // …and the barrel must not re-export them either.
        const barrel = read("lib/hooks/index.ts");
        expect(barrel).not.toMatch(/useTicketReplies/);
        expect(barrel).not.toMatch(/export \{[^}]*\buseTickets\b[^}]*\} from "\.\/use-support"/);
    });
});

describe("Sweep E — the canonical tenant key is used consistently", () => {
    test("tickets queries filter on tenantId, never orgId", () => {
        const service = read("lib/services/ticket-service.ts");
        const getTickets = service.slice(service.indexOf("static async getTickets"));
        const body = getTickets.slice(0, getTickets.indexOf("\n    static "));
        expect(body).toMatch(/where\("tenantId", "==", tenantId\)/);
        expect(body).not.toMatch(/where\("orgId"/);
    });

    test("every filter TicketService accepts has a composite index declared", () => {
        const indexes = JSON.parse(read("firestore.indexes.json")).indexes as Array<{
            collectionGroup: string;
            fields: Array<{ fieldPath: string }>;
        }>;
        const ticketIndexes = indexes
            .filter((i) => i.collectionGroup === "tickets")
            .map((i) => i.fields.map((f) => f.fieldPath).join(","));

        // Each optional filter is ANDed with tenantId and ordered by createdAt desc.
        for (const field of ["status", "priority", "assignedAgentId", "customerId", "projectId"]) {
            expect(ticketIndexes).toContain(`tenantId,${field},createdAt`);
        }
        // The Today view queries tenantId == X AND assignedAgentId in [...]; this index
        // serves it on its (tenantId, assignedAgentId) prefix.
        expect(ticketIndexes).toContain("tenantId,assignedAgentId,status");
    });

    test("the Today view's task query has its composite index too", () => {
        // Its absence is what logged "Error fetching tasks" on every dashboard load.
        const indexes = JSON.parse(read("firestore.indexes.json")).indexes as Array<{
            collectionGroup: string;
            fields: Array<{ fieldPath: string }>;
        }>;
        const taskIndexes = indexes
            .filter((i) => i.collectionGroup === "tasks")
            .map((i) => i.fields.map((f) => f.fieldPath).join(","));
        expect(taskIndexes).toContain("orgId,assignees,status");
    });
});

describe("Today view — assignee identity keys", () => {
    /**
     * Assignee pickers write `staff.id`, and staff docs are keyed by lowercased email
     * (CLAUDE.md §11 staff invariant). The Today view is handed `profile.uid`. Matching on
     * uid alone silently returned zero rows for everyone — the same silent-empty class as
     * the collection split-brain, one level down on the identity key.
     */
    const today = read("lib/services/today-service.ts");

    test("both Today queries match on the full set of assignee ids, not the auth uid alone", () => {
        expect(today).toMatch(/identityKeysFor\(userId, userEmail\)/);
        expect(today).toMatch(/where\("assignees", "array-contains-any", assigneeIds\)/);
        expect(today).toMatch(/where\("assignedAgentId", "in", assigneeIds\)/);
        // The single-value forms are what broke it; they must not come back.
        expect(today).not.toMatch(/array-contains", userId/);
        expect(today).not.toMatch(/where\("assignedAgentId", "==", userId\)/);
    });

    test("the caller supplies the email the staff doc is keyed by", () => {
        expect(read("components/dashboard/today/today-view.tsx")).toMatch(/profile\.email/);
    });

    test("neither Today query uses a `!=` filter", () => {
        // `!=` drops documents missing the field entirely, and Firestore rejects it
        // alongside array-contains-any. Status is filtered in memory instead.
        const section = today.slice(
            today.indexOf("private async getTasks"),
            today.indexOf("private async getOverdueInvoices")
        );
        // Strip comments first — the prose above each query quotes the old `!=` clause
        // deliberately, and matching that would make this test assert against itself.
        const code = section
            .split("\n")
            .filter((l) => !l.trim().startsWith("//"))
            .join("\n");
        expect(code).not.toMatch(/where\([^)]*"!="/);
        expect(section).toMatch(/status !== "done"/);
        expect(section).toMatch(/status !== "closed"/);
    });
});
