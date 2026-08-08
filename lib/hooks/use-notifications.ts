"use client";

import { useState, useEffect, useCallback } from "react";
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    writeBatch,
    serverTimestamp,
    addDoc,
    Timestamp,
    limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { identityKeysFor } from "@/lib/utils/identity-keys";

// Notification types corresponding to business events
export type NotificationType =
    // Invoices
    | "invoice.created"
    | "invoice.paid"
    | "invoice.overdue"
    // Estimates
    | "estimate.accepted"
    | "estimate.declined"
    // Projects & Tasks
    | "task.assigned"
    | "task.status_changed"
    | "project.deadline"
    // Leads
    | "lead.created"
    | "lead.status_changed"
    // Support
    | "ticket.reply"
    | "ticket.assigned"
    | "ticket.status_changed"
    // Staff
    | "staff.join_request"
    | "staff.role_changed"
    // Platform
    | "platform_ticket.reply"
    // System
    | "system.announcement";

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    read: boolean;
    orgId: string;
    userId: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
}

// Helper to convert Firestore timestamp
const convertTimestamp = (ts: Timestamp | Date | undefined): Date => {
    if (!ts) return new Date();
    if (ts instanceof Timestamp) return ts.toDate();
    return ts;
};

/**
 * Hook to manage user notifications with real-time updates
 */
export function useNotifications() {
    const { profile, loading: profileLoading } = useUserProfile();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    // Real-time subscription to user's notifications
    useEffect(() => {
        if (profileLoading) return;

        if (!profile?.uid || !profile?.orgId) {
            Promise.resolve().then(() => setLoading(false));
            return;
        }

        // SWEEP E — notifications are addressed with `staff.id` (a lowercased email) by every
        // producer (lead assignment, task assignment, …) while this reader compared against
        // profile.uid. They never matched, so the bell was permanently empty for everyone.
        // Match the full identity set instead of rewriting historical rows.
        //
        // The orderBy is restored at the same time: it had been commented out "to avoid a
        // composite index", which silently changed the semantics — without it Firestore falls
        // back to __name__ order, so limit(50) returned an ARBITRARY 50 notifications rather
        // than the newest 50. The covering index is declared in firestore.indexes.json.
        // The `read in [true, false]` clause is also gone: it selected everything (a no-op),
        // and Firestore permits only one disjunctive clause per query, so it would now
        // conflict with the `userId in` above.
        const q = query(
            collection(db, "notifications"),
            where("orgId", "==", profile.orgId),
            where("userId", "in", identityKeysFor(profile.uid, profile.email)),
            orderBy("createdAt", "desc"),
            limit(50)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Notification[];

                // Client-side sort
                data.sort((a, b) => {
                    const dateA = a.createdAt?.getTime?.() || 0;
                    const dateB = b.createdAt?.getTime?.() || 0;
                    return dateB - dateA;
                });

                setNotifications(data);
                setUnreadCount(data.filter((n) => !n.read).length);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching notifications:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.uid, profile?.email, profile?.orgId, profileLoading]);

    // Mark a single notification as read
    const markAsRead = useCallback(async (notificationId: string): Promise<void> => {
        await updateDoc(doc(db, "notifications", notificationId), {
            read: true,
        });
    }, []);

    // Mark all notifications as read
    const markAllAsRead = useCallback(async (): Promise<void> => {
        if (!profile?.uid) return;

        const unreadNotifications = notifications.filter((n) => !n.read);
        if (unreadNotifications.length === 0) return;

        const batch = writeBatch(db);
        unreadNotifications.forEach((n) => {
            batch.update(doc(db, "notifications", n.id), { read: true });
        });
        await batch.commit();
    }, [profile?.uid, notifications]);

    return {
        notifications,
        loading,
        unreadCount,
        markAsRead,
        markAllAsRead,
    };
}

/**
 * Utility function to create a notification
 * This should be called from server actions or other hooks when events occur
 */
export async function createNotification(data: {
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    orgId: string;
    userId: string;
    metadata?: Record<string, unknown>;
}): Promise<string> {
    const docRef = await addDoc(collection(db, "notifications"), {
        ...data,
        read: false,
        createdAt: serverTimestamp(),
    });
    return docRef.id;
}

/**
 * Create notifications for multiple users
 */
export async function createBulkNotifications(
    users: { userId: string; orgId: string }[],
    data: {
        type: NotificationType;
        title: string;
        message: string;
        link?: string;
        metadata?: Record<string, unknown>;
    }
): Promise<void> {
    const batch = writeBatch(db);
    users.forEach(({ userId, orgId }) => {
        const docRef = doc(collection(db, "notifications"));
        batch.set(docRef, {
            ...data,
            userId,
            orgId,
            read: false,
            createdAt: serverTimestamp(),
        });
    });
    await batch.commit();
}
