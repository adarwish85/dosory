// Firestore data hooks for Activities
// Real-time listeners with CRUD operations

"use client";

import { useState, useEffect } from "react";
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    Timestamp,
    QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import type { Activity, ActivityType, ActivityOutcome } from "@/lib/types";
import type { ActivityFormData } from "@/lib/schemas";

// ============================================
// useActivities Hook
// ============================================

interface UseActivitiesOptions {
    type?: ActivityType | "all";
    outcome?: ActivityOutcome | "all";
    relatedToType?: "lead" | "customer";
    relatedToId?: string;
}

export function useActivities(options: UseActivitiesOptions = {}) {
    const { type = "all", outcome = "all", relatedToType, relatedToId } = options;
    const { profile } = useUserProfile();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!profile?.orgId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(false);
            return;
        }

        // If relatedToId is provided, we filter by it
        if (!relatedToId) {
            setActivities([]);
            setLoading(false);
            return;
        }

        const constraints: QueryConstraint[] = [
            where("orgId", "==", profile.orgId),
            where("relatedTo.id", "==", relatedToId),
        ];

        if (relatedToType) {
            constraints.push(where("relatedTo.type", "==", relatedToType));
        }

        if (type !== "all") {
            constraints.push(where("type", "==", type));
        }

        if (outcome !== "all") {
            constraints.push(where("outcome", "==", outcome));
        }

        constraints.push(orderBy("dateTime", "desc"));

        const q = query(collection(db, "activities"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((d) => ({
                    id: d.id,
                    ...d.data(),
                })) as Activity[];
                setActivities(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching activities:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, type, outcome, relatedToType, relatedToId]);

    const createActivity = async (
        data: ActivityFormData,
        relatedTo: { type: "lead" | "customer"; id: string }
    ): Promise<string> => {
        if (!profile?.orgId) throw new Error("No organization");

        const docRef = await addDoc(collection(db, "activities"), {
            ...data,
            dateTime: Timestamp.fromDate(data.dateTime),
            relatedTo,
            orgId: profile.orgId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: profile.uid,
        });

        return docRef.id;
    };

    const updateActivity = async (id: string, data: Partial<ActivityFormData>): Promise<void> => {
        const updateData: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };
        if (data.dateTime) updateData.dateTime = Timestamp.fromDate(data.dateTime);
        await updateDoc(doc(db, "activities", id), updateData);
    };

    const deleteActivity = async (id: string): Promise<void> => {
        await deleteDoc(doc(db, "activities", id));
    };

    // Calculate activity stats
    const activityStats = activities.reduce(
        (acc, act) => {
            acc[act.type] = (acc[act.type] || 0) + 1;
            acc[act.outcome] = (acc[act.outcome] || 0) + 1;
            acc.total++;
            return acc;
        },
        { total: 0 } as Record<string, number>
    );

    return {
        activities,
        loading,
        error,
        activityStats,
        createActivity,
        updateActivity,
        deleteActivity,
    };
}
