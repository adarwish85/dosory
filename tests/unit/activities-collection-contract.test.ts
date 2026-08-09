/**
 * ACTIVITIES — two collections, two meanings, pinned apart.
 *
 * `activities` names TWO unrelated things in this codebase, which is exactly how the Today
 * feed ended up reading a collection nothing relevant ever wrote:
 *
 *   AUDIT LOG   organizations/{orgId}/activities
 *               written by lib/hooks/use-activity.ts  logActivity(type, message, …)
 *               shape: { type, message, entityId, entityType, userId, userName, createdAt }
 *               org-scoped BY PATH — these documents carry no orgId field.
 *
 *   CRM ENTITY  activities  (root)
 *               written by lib/hooks/use-activities.ts  createActivity(data, relatedTo)
 *               shape: { type, subject, dateTime, outcome, relatedTo:{type,id}, orgId }
 *               a scheduled call/meeting against a lead or customer, with its own CRUD UI.
 *
 * The 2026-08-09 audit found ROOT = 0 documents and the SUBCOLLECTION = 35 across 6 orgs, so
 * nothing needed migrating — but both collections are live code paths and must stay separate.
 * Copying one into the other would have corrupted the audit feed with meeting records.
 *
 * If you are adding an activity surface and this fails: decide which of the two you mean.
 */
import { readFileSync } from "fs";
import { join } from "path";

const REPO = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(REPO, p), "utf8");
const codeOf = (p: string) =>
    read(p)
        .split("\n")
        .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"))
        .join("\n");

describe("audit log — organizations/{orgId}/activities", () => {
    test("logActivity writes to the subcollection", () => {
        const src = codeOf("lib/hooks/use-activity.ts");
        expect(src).toMatch(/collection\(db, "organizations", orgId, "activities"\)/);
        expect(src).not.toMatch(/collection\(db, "activities"\)/);
    });

    test("the Today feed READS the same subcollection the audit log writes", () => {
        const today = codeOf("lib/services/today-service.ts");
        const fn = today.slice(today.indexOf("private async getActivityFeed"));
        const body = fn.slice(0, fn.indexOf("\n    }"));
        expect(body).toMatch(/collection\(db, "organizations", orgId, "activities"\)/);
        expect(body).not.toMatch(/collection\(db, "activities"\)/);
    });

    test("the Today feed does NOT filter the subcollection by orgId", () => {
        // It is org-scoped by path; those documents have no orgId field, so a where("orgId")
        // would match nothing — the silent-empty shape all over again.
        const today = codeOf("lib/services/today-service.ts");
        const fn = today.slice(today.indexOf("private async getActivityFeed"));
        const body = fn.slice(0, fn.indexOf("\n    }"));
        expect(body).not.toMatch(/where\("orgId"/);
    });

    test("the feed maps the fields logActivity actually writes", () => {
        // It previously read data.actorName / data.action / data.targetName — none of which
        // logActivity has ever written, so every row would have rendered its fallbacks.
        const today = codeOf("lib/services/today-service.ts");
        const fn = today.slice(today.indexOf("private async getActivityFeed"));
        const body = fn.slice(0, fn.indexOf("\n    }"));
        expect(body).toMatch(/data\.userName/);
        expect(body).toMatch(/data\.message/);
        expect(body).not.toMatch(/data\.actorName/);
        expect(body).not.toMatch(/data\.targetName/);
    });
});

describe("CRM activity entity — root `activities`", () => {
    test("createActivity still writes the ROOT collection (it is a different entity)", () => {
        const src = codeOf("lib/hooks/use-activities.ts");
        expect(src).toMatch(/collection\(db, "activities"\)/);
        expect(src).not.toMatch(/collection\(db, "organizations"/);
    });

    test("it links to its subject via relatedTo, and readers filter on that", () => {
        expect(codeOf("lib/hooks/use-activities.ts")).toMatch(/relatedTo/);
        // The customer sidebar badge must use relatedTo.id, not a top-level customerId that
        // the entity does not have.
        expect(codeOf("components/dashboard/customers/customer-context.tsx")).toMatch(
            /\{ key: "activities", collection: "activities", customerField: "relatedTo\.id", relatedType: "customer" \}/
        );
    });
});

describe("the two stores never cross", () => {
    test("no file reads the root collection expecting audit-log fields", () => {
        // An audit-shaped read (userName/message) against root `activities` is the bug this
        // whole test exists to prevent.
        for (const f of ["lib/services/today-service.ts", "lib/hooks/use-activity.ts"]) {
            const src = codeOf(f);
            const readsRoot = /collection\(db, "activities"\)/.test(src);
            expect(readsRoot).toBe(false);
        }
    });
});
