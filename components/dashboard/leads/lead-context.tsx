"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { parseSlugId, toSlug, createSlugId } from "@/lib/url-utils";
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
    [key: string]: unknown;
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
    refreshLead: () => {},
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
    // URL Parsing & Redirection Logic
    const params = useParams();
    const rawId = params?.id as string;
    const router = useRouter(); // Import useRouter at top

    // We store the *intended* ID to fetch, but we also check the URL format
    const [leadId, setLeadId] = useState<string | null>(null);

    const { profile } = useUserProfile();

    const [lead, setLead] = useState<Lead | null>(null);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Initial Parse & redirect check
    useEffect(() => {
        if (!rawId) return;

        const { publicId } = parseSlugId(rawId);
        setLeadId(publicId);

        // If we have a lead already loaded, check if we need to canonicalize the URL
        if (lead && lead.id === publicId) {
            const expectedSlug = lead.slug || toSlug(lead.name);
            const expectedParam = createSlugId(expectedSlug, publicId);

            // If the current URL param doesn't match the expected slug--id format
            if (rawId !== expectedParam) {
                // Replace URL without reloading (shallow if possible, but Next app router structure usually means route change)
                // However, we want to update the history.
                console.log(`[LeadProvider] Redirecting to canonical URL: ${expectedParam}`);
                router.replace(`/dashboard/leads/${expectedParam}`);
            }
        }
    }, [rawId, lead, router]);

    // Wrap loadLead in useCallback to be stable for dependencies

    const loadLead = useCallback(async () => {
        if (!leadId) {
            // Wait until leadId is parsed from rawId
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
    }, [leadId]);

    useEffect(() => {
        loadLead();
    }, [leadId, loadLead]);

    // Subscribe to contacts associated with this lead
    useEffect(() => {
        if (!leadId || !profile?.orgId) {
            return;
        }

        // Query without orderBy to avoid index requirement - sort client-side
        const q = query(collection(db, "contacts"), where("orgId", "==", profile.orgId), where("leadId", "==", leadId));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const contactsData = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Contact[];
                // Sort client-side by lastName
                contactsData.sort((a, b) => (a.lastName || "").localeCompare(b.lastName || ""));
                setContacts(contactsData);
            },
            (err) => {
                console.error("Error loading contacts:", err);
            }
        );

        return () => unsubscribe();
    }, [leadId, profile?.orgId]);

    return (
        <LeadContext.Provider value={{ lead, contacts, loading, error, leadId, refreshLead: loadLead }}>
            {children}
        </LeadContext.Provider>
    );
}
