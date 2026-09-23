/**
 * The invoices year filter must always offer the year the user is actually in.
 *
 * It shipped as two literals — 2025 and 2024, defaulting to 2025 — so from 1 January 2026 the
 * current year was not selectable at all, and the filter defaulted to a year in the past. Any
 * hard-coded year list has that property: it is correct until the calendar moves.
 *
 * Both halves are asserted on purpose. Testing the helper alone would stay green if the
 * component kept its literals and never called it (CLAUDE.md standing lesson 9: a guard that
 * can only fail in one direction blesses everything written differently), so the source of the
 * component is checked too.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { defaultYearFilter, yearFilterOptions, YEAR_FILTER_HISTORY } from "@/lib/invoices/year-filter-options";

const HEADER = join(__dirname, "..", "..", "components", "dashboard", "invoices", "invoice-header.tsx");

describe("yearFilterOptions", () => {
    test("includes the CURRENT year — the assertion a hard-coded list fails", () => {
        expect(yearFilterOptions()).toContain(new Date().getFullYear());
    });

    test("the current year is first, so it is the natural default", () => {
        const now = new Date("2031-03-04T00:00:00Z");
        expect(yearFilterOptions(now)[0]).toBe(2031);
        expect(defaultYearFilter(now)).toBe(2031);
        expect(yearFilterOptions(now)).toContain(defaultYearFilter(now));
    });

    test("offers recent history, newest first, with no gaps or duplicates", () => {
        const opts = yearFilterOptions(new Date("2026-09-23T00:00:00Z"));
        expect(opts).toEqual([2026, 2025, 2024, 2023, 2022]);
        expect(opts).toHaveLength(YEAR_FILTER_HISTORY + 1);
        expect(new Set(opts).size).toBe(opts.length);
    });

    test("still holds at a year-boundary instant, when a stale list hurts most", () => {
        // One second into the new year, local time.
        const newYear = new Date(2030, 0, 1, 0, 0, 1);
        expect(yearFilterOptions(newYear)[0]).toBe(2030);
        expect(defaultYearFilter(newYear)).toBe(2030);
    });

    test("never offers a future year", () => {
        const now = new Date("2026-09-23T00:00:00Z");
        expect(Math.max(...yearFilterOptions(now))).toBe(2026);
    });
});

describe("the invoices header actually uses the helper", () => {
    const src = readFileSync(HEADER, "utf8");

    test("no hard-coded year literal survives in the component", () => {
        const literals = (src.match(/\b(19|20)\d{2}\b/g) || []).filter((y) => !/^19/.test(y));
        expect(literals).toEqual([]);
    });

    test("it builds the options and the default from the helper", () => {
        expect(src).toMatch(/yearFilterOptions\(\)\.map\(/);
        expect(src).toMatch(/defaultValue=\{String\(defaultYearFilter\(\)\)\}/);
        expect(src).toMatch(/from "@\/lib\/invoices\/year-filter-options"/);
    });
});
