"use client";

import { useState, useEffect, useCallback } from "react";
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    addDoc,
    updateDoc,
    writeBatch,
    serverTimestamp,
    limit,
    QueryConstraint
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import type { Notification } from "@/lib/types";

export function useNotifications() {
    const { profile } = useUserProfile();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!profile?.orgId || !profile?.uid) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, "notifications"),
            where("orgId", "==", profile.orgId),
            where("userId", "==", profile.uid),
            orderBy("createdAt", "desc"),
            limit(20) // Limit to last 20 for performance
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Notification[];

            setNotifications(data);
            setUnreadCount(data.filter(n => !n.read).length);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.orgId, profile?.uid]);

    const markAsRead = useCallback(async (id: string) => {
        if (!profile?.orgId) return;
        await updateDoc(doc(db, "notifications", id), {
            read: true,
            updatedAt: serverTimestamp()
        });
    }, [profile?.orgId]);

    const markAllAsRead = useCallback(async () => {
        if (!profile?.orgId || notifications.length === 0) return;

        const batch = writeBatch(db);
        const unread = notifications.filter(n => !n.read);

        unread.forEach(n => {
            batch.update(doc(db, "notifications", n.id), {
                read: true,
                updatedAt: serverTimestamp()
            });
        });

        if (unread.length > 0) {
            await batch.commit();
        }
    }, [profile?.orgId, notifications]);

    // Helper to create a notification (usually done server-side, but good for testing)
    const createNotification = useCallback(async (
        userId: string,
        title: string,
        message: string,
        type: "info" | "success" | "warning" | "error" = "info",
        link?: string
    ) => {
        if (!profile?.orgId) return;

        await addDoc(collection(db, "notifications"), {
            orgId: profile.orgId,
            userId,
            title,
            message,
            type,
            link,
            read: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: profile.uid
        });
    }, [profile?.orgId, profile?.uid]);

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        createNotification
    };
}
