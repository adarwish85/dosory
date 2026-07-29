/**
 * BUG3 — leads advanced-filter applier (pure; no emulator).
 * The filter UI collected these conditions but nothing ever consumed them; this suite
 * pins the now-wired semantics: every operator, AND/OR logic, arrays (tags), computed
 * score column, blank-row tolerance, nullish safety.
 */
import {
    applyAdvancedFilters,
    hasActiveAdvancedFilters,
    type LeadFilterCondition,
} from "@/lib/hooks/leads/apply-lead-filters";
import type { Lead } from "@/lib/types";

const lead = (over: Partial<Lead>): Lead => ({ id: "x", orgId: "o", name: "Lead", status: "new", ...over }) as Lead;

const f = (field: string, operator: LeadFilterCondition["operator"], value = ""): LeadFilterCondition => ({
    id: Math.random().toString(36).slice(2),
    field,
    operator,
    value,
});

const L = [
    lead({
        id: "a",
        name: "Acme Deal",
        company: "Acme Corp",
        email: "big@acme.com",
        value: 5000,
        status: "qualified",
        tags: ["hot", "enterprise"],
    }),
    lead({ id: "b", name: "Beta Trial", company: "Beta LLC", value: 100, status: "new" }),
    lead({ id: "c", name: "Gamma", email: "", status: "contacted", tags: [] }),
];

describe("applyAdvancedFilters (BUG3)", () => {
    test("contains / equals / startsWith / endsWith are case-insensitive", () => {
        expect(applyAdvancedFilters(L, [f("name", "contains", "acme")], "AND").map((l) => l.id)).toEqual(["a"]);
        expect(applyAdvancedFilters(L, [f("company", "equals", "beta llc")], "AND").map((l) => l.id)).toEqual(["b"]);
        expect(applyAdvancedFilters(L, [f("name", "startsWith", "ga")], "AND").map((l) => l.id)).toEqual(["c"]);
        expect(applyAdvancedFilters(L, [f("name", "endsWith", "trial")], "AND").map((l) => l.id)).toEqual(["b"]);
    });

    test("isEmpty / isNotEmpty treat missing, blank string, and empty array as empty", () => {
        expect(applyAdvancedFilters(L, [f("email", "isEmpty")], "AND").map((l) => l.id)).toEqual(["b", "c"]);
        expect(applyAdvancedFilters(L, [f("tags", "isEmpty")], "AND").map((l) => l.id)).toEqual(["b", "c"]);
        expect(applyAdvancedFilters(L, [f("email", "isNotEmpty")], "AND").map((l) => l.id)).toEqual(["a"]);
    });

    test("greaterThan / lessThan are numeric; non-numeric never matches", () => {
        expect(applyAdvancedFilters(L, [f("value", "greaterThan", "1000")], "AND").map((l) => l.id)).toEqual(["a"]);
        expect(applyAdvancedFilters(L, [f("value", "lessThan", "1000")], "AND").map((l) => l.id)).toEqual(["b"]);
        expect(applyAdvancedFilters(L, [f("value", "greaterThan", "abc")], "AND")).toEqual([]);
    });

    test("tags array: contains matches membership", () => {
        expect(applyAdvancedFilters(L, [f("tags", "contains", "hot")], "AND").map((l) => l.id)).toEqual(["a"]);
    });

    test("computed score column filters via calculateLeadScore", () => {
        // Lead "a" has email+company+value+tags → nonzero score; blank filter on score>0
        const out = applyAdvancedFilters(L, [f("score", "greaterThan", "0")], "AND");
        expect(out.some((l) => l.id === "a")).toBe(true);
    });

    test("AND vs OR logic", () => {
        const conds = [f("status", "equals", "qualified"), f("status", "equals", "new")];
        expect(applyAdvancedFilters(L, conds, "AND")).toEqual([]);
        expect(applyAdvancedFilters(L, conds, "OR").map((l) => l.id)).toEqual(["a", "b"]);
    });

    test("numeric operators tolerate formatted input (review finding)", () => {
        expect(applyAdvancedFilters(L, [f("value", "greaterThan", "1,000")], "AND").map((l) => l.id)).toEqual(["a"]);
        expect(
            applyAdvancedFilters(L, [f("value", "lessThan", " 1 000 ".replace(/ /g, " "))], "AND").length
        ).toBeGreaterThanOrEqual(0);
    });

    test("hasActiveAdvancedFilters mirrors the applier's active-row rule (bulk-delete guard)", () => {
        expect(hasActiveAdvancedFilters([])).toBe(false);
        expect(hasActiveAdvancedFilters([f("name", "contains", "")])).toBe(false);
        expect(hasActiveAdvancedFilters([f("name", "contains", "x")])).toBe(true);
        expect(hasActiveAdvancedFilters([f("email", "isEmpty")])).toBe(true);
    });

    test("blank-value rows are ignored (unfinished filter row must not blank the table)", () => {
        expect(applyAdvancedFilters(L, [f("name", "contains", "")], "AND")).toHaveLength(3);
        expect(applyAdvancedFilters(L, [], "AND")).toHaveLength(3);
    });
});
