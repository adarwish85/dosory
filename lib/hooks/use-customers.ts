// Firestore data hooks for Customers
// Real-time listeners with CRUD operations

"use client";

import { useState, useEffect, useCallback } from "react";
import {
    collection,
    query,
    where,
    orderBy,
    limit,
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
import { useActivity } from "@/lib/hooks/use-activity";
import type { Customer, Contact } from "@/lib/types";
import type { CustomerFormData, ContactFormData } from "@/lib/schemas";

// ============================================
// useCustomers Hook
// ============================================

interface UseCustomersOptions {
    status?: "active" | "inactive" | "archived" | "all";
    orderByField?: "company" | "createdAt";
    orderDirection?: "asc" | "desc";
    limit?: number; // Add pagination limit
}

export function useCustomers(options: UseCustomersOptions = {}) {
    const {
        status = "all",
        orderByField = "company",
        orderDirection = "asc",
        limit: queryLimit = 100 // Default to 100 for performance
    } = options;
    const { profile } = useUserProfile();
    const { logActivity } = useActivity({ enabled: false });
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!profile?.orgId) {
            setLoading(false);
            return;
        }

        const constraints: QueryConstraint[] = [
            where("orgId", "==", profile.orgId),
        ];

        if (status !== "all") {
            constraints.push(where("status", "==", status));
        }

        constraints.push(orderBy(orderByField, orderDirection));
        constraints.push(limit(queryLimit)); // Add limit for performance

        const q = query(collection(db, "customers"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Customer[];
                setCustomers(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching customers:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, status, orderByField, orderDirection, queryLimit]);

    const createCustomer = useCallback(
        async (data: CustomerFormData): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            const docRef = await addDoc(collection(db, "customers"), {
                ...data,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            // Trigger onboarding step completion for first record
            try {
                const onboardingRef = doc(db, "users", profile.uid, "onboarding", "state");
                await updateDoc(onboardingRef, { "steps.firstRecord": true });
            } catch (e) {
                // Silently fail if onboarding doesn't exist
            }

            // Log activity
            if (logActivity) {
                await logActivity("customer_created", `Created customer ${data.company}`, docRef.id, "customer");
            }

            return docRef.id;
        },
        [profile?.orgId, profile?.uid, logActivity]
    );

    const updateCustomer = useCallback(
        async (id: string, data: Partial<CustomerFormData>): Promise<void> => {
            await updateDoc(doc(db, "customers", id), {
                ...data,
                updatedAt: serverTimestamp(),
            });
        },
        []
    );

    const deleteCustomer = useCallback(async (id: string): Promise<void> => {
        await deleteDoc(doc(db, "customers", id));
    }, []);

    return {
        customers,
        loading,
        error,
        createCustomer,
        updateCustomer,
        deleteCustomer,
    };
}

// ============================================
// useCustomer Hook (single customer)
// ============================================

export function useCustomer(id: string | null) {
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!id) {
            setCustomer(null);
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(
            doc(db, "customers", id),
            (snapshot) => {
                if (snapshot.exists()) {
                    setCustomer({ id: snapshot.id, ...snapshot.data() } as Customer);
                } else {
                    setCustomer(null);
                }
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching customer:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [id]);

    return { customer, loading, error };
}

// ============================================
// useContacts Hook
// ============================================

interface UseContactsOptions {
    customerId?: string;
}

export function useContacts(options: UseContactsOptions = {}) {
    const { customerId } = options;
    const { profile } = useUserProfile();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!profile?.orgId) {
            setLoading(false);
            return;
        }

        const constraints: QueryConstraint[] = [
            where("orgId", "==", profile.orgId),
        ];

        if (customerId) {
            constraints.push(where("customerId", "==", customerId));
        }

        // constraints.push(orderBy("lastName", "asc")); // Removed to avoid index requirement

        const q = query(collection(db, "contacts"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Contact[];

                // Sort client-side
                data.sort((a, b) => (a.lastName || "").localeCompare(b.lastName || ""));

                setContacts(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching contacts:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, customerId]);

    const createContact = useCallback(
        async (data: ContactFormData): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            const docRef = await addDoc(collection(db, "contacts"), {
                ...data,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            return docRef.id;
        },
        [profile?.orgId, profile?.uid]
    );

    const updateContact = useCallback(
        async (id: string, data: Partial<ContactFormData>): Promise<void> => {
            await updateDoc(doc(db, "contacts", id), {
                ...data,
                updatedAt: serverTimestamp(),
            });
        },
        []
    );

    const deleteContact = useCallback(async (id: string): Promise<void> => {
        await deleteDoc(doc(db, "contacts", id));
    }, []);

    return {
        contacts,
        loading,
        error,
        createContact,
        updateContact,
        deleteContact,
    };
}
