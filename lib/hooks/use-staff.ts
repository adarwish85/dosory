/**
 * Staff eligible to be ASSIGNED to something — active only, ordered by first name, and
 * deduplicated so a person with both a uid-keyed and an email-keyed staff doc appears once.
 *
 * RENAMED from `useStaff` on 2026-08-09 (§7 decision 6). A second, different `useStaff` lives
 * in use-settings.ts — the staff-MANAGEMENT list, filterable by status/roleId and NOT
 * deduplicated — and that is the one the barrel re-exports. Two same-named hooks with
 * different semantics over the same collection meant the behaviour you got depended on your
 * import path, silently. Neither is platform-scoped, so they are named for what they do.
 */
"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy, QueryConstraint } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";

export interface Staff {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    roleId: string;
    status: "active" | "inactive";
    photoURL?: string;
    isAdmin?: boolean;
}

export function useAssignableStaff() {
    const { profile } = useUserProfile();
    const [staff, setStaff] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!profile?.orgId) {
            // Deferred a microtask: a synchronous setState in an effect body trips the
            // React Compiler's cascading-render rule.
            Promise.resolve().then(() => setLoading(false));
            return;
        }

        const constraints: QueryConstraint[] = [
            where("orgId", "==", profile.orgId),
            where("status", "==", "active"),
            orderBy("firstName", "asc"),
        ];

        const q = query(collection(db, "staff"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const raw = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Staff[];
                // A person can have both a uid-keyed and an email-keyed staff doc, which
                // surfaced as duplicate entries (e.g. in the Assigned-To dropdown). Dedup by
                // the effective uid (authUid for email-keyed docs, else the doc id), preferring
                // the uid-keyed record so the assignee id stays stable.
                const byUid = new Map<string, Staff>();
                for (const s of raw) {
                    const key = (s as Staff & { authUid?: string }).authUid || s.id;
                    const existing = byUid.get(key);
                    if (!existing || (!s.id.includes("@") && existing.id.includes("@"))) {
                        byUid.set(key, s);
                    }
                }
                setStaff(Array.from(byUid.values()));
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching staff:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId]);

    return { staff, loading, error };
}
