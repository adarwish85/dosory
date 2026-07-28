import {
    collection,
    getAggregateFromServer,
    getCountFromServer,
    query,
    sum,
    where,
    type Firestore,
    type QueryConstraint,
} from "firebase/firestore";

export interface LeadStats {
    total: number;
    totalValue: number;
    starred: number;
    qualified: number;
}

/**
 * Org-scoped lead stats for the leads page QuickStatsBar.
 *
 * WHY count and sum are SEPARATE requests (the 2026-07-28 stat-cards-show-0 bug):
 * a combined aggregation `{ count(), sum("value") }` excludes every document that lacks
 * the summed field from the WHOLE aggregation — so tenants whose leads have no `value`
 * field saw TOTAL 0 while the table rendered rows. `getCountFromServer` alone counts all
 * documents; the sum runs separately and only over docs that have `value` (its correct
 * semantics). Starred/qualified are real server counts over the same org scope — the old
 * cards computed them from the current page slice, which under-counted beyond page 1.
 *
 * `extra` carries the view-own constraint (assignedTo == staffId) so the headline numbers
 * respect ownership scoping exactly like the list query.
 */
export async function fetchLeadStats(db: Firestore, orgId: string, extra: QueryConstraint[] = []): Promise<LeadStats> {
    const leads = collection(db, "leads");
    const base = [where("orgId", "==", orgId), ...extra];

    const [totalSnap, valueSnap, starredSnap, qualifiedSnap] = await Promise.all([
        getCountFromServer(query(leads, ...base)),
        getAggregateFromServer(query(leads, ...base), { totalValue: sum("value") }).catch(() => null),
        getCountFromServer(query(leads, ...base, where("isStarred", "==", true))).catch(() => null),
        getCountFromServer(query(leads, ...base, where("status", "==", "qualified"))).catch(() => null),
    ]);

    return {
        total: totalSnap.data().count,
        totalValue: valueSnap ? valueSnap.data().totalValue : 0,
        starred: starredSnap ? starredSnap.data().count : 0,
        qualified: qualifiedSnap ? qualifiedSnap.data().count : 0,
    };
}
