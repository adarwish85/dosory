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
    deleteDoc,
    getDoc,
    serverTimestamp,
    Timestamp,
    QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import type { Expense, ExpenseCategory, Subscription, SubscriptionStatus } from "@/lib/types";
import type { ExpenseFormData, SubscriptionFormData } from "@/lib/schemas";

// ============================================
// useExpenses Hook
// ============================================

interface UseExpensesOptions {
    categoryId?: string;
    customerId?: string;
    projectId?: string;
    billable?: boolean;
    orderByField?: "date" | "amount" | "createdAt";
    orderDirection?: "asc" | "desc";
}

export function useExpenses(options: UseExpensesOptions = {}) {
    const { categoryId, customerId, projectId, billable, orderByField = "date", orderDirection = "desc" } = options;
    const { profile } = useUserProfile();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!profile?.orgId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(false);
            return;
        }

        const constraints: QueryConstraint[] = [where("orgId", "==", profile.orgId)];

        if (categoryId) {
            constraints.push(where("categoryId", "==", categoryId));
        }

        if (customerId) {
            constraints.push(where("customerId", "==", customerId));
        }

        if (projectId) {
            constraints.push(where("projectId", "==", projectId));
        }

        if (billable !== undefined && billable !== null) {
            constraints.push(where("billable", "==", billable));
        }

        constraints.push(orderBy(orderByField, orderDirection || "desc"));

        const q = query(collection(db, "expenses"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Expense[];
                setExpenses(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching expenses:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, categoryId, customerId, projectId, billable, orderByField, orderDirection]);

    const createExpense = useCallback(
        async (data: ExpenseFormData): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            // Get category name
            const categoryDoc = await getDoc(doc(db, "expenseCategories", data.categoryId));
            const categoryName = categoryDoc.exists() ? categoryDoc.data().name : "Unknown";

            // Calculate tax amount
            let taxAmount = 0;
            let taxRate = 0;
            if (data.taxId) {
                const taxDoc = await getDoc(doc(db, "taxes", data.taxId));
                if (taxDoc.exists()) {
                    taxRate = taxDoc.data().rate;
                    taxAmount = data.amount * (taxRate / 100);
                }
            }

            const docRef = await addDoc(collection(db, "expenses"), {
                ...data,
                categoryName,
                taxRate,
                taxAmount,
                date: Timestamp.fromDate(data.date),
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            return docRef.id;
        },
        [profile]
    );

    const updateExpense = useCallback(async (id: string, data: Partial<ExpenseFormData>): Promise<void> => {
        const updateData: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };

        if (data.date) updateData.date = Timestamp.fromDate(data.date);

        await updateDoc(doc(db, "expenses", id), updateData);
    }, []);

    const deleteExpense = useCallback(async (id: string): Promise<void> => {
        await deleteDoc(doc(db, "expenses", id));
    }, []);

    // Calculate expense totals
    const expenseStats = expenses.reduce(
        (acc, exp) => {
            acc.total += exp.amount;
            acc.count++;
            if (exp.billable) {
                acc.billable += exp.amount;
            } else {
                acc.nonBillable += exp.amount;
            }
            return acc;
        },
        { total: 0, count: 0, billable: 0, nonBillable: 0 }
    );

    return {
        expenses,
        loading,
        error,
        expenseStats,
        createExpense,
        updateExpense,
        deleteExpense,
    };
}

// ============================================
// useExpenseCategories Hook
// ============================================

export function useExpenseCategories() {
    const { profile } = useUserProfile();
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.orgId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, "expenseCategories"),
            where("orgId", "==", profile.orgId),
            orderBy("name", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as ExpenseCategory[];
            setCategories(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.orgId]);

    return { categories, loading };
}

// ============================================
// useSubscriptions Hook
// ============================================

interface UseSubscriptionsOptions {
    status?: SubscriptionStatus | "all";
    customerId?: string;
}

export function useSubscriptions(options: UseSubscriptionsOptions = {}) {
    const { status = "all", customerId } = options;
    const { profile } = useUserProfile();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!profile?.orgId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(false);
            return;
        }

        const constraints: QueryConstraint[] = [where("orgId", "==", profile.orgId)];

        if (status !== "all") {
            constraints.push(where("status", "==", status));
        }

        if (customerId) {
            constraints.push(where("customerId", "==", customerId));
        }

        constraints.push(orderBy("createdAt", "desc"));

        const q = query(collection(db, "subscriptions"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Subscription[];
                setSubscriptions(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching subscriptions:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, status, customerId]);

    const createSubscription = useCallback(
        async (data: SubscriptionFormData): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            // Get customer name
            const customerDoc = await getDoc(doc(db, "customers", data.customerId));
            const customerName = customerDoc.exists() ? customerDoc.data().company : "Unknown Customer";

            // Calculate total amount
            const amount = data.items.reduce((sum, item) => sum + item.amount, 0);

            // Calculate next billing date
            const startDate = Timestamp.fromDate(data.startDate);
            const nextBillingDate = startDate; // Initial billing is on start date

            const docRef = await addDoc(collection(db, "subscriptions"), {
                ...data,
                customerName,
                amount,
                status: "active",
                startDate,
                nextBillingDate,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            return docRef.id;
        },
        [profile]
    );

    const updateSubscription = useCallback(async (id: string, data: Partial<SubscriptionFormData>): Promise<void> => {
        const updateData: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };

        if (data.startDate) updateData.startDate = Timestamp.fromDate(data.startDate);

        await updateDoc(doc(db, "subscriptions", id), updateData);
    }, []);

    const cancelSubscription = useCallback(async (id: string): Promise<void> => {
        await updateDoc(doc(db, "subscriptions", id), {
            status: "cancelled",
            updatedAt: serverTimestamp(),
        });
    }, []);

    const pauseSubscription = useCallback(async (id: string): Promise<void> => {
        await updateDoc(doc(db, "subscriptions", id), {
            status: "paused",
            updatedAt: serverTimestamp(),
        });
    }, []);

    const resumeSubscription = useCallback(async (id: string): Promise<void> => {
        await updateDoc(doc(db, "subscriptions", id), {
            status: "active",
            updatedAt: serverTimestamp(),
        });
    }, []);

    // Calculate subscription stats
    const subscriptionStats = subscriptions.reduce(
        (acc, sub) => {
            acc[sub.status] = (acc[sub.status] || 0) + 1;
            acc.total++;
            if (sub.status === "active") {
                acc.mrr += sub.amount;
            }
            return acc;
        },
        { total: 0, mrr: 0 } as Record<string, number>
    );

    return {
        subscriptions,
        loading,
        error,
        subscriptionStats,
        createSubscription,
        updateSubscription,
        cancelSubscription,
        pauseSubscription,
        resumeSubscription,
    };
}
