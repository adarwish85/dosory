import type { Lead } from "@/lib/types";
import { calculateLeadScore } from "@/lib/utils/lead-score";

/**
 * BUG3 (2026-07-28): the leads page collected status + advanced filters (and even
 * persisted them in saved views and rendered active-filter badges) but never applied
 * them anywhere — `processedLeads = leads` verbatim, so results never changed.
 *
 * The status filter is now pushed into useLeads (server-side, rides the existing
 * leads(orgId,status,createdAt) index, keeps pagination counts consistent). Advanced
 * filters — arbitrary field/operator/value rows with AND/OR — cannot be composed into
 * a Firestore query, so they are applied client-side to the loaded page here.
 * Kept pure for unit testing.
 */

export type LeadFilterOperator =
    | "contains"
    | "equals"
    | "startsWith"
    | "endsWith"
    | "isEmpty"
    | "isNotEmpty"
    | "greaterThan"
    | "lessThan";

export type LeadFilterLogic = "AND" | "OR";

export interface LeadFilterCondition {
    id: string;
    field: string;
    operator: LeadFilterOperator;
    value: string;
}

function fieldValue(lead: Lead, field: string): unknown {
    // `score` is a computed column, not a stored field.
    if (field === "score") return calculateLeadScore(lead);
    return (lead as unknown as Record<string, unknown>)[field];
}

function matches(lead: Lead, f: LeadFilterCondition): boolean {
    const raw = fieldValue(lead, f.field);
    const isEmpty =
        raw === undefined ||
        raw === null ||
        (typeof raw === "string" && raw.trim() === "") ||
        (Array.isArray(raw) && raw.length === 0);

    switch (f.operator) {
        case "isEmpty":
            return isEmpty;
        case "isNotEmpty":
            return !isEmpty;
        case "greaterThan":
        case "lessThan": {
            const n = Number(raw);
            // Tolerate formatted input ("1,000", " 500 ") — the value column renders formatted.
            const target = Number(String(f.value).replace(/[,\s]/g, ""));
            if (!Number.isFinite(n) || !Number.isFinite(target)) return false;
            return f.operator === "greaterThan" ? n > target : n < target;
        }
        default: {
            // String-family operators. Arrays (tags): "contains"/"equals" test membership;
            // prefix/suffix test any element.
            const needle = f.value.toLowerCase();
            const test = (s: string) => {
                const hay = s.toLowerCase();
                switch (f.operator) {
                    case "contains":
                        return hay.includes(needle);
                    case "equals":
                        return hay === needle;
                    case "startsWith":
                        return hay.startsWith(needle);
                    case "endsWith":
                        return hay.endsWith(needle);
                    default:
                        return false;
                }
            };
            if (Array.isArray(raw)) return raw.some((el) => typeof el === "string" && test(el));
            if (raw === undefined || raw === null) return false;
            return test(String(raw));
        }
    }
}

/** A row counts as active once it has a value (or uses a no-value operator). Single source
 * of truth — the page's bulk-action guards use this too, so "active" can never diverge
 * between what filters the table and what blocks select-all-matches. */
export function hasActiveAdvancedFilters(filters: LeadFilterCondition[]): boolean {
    return filters.some((f) => f.value.trim() !== "" || ["isEmpty", "isNotEmpty"].includes(f.operator));
}

export function applyAdvancedFilters(leads: Lead[], filters: LeadFilterCondition[], logic: LeadFilterLogic): Lead[] {
    // Blank-value rows (a just-added, not-yet-filled condition) are ignored rather than
    // matching nothing — mirrors how the UI treats an unfinished filter row.
    const active = filters.filter((f) => f.value.trim() !== "" || ["isEmpty", "isNotEmpty"].includes(f.operator));
    // (kept in sync with hasActiveAdvancedFilters above)
    if (active.length === 0) return leads;
    return leads.filter((lead) =>
        logic === "AND" ? active.every((f) => matches(lead, f)) : active.some((f) => matches(lead, f))
    );
}
