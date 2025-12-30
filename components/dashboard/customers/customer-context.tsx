"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, collection, query, where, onSnapshot, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Customer, Contact } from "@/lib/types";
import { useUserProfile } from "@/components/hooks/use-user-profile";

// Record counts for sidebar badges
interface RecordCounts {
    contacts: number;
    notes: number;
    invoices: number;
    payments: number;
    creditNotes: number;
    estimates: number;
    expenses: number;
    contracts: number;
    projects: number;
    tasks: number;
    tickets: number;
    files: number;
    reminders: number;
}

interface CustomerContextType {
    customer: Customer | null;
    contacts: Contact[];
    loading: boolean;
    error: Error | null;
    customerId: string | null;
    recordCounts: RecordCounts;
}

const defaultCounts: RecordCounts = {
    contacts: 0,
    notes: 0,
    invoices: 0,
    payments: 0,
    creditNotes: 0,
    estimates: 0,
    expenses: 0,
    contracts: 0,
    projects: 0,
    tasks: 0,
    tickets: 0,
    files: 0,
    reminders: 0,
};

const CustomerContext = createContext<CustomerContextType>({
    customer: null,
    contacts: [],
    loading: true,
    error: null,
    customerId: null,
    recordCounts: defaultCounts,
});

export function useCustomer() {
    const context = useContext(CustomerContext);
    if (!context) {
        throw new Error("useCustomer must be used within CustomerProvider");
    }
    return context;
}

interface CustomerProviderProps {
    children: ReactNode;
}

export function CustomerProvider({ children }: CustomerProviderProps) {
    const params = useParams();
    const customerId = params?.id as string;
    const { profile } = useUserProfile();

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [recordCounts, setRecordCounts] = useState<RecordCounts>(defaultCounts);

    useEffect(() => {
        if (!customerId) {
            setLoading(false);
            return;
        }

        // Load customer data
        const loadCustomer = async () => {
            try {
                const docRef = doc(db, "customers", customerId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setCustomer({ id: docSnap.id, ...docSnap.data() } as Customer);
                } else {
                    setError(new Error("Customer not found"));
                }
            } catch (err) {
                console.error("Error loading customer:", err);
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };

        loadCustomer();
    }, [customerId]);

    // Subscribe to contacts from top-level collection (filtered by customerId)
    useEffect(() => {
        if (!customerId || !profile?.orgId) {
            return;
        }

        // Debug: Log query parameters
        console.log("[CustomerProvider] Loading contacts for customerId:", customerId, "orgId:", profile.orgId);

        // Query without orderBy to avoid index requirement - sort client-side
        const q = query(
            collection(db, "contacts"),
            where("customerId", "==", customerId),
            where("orgId", "==", profile.orgId)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const contactsData = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Contact[];
                console.log(
                    "[CustomerProvider] Contacts loaded:",
                    contactsData.length,
                    contactsData.map((c) => ({ id: c.id, customerId: c.customerId, orgId: c.orgId }))
                );
                // Sort client-side by lastName
                contactsData.sort((a, b) => (a.lastName || "").localeCompare(b.lastName || ""));
                setContacts(contactsData);
                setRecordCounts((prev) => ({ ...prev, contacts: contactsData.length }));
            },
            (err) => {
                console.error("Error loading contacts:", err);
            }
        );

        return () => unsubscribe();
    }, [customerId, profile?.orgId]);

    // Fetch record counts for all sections
    useEffect(() => {
        if (!customerId || !profile?.orgId) return;

        const fetchCounts = async () => {
            const orgId = profile.orgId;
            const collections = [
                { key: "notes", collection: "notes" },
                { key: "invoices", collection: "invoices" },
                { key: "payments", collection: "payments" },
                { key: "creditNotes", collection: "creditNotes" },
                { key: "estimates", collection: "estimates" },
                { key: "expenses", collection: "expenses" },
                { key: "contracts", collection: "contracts" },
                { key: "projects", collection: "projects" },
                { key: "tasks", collection: "tasks" },
                { key: "tickets", collection: "tickets" },
                { key: "files", collection: "customerFiles" },
                { key: "reminders", collection: "reminders" },
            ];

            const counts: Partial<RecordCounts> = {};

            await Promise.all(
                collections.map(async ({ key, collection: collName }) => {
                    try {
                        const q = query(
                            collection(db, collName),
                            where("orgId", "==", orgId),
                            where("customerId", "==", customerId)
                        );
                        const snapshot = await getCountFromServer(q);
                        counts[key as keyof RecordCounts] = snapshot.data().count;
                    } catch {
                        // Collection may not have customerId field - ignore silently
                        counts[key as keyof RecordCounts] = 0;
                    }
                })
            );

            setRecordCounts((prev) => ({ ...prev, ...counts }));
        };

        fetchCounts();
    }, [customerId, profile?.orgId]);

    return (
        <CustomerContext.Provider value={{ customer, contacts, loading, error, customerId, recordCounts }}>
            {children}
        </CustomerContext.Provider>
    );
}
