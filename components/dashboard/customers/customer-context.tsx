"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, getDocs, collection, query, where, onSnapshot, getCountFromServer } from "firebase/firestore";
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
    activities: number; // Added activities
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
    activities: 0, // Added activities
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
        if (!customerId || !profile?.orgId) {
            setLoading(false);
            return;
        }

        // Load customer data - try by ID first, then by slug
        const loadCustomer = async () => {
            try {
                // 1. Try fetching by document ID first
                const docRef = doc(db, "customers", customerId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setCustomer({ id: docSnap.id, ...docSnap.data() } as Customer);
                    setLoading(false);
                    return;
                }

                // 2. If not found by ID, try querying by slug
                const slugQuery = query(
                    collection(db, "customers"),
                    where("slug", "==", customerId),
                    where("orgId", "==", profile.orgId)
                );
                const slugSnap = await getDocs(slugQuery);

                if (!slugSnap.empty) {
                    const foundDoc = slugSnap.docs[0];
                    setCustomer({ id: foundDoc.id, ...foundDoc.data() } as Customer);
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
    }, [customerId, profile?.orgId]);

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
            // `tenantField` is per-collection on purpose: `tickets` is scoped by `tenantId`,
            // everything else by `orgId`. Hardcoding "orgId" for all of them made the Tickets
            // badge permanently 0 — ticket documents have no orgId field, so the count query
            // matched nothing and the catch below reported it as zero. Same silent-empty class
            // as the read/write split-brain this migration closed (CLAUDE.md Sweep E).
            const collections: Array<{
                key: string;
                collection: string;
                tenantField?: string;
                customerField?: string;
                relatedType?: string;
            }> = [
                { key: "invoices", collection: "invoices" },
                { key: "payments", collection: "payments" },
                { key: "creditNotes", collection: "credit_notes" }, // fixed name
                { key: "estimates", collection: "estimates" },
                { key: "expenses", collection: "expenses" },
                { key: "contracts", collection: "contracts" },
                { key: "projects", collection: "projects" },
                { key: "tasks", collection: "tasks" },
                { key: "tickets", collection: "tickets", tenantField: "tenantId" },
                { key: "files", collection: "customer_files" }, // fixed name
                // `reminders` links to its subject via relatedTo.{id,type}, not a top-level
                // customerId — same Sweep E disagreement the useReminders READER had. Filtering
                // on customerId here kept this badge at 0 forever.
                { key: "reminders", collection: "reminders", customerField: "relatedTo.id", relatedType: "customer" },
                // The CRM Activity entity links via relatedTo.{id,type}, not a top-level
                // customerId — same disagreement the reminders badge had. Filtering on
                // customerId kept this badge at 0 regardless of how many activities existed.
                { key: "activities", collection: "activities", customerField: "relatedTo.id", relatedType: "customer" },
            ];

            const counts: Partial<RecordCounts> = {};

            // Handle root collections
            await Promise.all(
                collections.map(async ({ key, collection: collName, tenantField, customerField, relatedType }) => {
                    try {
                        const constraints = [
                            where(tenantField ?? "orgId", "==", orgId),
                            where(customerField ?? "customerId", "==", customerId),
                        ];
                        if (relatedType) constraints.push(where("relatedTo.type", "==", relatedType));
                        const q = query(collection(db, collName), ...constraints);
                        const snapshot = await getCountFromServer(q);
                        counts[key as keyof RecordCounts] = snapshot.data().count;
                    } catch (err) {
                        // Collection may not have a customerId field. Log it — a swallowed
                        // failure here is indistinguishable from a genuine zero.
                        console.warn(`[customer-counts] ${collName} count failed; reporting 0`, err);
                        counts[key as keyof RecordCounts] = 0;
                    }
                })
            );

            // Handle subcollection: Notes
            try {
                const notesQ = query(collection(db, "customers", customerId, "notes"), where("orgId", "==", orgId));
                const notesSnap = await getCountFromServer(notesQ);
                counts.notes = notesSnap.data().count;
            } catch (err) {
                console.error("Error fetching notes count:", err);
                counts.notes = 0;
            }

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
