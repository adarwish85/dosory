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
    startAfter,
    getCountFromServer,
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
    limit?: number;
    page?: number;
}

export function useCustomers(options: UseCustomersOptions = {}) {
    const {
        status = "all",
        orderByField = "company",
        orderDirection = "asc",
        limit: pageSize = 50,
        page = 1,
    } = options;
    const { profile } = useUserProfile();
    const { logActivity } = useActivity({ enabled: false });

    // Data State
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Pagination State
    const [totalRecords, setTotalRecords] = useState(0);
    const [cursors, setCursors] = useState<Record<number, any>>({}); // Store QueryDocumentSnapshot

    // Fetch Total Count
    useEffect(() => {
        if (!profile?.orgId) return;

        const fetchCount = async () => {
            try {
                const constraints: any[] = [where("orgId", "==", profile.orgId)];
                if (status !== "all") {
                    constraints.push(where("status", "==", status));
                }

                const q = query(collection(db, "customers"), ...constraints);
                const snapshot = await getCountFromServer(q);
                setTotalRecords(snapshot.data().count);
            } catch (err) {
                console.error("Error fetching customer count:", err);
            }
        };

        fetchCount();
    }, [profile?.orgId, status]);

    // Fetch Data
    useEffect(() => {
        if (!profile?.orgId) {
            setLoading(false);
            return;
        }

        setLoading(true);

        const constraints: QueryConstraint[] = [where("orgId", "==", profile.orgId)];

        if (status !== "all") {
            constraints.push(where("status", "==", status));
        }

        constraints.push(orderBy(orderByField, orderDirection));

        // Pagination
        if (page > 1 && cursors[page - 1]) {
            constraints.push(startAfter(cursors[page - 1]));
        }

        constraints.push(limit(pageSize));

        const q = query(collection(db, "customers"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Customer[];

                // Update cursor for next page
                if (snapshot.docs.length > 0) {
                    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
                    setCursors((prev) => ({ ...prev, [page]: lastDoc }));
                }

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
    }, [profile?.orgId, status, orderByField, orderDirection, pageSize, page]);

    const createCustomer = useCallback(
        async (data: CustomerFormData): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            // Get Firebase ID token for API auth
            const { getAuth } = await import("firebase/auth");
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();

            if (!token) throw new Error("Not authenticated");

            const response = await fetch("/api/customers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...data,
                    orgId: profile.orgId,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to create customer");
            }

            // Log activity
            if (logActivity) {
                await logActivity("customer_created", `Created customer ${data.company}`, result.id, "customer");
            }

            return result.id;
        },
        [profile?.orgId, logActivity]
    );

    const updateCustomer = useCallback(async (id: string, data: Partial<CustomerFormData>): Promise<void> => {
        const { getAuth } = await import("firebase/auth");
        const auth = getAuth();
        const token = await auth.currentUser?.getIdToken();

        if (!token) throw new Error("Not authenticated");

        const response = await fetch(`/api/customers/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || "Failed to update customer");
        }
    }, []);

    const deleteCustomer = useCallback(async (id: string): Promise<void> => {
        const { getAuth } = await import("firebase/auth");
        const auth = getAuth();
        const token = await auth.currentUser?.getIdToken();

        if (!token) throw new Error("Not authenticated");

        const response = await fetch(`/api/customers/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || "Failed to delete customer");
        }
    }, []);

    return {
        customers,
        loading,
        error,
        totalRecords,
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

        const constraints: QueryConstraint[] = [where("orgId", "==", profile.orgId)];

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

            const { getAuth } = await import("firebase/auth");
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();

            if (!token) throw new Error("Not authenticated");

            const response = await fetch("/api/contacts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to create contact");
            }

            return result.id;
        },
        [profile?.orgId]
    );

    const updateContact = useCallback(async (id: string, data: Partial<ContactFormData>): Promise<void> => {
        const { getAuth } = await import("firebase/auth");
        const auth = getAuth();
        const token = await auth.currentUser?.getIdToken();

        if (!token) throw new Error("Not authenticated");

        const response = await fetch(`/api/contacts/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || "Failed to update contact");
        }
    }, []);

    const deleteContact = useCallback(async (id: string): Promise<void> => {
        const { getAuth } = await import("firebase/auth");
        const auth = getAuth();
        const token = await auth.currentUser?.getIdToken();

        if (!token) throw new Error("Not authenticated");

        const response = await fetch(`/api/contacts/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || "Failed to delete contact");
        }
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
