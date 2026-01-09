"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, query, where, orderBy, onSnapshot, Timestamp, QueryConstraint } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";

export interface Payment {
    id: string;
    invoiceId: string;
    invoiceNumber: string;
    customerId: string;
    customerName: string;
    amount: number;
    paymentMode: string;
    date: Timestamp;
    note?: string;
    orgId: string;
    createdAt: Timestamp;
    createdBy: string;
}

interface UsePaymentsOptions {
    customerId?: string;
    startDate?: Date;
    endDate?: Date;
    paymentMode?: string;
    limit?: number;
}

export function usePayments(options: UsePaymentsOptions = {}) {
    const { customerId, startDate, endDate, paymentMode } = options;
    const { profile } = useUserProfile();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!profile?.orgId) {
            console.log("usePayments: No orgId, skipping query", { profile });
            setLoading(false);
            return;
        }

        console.log("usePayments: Building query with orgId:", profile.orgId);

        const constraints: QueryConstraint[] = [where("orgId", "==", profile.orgId), orderBy("date", "desc")];

        if (customerId && customerId !== "undefined") {
            constraints.push(where("customerId", "==", customerId));
        }

        if (paymentMode) {
            constraints.push(where("paymentMode", "==", paymentMode));
        }

        if (startDate instanceof Date && !isNaN(startDate.getTime())) {
            constraints.push(where("date", ">=", Timestamp.fromDate(startDate)));
        }

        if (endDate instanceof Date && !isNaN(endDate.getTime())) {
            constraints.push(where("date", "<=", Timestamp.fromDate(endDate)));
        }

        const q = query(collection(db, "payments"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Payment[];
                setPayments(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching payments:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, customerId, startDate, endDate, paymentMode]);

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
        payments,
        loading,
        error,
        totalRevenue,
    };
}
