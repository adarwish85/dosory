// Firestore data hooks for Leads
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
    getDocs,
    getDoc,
    serverTimestamp,
    Timestamp,
    QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import type { Lead, LeadStatus } from "@/lib/types";
import type { LeadFormData } from "@/lib/schemas";

// ============================================
// useLeads Hook
// ============================================

interface UseLeadsOptions {
    status?: LeadStatus | "all";
    assignedTo?: string;
    source?: string;
    orderByField?: "name" | "createdAt" | "value";
    orderDirection?: "asc" | "desc";
    limit?: number; // Add pagination limit
}

export function useLeads(options: UseLeadsOptions = {}) {
    const {
        status = "all",
        assignedTo,
        source,
        orderByField = "createdAt",
        orderDirection = "desc",
        limit: queryLimit = 100, // Default to 100 items for performance
    } = options;
    const { profile } = useUserProfile();
    const [leads, setLeads] = useState<Lead[]>([]);
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

        if (assignedTo) {
            constraints.push(where("assignedTo", "==", assignedTo));
        }

        if (source) {
            constraints.push(where("source", "==", source));
        }

        constraints.push(orderBy(orderByField, orderDirection));

        // Add limit for performance - prevents loading thousands of records
        constraints.push(limit(queryLimit));

        const q = query(collection(db, "leads"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Lead[];
                setLeads(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching leads:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, status, assignedTo, source, orderByField, orderDirection, queryLimit]);

    const createLead = useCallback(
        async (data: LeadFormData): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            const docRef = await addDoc(collection(db, "leads"), {
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

    const updateLead = useCallback(
        async (id: string, data: Partial<LeadFormData>): Promise<void> => {
            await updateDoc(doc(db, "leads", id), {
                ...data,
                updatedAt: serverTimestamp(),
            });
        },
        []
    );

    const deleteLead = useCallback(async (id: string): Promise<void> => {
        await deleteDoc(doc(db, "leads", id));
    }, []);

    const convertToCustomer = useCallback(
        async (leadId: string, overrides?: { company?: string; email?: string }): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            // Get lead data
            const leadDocRef = doc(db, "leads", leadId);
            const leadSnap = await getDoc(leadDocRef);

            if (!leadSnap.exists()) throw new Error("Lead not found");
            const leadDoc = { id: leadSnap.id, ...leadSnap.data() } as Lead;

            // Check if already converted
            if (leadDoc.convertedToCustomerId) {
                throw new Error("Lead already converted to customer: " + leadDoc.convertedToCustomerId);
            }

            // Apply overrides for missing data
            const finalCompany = overrides?.company || leadDoc.company || leadDoc.name;
            const finalEmail = overrides?.email || leadDoc.email || "";

            // Create customer with additional lead data
            const customerRef = await addDoc(collection(db, "customers"), {
                company: finalCompany,
                phone: leadDoc.phone || "",
                website: leadDoc.website || "",
                address: leadDoc.address || {},
                defaultLanguage: leadDoc.defaultLanguage || "en",
                notes: leadDoc.description || "",
                groups: leadDoc.tags || [],
                status: "active",
                fromLeadId: leadId,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            // Always create primary contact
            await addDoc(collection(db, "contacts"), {
                customerId: customerRef.id,
                firstName: leadDoc.name.split(" ")[0] || leadDoc.name,
                lastName: leadDoc.name.split(" ").slice(1).join(" ") || "",
                email: finalEmail,
                phone: leadDoc.phone || "",
                position: leadDoc.position || "",
                isPrimary: true,
                status: "active",
                permissions: [],
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            // Transfer proposals linked to this lead
            const proposalsQuery = query(
                collection(db, "proposals"),
                where("leadId", "==", leadId),
                where("orgId", "==", profile.orgId)
            );
            const proposalsSnap = await getDocs(proposalsQuery);
            for (const propDoc of proposalsSnap.docs) {
                await updateDoc(doc(db, "proposals", propDoc.id), {
                    customerId: customerRef.id,
                    customerName: finalCompany,
                    transferredFromLeadId: leadId,
                    updatedAt: serverTimestamp(),
                });
            }

            // Transfer estimates linked to this lead
            const estimatesQuery = query(
                collection(db, "estimates"),
                where("leadId", "==", leadId),
                where("orgId", "==", profile.orgId)
            );
            const estimatesSnap = await getDocs(estimatesQuery);
            for (const estDoc of estimatesSnap.docs) {
                await updateDoc(doc(db, "estimates", estDoc.id), {
                    customerId: customerRef.id,
                    customerName: finalCompany,
                    transferredFromLeadId: leadId,
                    updatedAt: serverTimestamp(),
                });
            }

            // Transfer tasks linked to this lead
            const tasksQuery = query(
                collection(db, "tasks"),
                where("relatedTo.id", "==", leadId),
                where("orgId", "==", profile.orgId)
            );
            const tasksSnap = await getDocs(tasksQuery);
            for (const taskDoc of tasksSnap.docs) {
                await updateDoc(doc(db, "tasks", taskDoc.id), {
                    relatedTo: {
                        type: "customer",
                        id: customerRef.id,
                    },
                    transferredFromLeadId: leadId,
                    updatedAt: serverTimestamp(),
                });
            }

            // Delete the lead after successful conversion
            await deleteDoc(doc(db, "leads", leadId));

            return customerRef.id;
        },
        [profile?.orgId, profile?.uid]
    );

    // Calculate lead stats by status
    const leadStats = leads.reduce(
        (acc, lead) => {
            acc[lead.status] = (acc[lead.status] || 0) + 1;
            acc.total++;
            if (lead.value) acc.totalValue += lead.value;
            return acc;
        },
        { total: 0, totalValue: 0 } as Record<string, number>
    );

    return {
        leads,
        loading,
        error,
        leadStats,
        createLead,
        updateLead,
        deleteLead,
        convertToCustomer,
    };
}

// ============================================
// useLead Hook (single lead)
// ============================================

export function useLead(id: string | null) {
    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!id) {
            setLead(null);
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(
            doc(db, "leads", id),
            (snapshot) => {
                if (snapshot.exists()) {
                    setLead({ id: snapshot.id, ...snapshot.data() } as Lead);
                } else {
                    setLead(null);
                }
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching lead:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [id]);

    return { lead, loading, error };
}
