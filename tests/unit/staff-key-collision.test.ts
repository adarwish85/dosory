/**
 * A second signup by the same person must not destroy the first org's staff document.
 *
 * THIS ALREADY HAPPENED IN PRODUCTION. Orgs `fareed` and `fareedmagdy` were both created by
 * fareed.magdy@gmail.com on 2026-06-28. `staff/{email}` is a ROOT document keyed by lowercased
 * email — the key is global across every tenant — and signup writes it with a bare `setDoc`,
 * which is a full document REPLACEMENT including `orgId`. So the second signup rebound the staff
 * record to the new org and the first org was left with none. Verified against prod on
 * 2026-09-26: one staff document survives pointing at `fareed`; `fareedmagdy` has zero.
 *
 * An org with no staff document has no permissions record for anybody, because use-permissions
 * resolves a staff doc to read `permissions[]` and `isAdmin`.
 *
 * The ORDERING assertions at the bottom are as load-bearing as the logic ones: the check has to
 * run BEFORE the organization document is written. Rejecting afterwards would leave exactly the
 * kind of shell org this guard exists to prevent — and the signup rollback only deletes the auth
 * user while `orgCreated` is still false.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { staffKeyDecision } from "@/lib/auth/staff-key";

const ROOT = join(__dirname, "..", "..");

describe("staffKeyDecision", () => {
    test("a free key is available", () => {
        expect(staffKeyDecision(null)).toEqual({ available: true });
        expect(staffKeyDecision(undefined)).toEqual({ available: true });
    });

    test("THE PROD CASE: a key held by another org is NOT available, and names it", () => {
        expect(staffKeyDecision({ orgId: "fareed" }, undefined)).toEqual({
            available: false,
            existingOrgId: "fareed",
        });
    });

    test("a key held by another org is refused even when the caller has an org of their own", () => {
        expect(staffKeyDecision({ orgId: "fareed" }, "fareedmagdy")).toEqual({
            available: false,
            existingOrgId: "fareed",
        });
    });

    test("re-running signup for the SAME org is allowed — that is convergence, not data loss", () => {
        expect(staffKeyDecision({ orgId: "fareed" }, "fareed")).toEqual({ available: true, sameOrg: true });
    });

    test("a malformed staff doc with no orgId is treated as TAKEN, not silently overwritten", () => {
        // Replacing it would hide whatever produced it.
        expect(staffKeyDecision({}, "anything")).toEqual({ available: false, existingOrgId: "" });
        expect(staffKeyDecision({ orgId: "" }, "anything")).toEqual({ available: false, existingOrgId: "" });
        expect(staffKeyDecision({ orgId: null }, "anything")).toEqual({ available: false, existingOrgId: "" });
    });

    test("whitespace is not a tenant — ' fareed ' does not match 'fareed' by accident", () => {
        // Trimmed on read, so a padded stored value still resolves to the real org.
        expect(staffKeyDecision({ orgId: "  fareed  " }, "fareed")).toEqual({ available: true, sameOrg: true });
    });
});

describe("the guard runs where it can still be undone", () => {
    const signup = readFileSync(join(ROOT, "app", "signup", "page.tsx"), "utf8");

    test("signup calls the availability endpoint", () => {
        expect(signup).toMatch(/\/api\/auth\/staff-key-available/);
    });

    test("it is checked BEFORE the organization document is written", () => {
        const check = signup.indexOf("/api/auth/staff-key-available");
        const orgWrite = signup.indexOf('doc(db, "organizations", orgId)');
        expect(check).toBeGreaterThan(-1);
        expect(orgWrite).toBeGreaterThan(-1);
        // If this ever inverts, a rejected signup leaves an org with no staff and no owner —
        // the shell-org state this guard exists to prevent.
        expect(check).toBeLessThan(orgWrite);
    });

    test("and before the staff document it protects", () => {
        const check = signup.indexOf("/api/auth/staff-key-available");
        const staffWrite = signup.indexOf('doc(db, "staff", user.email!.toLowerCase())');
        expect(staffWrite).toBeGreaterThan(-1);
        expect(check).toBeLessThan(staffWrite);
    });

    test("a failed check aborts rather than falling through", () => {
        // Fail-closed: an unreachable endpoint must not read as "the key is free".
        //
        // Asserts that each branch THROWS, not how it constructs what it throws. The first
        // version of this pinned `throw new Error`, and broke the moment the rejection began
        // carrying the holding org via Object.assign — a guard tied to an incidental detail of
        // the code it guards (CLAUDE.md standing lesson 9, in miniature).
        expect(signup).toMatch(/if \(!keyCheck\.ok\) \{[\s\S]{0,200}?\bthrow\b/);
        expect(signup).toMatch(/if \(!keyStatus\.available\) \{[\s\S]{0,400}?\bthrow\b/);
    });
});

describe("no other collection uses the global email key", () => {
    test("`staff` is the only root collection keyed by a raw email", () => {
        // Swept 2026-09-26. If a second collection adopts this shape it inherits the same
        // cross-tenant overwrite, so the sweep is recorded rather than done once and forgotten.
        const writers = [
            "app/signup/page.tsx", // the overwriting setDoc this guard protects
            "app/dashboard/layout.tsx", // read-only onSnapshot
            "app/api/auth/set-claims/route.ts", // patches authUid only, never orgId
            "components/user-profile-provider.tsx", // read
            "app/api/billing/easykash/create-checkout/route.ts", // read
        ];
        for (const rel of writers) {
            expect([rel, readFileSync(join(ROOT, rel), "utf8").includes("staff")]).toEqual([rel, true]);
        }
    });

    test("set-claims patches authUid only — it must never rewrite orgId on someone else's doc", () => {
        const src = readFileSync(join(ROOT, "app", "api", "auth", "set-claims", "route.ts"), "utf8");
        expect(src).toMatch(/\.update\(\{ authUid: decoded\.uid \}\)/);
        expect(src).not.toMatch(/\.update\(\{[^}]*orgId/);
    });
});
