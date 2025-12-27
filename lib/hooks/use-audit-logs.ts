"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";

export interface AuditLogEntry {
    id: string;
    action: string;
    targetId?: string;
    targetName?: string;
    details: any;
    performedBy: string;
    performedAt: string;
    userAgent?: string;
}

export function useAuditLogs() {
    const { profile } = useUserProfile();
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        if (profile?.role !== "superadmin") {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const logsRef = collection(db, "admin_logs");
            // Limit to last 100 logs for performance
            const q = query(logsRef, orderBy("performedAt", "desc"), limit(100));

            const snapshot = await getDocs(q);
            const logsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                performedAt: doc.data().performedAt?.toDate?.()?.toLocaleString() || "Just now",
            })) as AuditLogEntry[];

            setLogs(logsData);
        } catch (error) {
            console.error("Error fetching audit logs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [profile]);

    return { logs, loading, refetch: fetchLogs };
}
