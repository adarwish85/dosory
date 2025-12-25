"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Lead } from "@/lib/types";
import { useUserProfile } from "@/components/hooks/use-user-profile";

interface Contact {
    id: string;
    leadId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    position?: string;
    isPrimary?: boolean;
    isActive?: boolean;
    [key: string]: any;
}

interface LeadContextType {
    lead: Lead | null;
    contacts: Contact[];
    loading: boolean;
    error: Error | null;
    leadId: string | null;
    refreshLead: () => void;
}

const LeadContext = createContext<LeadContextType>({
    lead: null,
    contacts: [],
    loading: true,
    error: null,
    leadId: null,
    refreshLead: () => { },
});

export function useLead() {
    const context = useContext(LeadContext);
    if (!context) {
        throw new Error("useLead must be used within LeadProvider");
    }
    return context;
}

interface LeadProviderProps {
    children: ReactNode;
}

export function LeadProvider({ children }: LeadProviderProps) {
    const params = useParams();
    const leadId = params?.id as string;
    const { profile } = useUserProfile();

    const [lead, setLead] = useState<Lead | null>(null);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const loadLead = async () => {
        if (!leadId) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const docRef = doc(db, "leads", leadId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setLead({ id: docSnap.id, ...docSnap.data() } as Lead);
            } else {
                setError(new Error("Lead not found"));
            }
        } catch (err) {
            console.error("Error loading lead:", err);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLead();
    }, [leadId]);

    // Subscribe to contacts associated with this lead
    useEffect(() => {
        if (!leadId || !profile?.orgId) {
            return;
        }

        const q = query(
            collection(db, "contacts"),
            where("orgId", "==", profile.orgId),
            where("leadId", "==", leadId),
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
    }, [leadId, profile?.orgId]);

    return (
        <LeadContext.Provider value={{ lead, contacts, loading, error, leadId, refreshLead: loadLead }}>
            {children}
        </LeadContext.Provider>
    );
}
