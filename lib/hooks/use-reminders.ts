"use client";

import { useState, useEffect, useCallback } from "react";
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    addDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    Timestamp,
    QueryConstraint,
    updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { Reminder } from "@/lib/types";
import { ReminderFormData } from "@/lib/schemas";
import { createNotification } from "@/lib/hooks/use-notifications";

interface UseRemindersOptions {
    relatedTo?: { type: string; id: string };
    assignedTo?: string;
}

export function useReminders(options: UseRemindersOptions = {}) {
    const { relatedTo, assignedTo } = options;
    const { profile } = useUserProfile();
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!profile?.orgId) {
            setLoading(false);
            return;
        }

        const constraints: QueryConstraint[] = [where("orgId", "==", profile.orgId)];

        if (relatedTo) {
            constraints.push(where("relatedTo.id", "==", relatedTo.id));
            if (relatedTo.type) {
                constraints.push(where("relatedTo.type", "==", relatedTo.type));
            }
        }

        if (assignedTo) {
            constraints.push(where("assignedTo", "==", assignedTo));
        }

        // Order by date ascending (soonest first)
        constraints.push(orderBy("date", "asc"));

        const q = query(collection(db, "reminders"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Reminder[];
                setReminders(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching reminders:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, relatedTo?.id, relatedTo?.type, assignedTo]);

    const createReminder = useCallback(
        async (data: ReminderFormData) => {
            if (!profile?.orgId) throw new Error("No organization");

            const docRef = await addDoc(collection(db, "reminders"), {
                ...data,
                date: Timestamp.fromDate(data.date),
                isRead: false,
                emailSent: false,
                orgId: profile.orgId,
                createdBy: profile.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // If assigned to someone else, notify them?
            // Usually reminders ARE the notification. But maybe an immediate "You have a new reminder set" note?
            // The logic implies the system will notify them AT that time.
            // But we can verify if we need to schedule valid notification.
            // For now, just saving to Firestore.

            return docRef.id;
        },
        [profile?.orgId, profile?.uid]
    );

    const deleteReminder = useCallback(async (id: string) => {
        await deleteDoc(doc(db, "reminders", id));
    }, []);

    const updateReminder = useCallback(async (id: string, data: Partial<ReminderFormData>) => {
        const updateData: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };
        if (data.date) updateData.date = Timestamp.fromDate(data.date);
        await updateDoc(doc(db, "reminders", id), updateData);
    }, []);

    return {
        reminders,
        loading,
        error,
        createReminder,
        deleteReminder,
        updateReminder,
    };
}
