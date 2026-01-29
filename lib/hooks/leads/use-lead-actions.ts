"use client";

import { useCallback } from "react";
import {
    doc,
    // addDoc,
    getDoc,
    // deleteDoc,
    // writeBatch,
    // getDocs,
    // query,
    // QueryConstraint,
    // serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createNotification } from "@/lib/hooks/use-notifications";
import type { Lead } from "@/lib/types";
import type { LeadFormData } from "@/lib/schemas";
import type { LeadStats } from "./types";
import type { UseLeadsOptions } from "./use-leads-data";
import type { UserProfile } from "@/components/hooks/use-user-profile";

export function useLeadActions(
    profile: UserProfile | null,
    leads: Lead[],
    setLeads: React.Dispatch<React.SetStateAction<Lead[]>>,
    setTotalRecords: React.Dispatch<React.SetStateAction<number>>,
    setLeadStats: React.Dispatch<React.SetStateAction<LeadStats>>
) {
    const createLead = useCallback(
        async (data: LeadFormData): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            const { getAuth } = await import("firebase/auth");
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();

            if (!token) throw new Error("Not authenticated");

            const response = await fetch("/api/leads", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to create lead");
            }

            const newId = result.id;

            // Optimistic Update
            setLeads((prev) => [{ id: newId, ...data, name_lower: data.name.toLowerCase() } as Lead, ...prev]);
            setTotalRecords((prev) => prev + 1);
            setLeadStats((prev) => ({
                ...prev,
                total: prev.total + 1,
                totalValue: prev.totalValue + (data.value || 0),
            }));

            // Notify assignee
            if (data.assignedTo && data.assignedTo !== profile.uid) {
                createNotification({
                    type: "lead.created",
                    title: "New Lead Assigned",
                    message: `You have been assigned to lead: ${data.name}`,
                    link: "/dashboard/leads",
                    orgId: profile.orgId,
                    userId: data.assignedTo,
                    metadata: { leadId: newId },
                }).catch(console.error);
            }

            return newId;
        },
        [profile?.orgId, profile?.uid, setLeads, setTotalRecords, setLeadStats]
    );

    const updateLead = useCallback(
        async (id: string, data: Partial<LeadFormData>): Promise<void> => {
            if (!profile?.orgId) throw new Error("No organization");

            // If assignment is changing, we need to check if it's new
            let isNewAssignment = false;
            if (data.assignedTo !== undefined) {
                const oldDoc = await getDoc(doc(db, "leads", id));
                if (oldDoc.exists()) {
                    const oldData = oldDoc.data() as Lead;
                    if (oldData.assignedTo !== data.assignedTo) {
                        isNewAssignment = true;
                    }
                }
            }

            const { getAuth } = await import("firebase/auth");
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();

            if (!token) throw new Error("Not authenticated");

            const response = await fetch(`/api/leads/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || "Failed to update lead");
            }

            if (isNewAssignment && data.assignedTo && data.assignedTo !== profile.uid) {
                createNotification({
                    type: "lead.status_changed", // or lead.assigned
                    title: "Lead Assigned",
                    message: `You have been assigned to a lead.`,
                    link: `/dashboard/leads?id=${id}`, // Open drawer or just list
                    orgId: profile.orgId,
                    userId: data.assignedTo,
                    metadata: { leadId: id },
                }).catch(console.error);
            }
        },
        [profile?.orgId, profile?.uid]
    );

    const deleteLead = useCallback(
        async (id: string): Promise<void> => {
            const { getAuth } = await import("firebase/auth");
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();

            if (!token) throw new Error("Not authenticated");

            // Optimistic Update
            const leadToDelete = leads.find((l) => l.id === id);
            const value = leadToDelete?.value || 0;

            setLeads((prev) => prev.filter((l) => l.id !== id));
            setTotalRecords((prev) => Math.max(0, prev - 1));
            setLeadStats((prev) => ({
                ...prev,
                total: Math.max(0, prev.total - 1),
                totalValue: Math.max(0, prev.totalValue - value),
            }));

            const response = await fetch(`/api/leads/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const result = await response.json();
                // Revert optimistic update? For now just throw.
                throw new Error(result.error || "Failed to delete lead");
            }
        },
        [leads, setLeads, setTotalRecords, setLeadStats]
    );

    const bulkDeleteLeads = useCallback(
        async (ids: string[]): Promise<void> => {
            if (!ids.length) return;

            const { getAuth } = await import("firebase/auth");
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();

            if (!token) throw new Error("Not authenticated");

            // Optimistic Update
            const leadsToDelete = leads.filter((l) => ids.includes(l.id));
            const totalVal = leadsToDelete.reduce((sum, l) => sum + (l.value || 0), 0);

            setLeads((prev) => prev.filter((l) => !ids.includes(l.id)));
            setTotalRecords((prev) => Math.max(0, prev - ids.length));
            setLeadStats((prev) => ({
                ...prev,
                total: Math.max(0, prev.total - ids.length),
                totalValue: Math.max(0, prev.totalValue - totalVal),
            }));

            // Loop and delete individually via API
            // Note: Ideally backend supports bulk delete, but this ensures entitlement checks per item
            // or we add a bulk endpoint. For 500 items this is slow, but acceptable for MVP enforcement.
            const deletePromises = ids.map(async (id) => {
                const response = await fetch(`/api/leads/${id}`, {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (!response.ok) {
                    console.error(`Failed to delete lead ${id}`);
                }
            });

            await Promise.all(deletePromises);
        },
        [leads, setLeads, setTotalRecords, setLeadStats]
    );

    // Bulk Delete All Matches (Server-Side Function)
    const bulkDeleteAllMatches = useCallback(
        async (filters: UseLeadsOptions, setLoading?: (loading: boolean) => void) => {
            if (!profile?.orgId) return;
            try {
                if (setLoading) setLoading(true);

                const { getFunctions, httpsCallable } = await import("firebase/functions");
                const functions = getFunctions();
                const bulkDeleteLeadsFn = httpsCallable(functions, "bulkDeleteLeads");

                await bulkDeleteLeadsFn({
                    orgId: profile.orgId,
                    status: filters.status,
                    source: filters.source,
                    assignedTo: filters.assignedTo,
                    searchQuery: filters.searchQuery,
                });

                // Fetch fresh stats after full deletion
                setLeads([]);
                setTotalRecords(0);
                setLeadStats((prev) => ({ ...prev, total: 0 })); // Simplified stat update
                if (setLoading) setLoading(false);
            } catch (err) {
                console.error("Error deleting all matches:", err);
                if (setLoading) setLoading(false);
                throw err;
            }
        },
        [profile?.orgId, setLeads, setTotalRecords, setLeadStats]
    );

    return {
        createLead,
        updateLead,
        deleteLead,
        bulkDeleteLeads,
        bulkDeleteAllMatches,
    };
}
