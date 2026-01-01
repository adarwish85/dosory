"use client";

import { useState, useCallback } from "react";
import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc,
    orderBy,
    serverTimestamp,
    Timestamp,
    runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { FinancialPeriod } from "@/lib/types/finance";

export function useFinancialPeriods() {
    const { profile } = useUserProfile();
    const [periods, setPeriods] = useState<FinancialPeriod[]>([]);
    const [loading, setLoading] = useState(true);
    const [lockDate, setLockDate] = useState<Date | null>(null);

    const fetchPeriods = useCallback(async () => {
        if (!profile?.orgId) return;
        setLoading(true);
        try {
            // Fetch Periods History
            const q = query(
                collection(db, "financial_periods"),
                where("orgId", "==", profile.orgId),
                orderBy("endDate", "desc")
            );
            const snapshot = await getDocs(q);
            const fetchedPeriods = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as FinancialPeriod);
            setPeriods(fetchedPeriods);

            // Fetch Current Lock Date
            const settingsDoc = await getDoc(doc(db, "organizations", profile.orgId, "settings", "finance"));
            if (settingsDoc.exists() && settingsDoc.data().lockDate) {
                setLockDate(settingsDoc.data().lockDate.toDate());
            }
        } catch (error) {
            console.error("Error fetching financial periods:", error);
        } finally {
            setLoading(false);
        }
    }, [profile?.orgId]);

    const closePeriod = async (month: number, year: number) => {
        if (!profile?.orgId) throw new Error("No organization");

        // Calculate Access Dates
        // Valid for standard monthly closing.
        // Start: 1st of month
        // End: Last second of month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        const periodName = startDate.toLocaleString("default", { month: "long", year: "numeric" });
        const periodId = `${year}-${String(month).padStart(2, "0")}`; // ID: 2024-01

        try {
            await runTransaction(db, async (transaction) => {
                // 1. Create/Update Period Doc
                const periodRef = doc(db, "financial_periods", periodId);
                const periodData: Partial<FinancialPeriod> = {
                    name: periodName,
                    startDate: Timestamp.fromDate(startDate),
                    endDate: Timestamp.fromDate(endDate),
                    status: "closed",
                    closedBy: profile.uid,
                    closedAt: serverTimestamp() as Timestamp,
                    orgId: profile.orgId!,
                    workspaceId: profile.orgId!,
                    createdAt: serverTimestamp() as Timestamp,
                    updatedAt: serverTimestamp() as Timestamp,
                };
                transaction.set(periodRef, periodData, { merge: true });

                // 2. Update Global Lock Date
                // Only update if this period is LATER than current lock date (sequential closing implied, but forceful is safer)
                const settingsRef = doc(db, "organizations", profile.orgId!, "settings", "finance");
                // We assume sequential usage, but let's strictly set lockDate to max(current, thisEndDate)
                // Actually, Plan says "Period closing is irreversible". So we strictly set it.
                // If I close Jan, lockDate = Jan 31.
                // If I then close Feb, lockDate = Feb 29.
                transaction.set(settingsRef, { lockDate: Timestamp.fromDate(endDate) }, { merge: true });

                // 3. Audit Log
                const auditRef = doc(collection(db, "financial_audit_logs"));
                transaction.set(auditRef, {
                    orgId: profile.orgId!,
                    action: "update",
                    entityType: "period",
                    entityId: periodId,
                    userId: profile.uid,
                    timestamp: serverTimestamp(),
                    details: {
                        action: "close_period",
                        period: periodName,
                        lockDate: endDate,
                    },
                });
            });

            await fetchPeriods();
            return true;
        } catch (e) {
            console.error("Failed to close period:", e);
            throw e;
        }
    };

    return {
        periods,
        loading,
        lockDate,
        fetchPeriods,
        closePeriod,
    };
}
