"use client";

import { useState, useCallback, useEffect } from "react";
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    startAfter,
    DocumentData,
    QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { JournalEntry } from "@/lib/types/finance";

export function useJournalEntries() {
    const { profile } = useUserProfile();
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

    const fetchEntries = useCallback(
        async (reset = false) => {
            if (!profile?.orgId) return;
            setLoading(true);
            try {
                let q = query(
                    collection(db, "journal_entries"),
                    where("orgId", "==", profile.orgId),
                    orderBy("date", "desc"),
                    limit(50)
                );

                if (!reset && lastDoc) {
                    q = query(q, startAfter(lastDoc));
                }

                const snapshot = await getDocs(q);
                const fetchedEntries = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as JournalEntry[];

                setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);

                if (reset) {
                    setEntries(fetchedEntries);
                } else {
                    setEntries((prev) => [...prev, ...fetchedEntries]);
                }
            } catch (error) {
                console.error("Error fetching journal entries:", error);
            } finally {
                setLoading(false);
            }
        },
        [profile?.orgId, lastDoc]
    );

    useEffect(() => {
        // Initial load
        if (profile?.orgId) {
            fetchEntries(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.orgId]);

    return {
        entries,
        loading,
        fetchEntries,
    };
}
