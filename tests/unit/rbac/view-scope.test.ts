import { hasPermission, canAccessModule, getViewScope } from "@/lib/rbac/view-scope";

describe("view-scope resolver", () => {
    describe("getViewScope", () => {
        it("admins always resolve to global", () => {
            expect(getViewScope([], true, "leads")).toBe("global");
        });
        it("view-global grants global", () => {
            expect(getViewScope(["leads-view-global"], false, "leads")).toBe("global");
        });
        it("view-own only grants own", () => {
            expect(getViewScope(["leads-view-own"], false, "leads")).toBe("own");
        });
        it("global wins when both are present", () => {
            expect(getViewScope(["leads-view-own", "leads-view-global"], false, "leads")).toBe("global");
        });
        it("neither grants none", () => {
            expect(getViewScope(["customers-view-global"], false, "leads")).toBe("none");
        });
        it("is module-scoped (no cross-module leakage)", () => {
            expect(getViewScope(["invoices-view-global"], false, "leads")).toBe("none");
        });
    });

    describe("canAccessModule (regression: bare `${module}-view` never existed)", () => {
        it("accepts view-own", () => {
            expect(canAccessModule(["leads-view-own"], false, "leads")).toBe(true);
        });
        it("accepts view-global", () => {
            expect(canAccessModule(["leads-view-global"], false, "leads")).toBe(true);
        });
        it("admins always pass", () => {
            expect(canAccessModule([], true, "anything")).toBe(true);
        });
        it("denies when the user has no view code for the module", () => {
            expect(canAccessModule(["invoices-view-global"], false, "leads")).toBe(false);
        });
        it("does NOT match a bare `${module}-view` code (the old dead check)", () => {
            expect(canAccessModule(["leads-view"], false, "leads")).toBe(false);
        });
    });

    describe("hasPermission", () => {
        it("admins pass any code", () => {
            expect(hasPermission([], true, "leads-delete")).toBe(true);
        });
        it("matches an exact code", () => {
            expect(hasPermission(["leads-delete"], false, "leads-delete")).toBe(true);
        });
        it("denies a missing code", () => {
            expect(hasPermission(["leads-view-own"], false, "leads-delete")).toBe(false);
        });
    });
});
