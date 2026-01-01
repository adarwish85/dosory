"use client";

import { useState, useCallback } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { AuditLog } from "@/lib/types/finance";

export function useFinancialAuditLogs() {
    const { profile } = useUserProfile();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = useCallback(
        async (limitCount = 100) => {
            if (!profile?.orgId) return;
            setLoading(true);
            try {
                const q = query(
                    collection(db, "financial_audit_logs"),
                    where("orgId", "==", profile.orgId),
                    orderBy("timestamp", "desc"),
                    limit(limitCount)
                );
                const snapshot = await getDocs(q);
                const fetchedLogs = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as AuditLog[];
                setLogs(fetchedLogs);
            } catch (error) {
                console.error("Error fetching audit logs:", error);
            } finally {
                setLoading(false);
            }
        },
        [profile?.orgId]
    );

    return {
        logs,
        loading,
        fetchLogs,
    };
}
