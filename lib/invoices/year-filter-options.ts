/**
 * Year options for the invoices filter.
 *
 * The list used to be two hard-coded `<SelectItem>`s, 2025 and 2024, defaulting to 2025. That
 * kind of list is wrong the moment the calendar rolls over: on 1 January the current year is
 * simply missing from the filter, and the control silently defaults to a past year. By
 * 2026-09-23 the Invoices page offered no way to select the year it was actually in.
 *
 * Deriving from `new Date()` at render time is the whole point — there is no literal to go
 * stale. Kept as a pure function so the behaviour can be tested at any simulated date rather
 * than only at whatever year the test suite happens to run in.
 */

/** How many previous years to offer alongside the current one. */
export const YEAR_FILTER_HISTORY = 4;

/**
 * Newest first: [current, current-1, …]. The current year is always element 0, which is what
 * makes it a safe default.
 */
export function yearFilterOptions(now: Date = new Date(), history: number = YEAR_FILTER_HISTORY): number[] {
    const current = now.getFullYear();
    return Array.from({ length: history + 1 }, (_, i) => current - i);
}

/** The option a freshly-loaded filter should show. Always the year the user is actually in. */
export function defaultYearFilter(now: Date = new Date()): number {
    return now.getFullYear();
}
