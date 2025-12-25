"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Customer, Contact } from "@/lib/types";
import { useUserProfile } from "@/components/hooks/use-user-profile";

// Local Contact interface removed. Using @/lib/types Contact.

interface CustomerContextType {
    customer: Customer | null;
    contacts: Contact[];
    loading: boolean;
    error: Error | null;
    customerId: string | null;
}

const CustomerContext = createContext<CustomerContextType>({
    customer: null,
    contacts: [],
    loading: true,
    error: null,
    customerId: null,
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

        const q = query(
            collection(db, "contacts"),
            where("orgId", "==", profile.orgId),
            where("customerId", "==", customerId),
            orderBy("lastName", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const contactsData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Contact[];
            setContacts(contactsData);
        }, (err) => {
            console.error("Error loading contacts:", err);
        });

        return () => unsubscribe();
    }, [customerId, profile?.orgId]);

    return (
        <CustomerContext.Provider value={{ customer, contacts, loading, error, customerId }}>
            {children}
        </CustomerContext.Provider>
    );
}
