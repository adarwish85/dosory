"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot, addDoc, Timestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/auth-provider";
import { useUserProfile } from "@/components/hooks/use-user-profile";

export type ActivityType =
    | "invoice_paid"
    | "invoice_sent"
    | "customer_created"
    | "lead_created"
    | "lead_won"
    | "task_completed"
    | "project_created"
    | "estimate_sent"
    | "contract_signed"
    | "note_added"
    | "invoice_deleted"
    | "payment_received"
    | "project_status_changed"
    | "invoice_created"; // Added

export interface Activity {
    id: string;
    type: ActivityType;
    message: string;
    entityId?: string;
    entityType?: string;
    userId: string;
    userName?: string;
    createdAt: Timestamp;
    metadata?: Record<string, any>;
}

const ACTIVITY_ICONS: Record<ActivityType, { icon: string; color: string }> = {
    invoice_paid: { icon: "💰", color: "text-green-500" },
    invoice_sent: { icon: "📤", color: "text-blue-500" },
    customer_created: { icon: "👤", color: "text-purple-500" },
    lead_created: { icon: "🎯", color: "text-amber-500" },
    lead_won: { icon: "🏆", color: "text-green-600" },
    task_completed: { icon: "✅", color: "text-green-500" },
    project_created: { icon: "📁", color: "text-blue-600" },
    estimate_sent: { icon: "📋", color: "text-indigo-500" },
    contract_signed: { icon: "📝", color: "text-emerald-500" },
    note_added: { icon: "💬", color: "text-gray-500" },
    invoice_deleted: { icon: "🗑️", color: "text-red-500" },
    payment_received: { icon: "💵", color: "text-green-600" },
    project_status_changed: { icon: "🔄", color: "text-orange-500" },
    invoice_created: { icon: "📄", color: "text-blue-500" },
};

export function getActivityMeta(type: ActivityType) {
    return ACTIVITY_ICONS[type] || { icon: "📌", color: "text-gray-400" };
}

interface UseActivityOptions {
    limit?: number;
    enabled?: boolean;
}

export function useActivity(options: UseActivityOptions = {}) {
    const { user } = useAuth();
    const { profile } = useUserProfile(); // Use profile hook for reliable orgId
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);

    const orgId = profile?.orgId;
    const fetchLimit = options.limit || 20;
    const enabled = options.enabled ?? true;

    useEffect(() => {
        if (!enabled || !orgId) {
            setLoading(false);
            return;
        }

        const activitiesRef = collection(db, "organizations", orgId, "activities");
        const q = query(activitiesRef, orderBy("createdAt", "desc"), limit(fetchLimit));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const items: Activity[] = [];
                snapshot.forEach((doc) => {
                    items.push({ id: doc.id, ...doc.data() } as Activity);
                });
                setActivities(items);
                setLoading(false);
            },
            (error) => {
                console.error("Error loading activities:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [orgId, fetchLimit]);

    // Helper to log a new activity
    const logActivity = async (
        type: ActivityType,
        message: string,
        entityId?: string,
        entityType?: string,
        metadata?: Record<string, any>
    ) => {
        if (!orgId || !user?.uid) return;

        try {
            const activitiesRef = collection(db, "organizations", orgId, "activities");
            await addDoc(activitiesRef, {
                type,
                message,
                entityId,
                entityType,
                userId: user.uid,
                userName: user.displayName || user.email,
                createdAt: Timestamp.now(),
                metadata,
            });
        } catch (error) {
            console.error("Error logging activity:", error);
        }
    };

    return {
        activities,
        loading,
        logActivity,
    };
}
