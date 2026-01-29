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

            // Normalize strings for comparison to avoid case-sensitivity loops
            const normalizedRawId = rawId.toLowerCase();
            const normalizedExpectedParam = expectedParam.toLowerCase();

            // If the current URL param doesn't match the expected slug--id format
            if (normalizedRawId !== normalizedExpectedParam) {
                // Get the current pathname
                const currentPath = window.location.pathname;

                // Construct the canonical base path
                const canonicalBasePath = `/dashboard/leads/${expectedParam}`;

                // If we are ALREADY starting with the canonical path (case-insensitive check), do NOT redirect
                // This prevents loops where sub-paths or query params might mislead the logic
                if (currentPath.toLowerCase().startsWith(canonicalBasePath.toLowerCase())) {
                    console.log(`[LeadProvider] Already on canonical path: ${currentPath}, skipping redirect.`);
                    return;
                }

                // Preserving tab segment logic
                // Avoid using rawId in replace since it might be partial or different case
                // Instead, reconstruct from the segments after /leads/
                const match = currentPath.match(/\/dashboard\/leads\/[^\/]+(\/.*)?$/);
                const tabSegment = match ? match[1] || "" : "";

                // Replace URL with canonical format
                const canonicalUrl = `/dashboard/leads/${expectedParam}${tabSegment}`;

                // Double check we aren't redirecting to the EXACT same URL
                if (canonicalUrl.toLowerCase() === currentPath.toLowerCase()) {
                    return;
                }

                console.log(
                    `[LeadProvider] WOULD Redirect to canonical URL: ${canonicalUrl} (was ${currentPath}) - Redirect Disabled`
                );
                // router.replace(canonicalUrl);
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
            console.log(`[LeadContext] loading lead ${leadId}...`);
            setLoading(true);
            const docRef = doc(db, "leads", leadId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                console.log(`[LeadContext] lead ${leadId} found`);
                setLead({ id: docSnap.id, ...docSnap.data() } as Lead);
            } else {
                console.warn(`[LeadContext] lead ${leadId} not found`);
                setError(new Error("Lead not found"));
            }
        } catch (err) {
            console.error("Error loading lead:", err);
            setError(err as Error);
        } finally {
            console.log(`[LeadContext] finished loading lead ${leadId}`);
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
