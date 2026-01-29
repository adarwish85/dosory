"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    doc,
    // getDocs,
    // getDoc,
    QueryConstraint,
    getCountFromServer,
    getAggregateFromServer,
    sum,
    count,
    startAfter,
    QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import type { Lead, LeadStatus } from "@/lib/types";

export interface UseLeadsOptions {
    status?: LeadStatus | "all";
    assignedTo?: string;
    source?: string;
    orderByField?: "name" | "createdAt" | "value";
    orderDirection?: "asc" | "desc";
    limit?: number; // Add pagination limit
    page?: number;
    searchQuery?: string;
}

export function useLeadsData(options: UseLeadsOptions = {}) {
    const {
        status = "all",
        assignedTo,
        source,
        orderByField = "createdAt",
        orderDirection = "desc",
        limit: pageSize = 100,
        page = 1,
        searchQuery = "",
    } = options;
    const { profile, loading: profileLoading } = useUserProfile();

    // Data State
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Pagination State
    const [totalRecords, setTotalRecords] = useState(0);
    const [cursors, setCursors] = useState<Record<number, QueryDocumentSnapshot>>({}); // Store last doc of each page

    // Stats State
    const [leadStats, setLeadStats] = useState({ total: 0, totalValue: 0, starred: 0, qualified: 0 });

    // Listener version tracking to prevent stale updates
    const listenerVersionRef = useRef(0);

    // Helper: Build constraints based on filters (excluding pagination)
    const getBaseConstraints = useCallback(() => {
        if (!profile?.orgId) return [];
        const c: QueryConstraint[] = [where("orgId", "==", profile.orgId)];

        if (status !== "all") c.push(where("status", "==", status));
        if (assignedTo) c.push(where("assignedTo", "==", assignedTo));
        if (source) c.push(where("source", "==", source));

        // Search (Prefix only, Case-Insensitive)
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            c.push(where("name_lower", ">=", lowerQuery));
            c.push(where("name_lower", "<=", lowerQuery + "\uf8ff"));
        }

        return c;
    }, [profile?.orgId, status, assignedTo, source, searchQuery]);

    // Effect: Fetch Stats & Total Count
    useEffect(() => {
        if (profileLoading) return;
        let isMounted = true;
        const fetchStatsAndCount = async () => {
            if (!profile?.orgId) return;
            try {
                // 1. Aggregation for global stats
                const globalQ = query(collection(db, "leads"), where("orgId", "==", profile.orgId));

                // We'll wrap in try/catch individual parts to ensure partial success
                let globalTotal = 0;
                let globalValue = 0;

                try {
                    const aggSnap = await getAggregateFromServer(globalQ, {
                        totalCount: count(),
                        totalValue: sum("value"),
                    });
                    globalTotal = aggSnap.data().totalCount;
                    globalValue = aggSnap.data().totalValue;
                } catch (aggErr) {
                    console.warn("Aggregation failed (likely missing index), falling back to basic count:", aggErr);
                    // Fallback for count only
                    try {
                        const countSnap = await getCountFromServer(globalQ);
                        globalTotal = countSnap.data().count;
                    } catch {}
                }

                if (!isMounted) return;

                // 2. Count for Pagination
                const constraints = getBaseConstraints();
                const filterQ = query(collection(db, "leads"), ...constraints);
                const filterCountSnap = await getCountFromServer(filterQ);

                if (isMounted) {
                    setLeadStats((prev) => ({
                        ...prev,
                        total: globalTotal,
                        totalValue: globalValue,
                    }));
                    setTotalRecords(filterCountSnap.data().count);
                }
            } catch (err) {
                console.error("Error fetching stats:", err);
            }
        };

        fetchStatsAndCount();
        return () => {
            isMounted = false;
        };
    }, [profile?.orgId, profileLoading, getBaseConstraints]);

    // Effect: Fetch Paginated Data
    useEffect(() => {
        // Increment version to invalidate previous listeners
        const currentVersion = ++listenerVersionRef.current;

        console.log("📊 useLeads effect v" + currentVersion + ":", {
            profileLoading,
            orgId: profile?.orgId,
            page,
            pageSize,
            orderByField,
            orderDirection,
        });

        if (profileLoading) {
            console.log("📊 useLeads v" + currentVersion + ": Waiting for profile...");
            return;
        }

        if (!profile?.orgId) {
            console.log("📊 useLeads v" + currentVersion + ": No orgId, skipping");
            setLoading(false);
            return;
        }

        setLoading(true);

        const constraints = getBaseConstraints();
        constraints.push(orderBy(orderByField, orderDirection));

        // Pagination Logic
        if (page > 1) {
            const prevCursor = cursors[page - 1];
            if (prevCursor) {
                constraints.push(startAfter(prevCursor));
            } else {
                console.warn("useLeads v" + currentVersion + ": Missing cursor for page " + page);
            }
        }

        constraints.push(limit(pageSize));

        const q = query(collection(db, "leads"), ...constraints);
        console.log("📊 useLeads v" + currentVersion + ": Setting up listener for orgId:", profile.orgId);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                // Check if this is still the active listener
                if (listenerVersionRef.current !== currentVersion) {
                    console.log(
                        "📊 useLeads v" +
                            currentVersion +
                            ": STALE - ignoring (current is v" +
                            listenerVersionRef.current +
                            ")"
                    );
                    return;
                }

                console.log("📊 useLeads v" + currentVersion + ": Received", snapshot.docs.length, "leads");
                const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Lead[];

                // Update Cursor for the NEXT page
                if (snapshot.docs.length > 0) {
                    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
                    setCursors((prev) => ({ ...prev, [page]: lastDoc }));
                }

                setLeads(data);
                setLoading(false);
            },
            (err) => {
                // Check if this is still the active listener
                if (listenerVersionRef.current !== currentVersion) {
                    console.log("📊 useLeads v" + currentVersion + ": STALE error - ignoring");
                    return;
                }

                console.error("📊 useLeads v" + currentVersion + ": Error:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => {
            console.log("📊 useLeads v" + currentVersion + ": Cleaning up");
            unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.orgId, profileLoading, getBaseConstraints, orderByField, orderDirection, pageSize, page]);

    // Reconcile totalRecords with actual fetched leads to prevent count mismatch
    useEffect(() => {
        const currentCount = leads.length;
        const currentTotalOnPage = (page - 1) * pageSize + currentCount;

        if (currentCount < pageSize) {
            if (totalRecords !== currentTotalOnPage) {
                setTotalRecords(currentTotalOnPage);
            }
        } else if (totalRecords < currentTotalOnPage) {
            setTotalRecords(currentTotalOnPage);
        }
    }, [leads.length, pageSize, page, totalRecords]);

    return {
        leads,
        setLeads, // Exposed for optimistic updates
        loading,
        error,
        leadStats,
        setLeadStats, // Exposed for optimistic updates
        totalRecords,
        setTotalRecords, // Exposed for optimistic updates
        getBaseConstraints, // Exposed for bulk actions
    };
}

export function useLead(id: string | null) {
    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!id) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLead(null);

            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(
            doc(db, "leads", id),
            (snapshot) => {
                if (snapshot.exists()) {
                    setLead({ id: snapshot.id, ...snapshot.data() } as Lead);
                } else {
                    setLead(null);
                }
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching lead:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [id]);

    return { lead, loading, error };
}
