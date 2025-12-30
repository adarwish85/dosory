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
    writeBatch,
    getCountFromServer,
    getAggregateFromServer,
    sum,
    count,
    startAfter,
    QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { createNotification } from "@/lib/hooks/use-notifications";
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
    page?: number;
    searchQuery?: string;
}

export function useLeads(options: UseLeadsOptions = {}) {
    const {
        status = "all",
        assignedTo,
        source,
        orderByField = "createdAt",
        orderDirection = "desc",
        limit: pageSize = 100,
        page = 1,
        searchQuery = "",
    } = options;
    const { profile } = useUserProfile();

    // Data State
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Pagination State
    const [totalRecords, setTotalRecords] = useState(0);
    const [cursors, setCursors] = useState<Record<number, QueryDocumentSnapshot>>({}); // Store last doc of each page

    // Stats State
    const [leadStats, setLeadStats] = useState({ total: 0, totalValue: 0, starred: 0, qualified: 0 });

    // Helper: Build constraints based on filters (excluding pagination)
    const getBaseConstraints = useCallback(() => {
        if (!profile?.orgId) return [];
        const c: QueryConstraint[] = [where("orgId", "==", profile.orgId)];

        if (status !== "all") c.push(where("status", "==", status));
        if (assignedTo) c.push(where("assignedTo", "==", assignedTo));
        if (source) c.push(where("source", "==", source));

        // Search (Prefix only, Case-Insensitive)
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            c.push(where("name_lower", ">=", lowerQuery));
            c.push(where("name_lower", "<=", lowerQuery + "\uf8ff"));
        }

        return c;
    }, [profile?.orgId, status, assignedTo, source, searchQuery]);

    // Effect: Fetch Stats & Total Count
    useEffect(() => {
        let isMounted = true;
        const fetchStatsAndCount = async () => {
            if (!profile?.orgId) return;
            try {
                // 1. Aggregation for global stats
                const globalQ = query(collection(db, "leads"), where("orgId", "==", profile.orgId));
                // Fallback to client-side count if aggregation fails (or for development locally if indexes miss)
                // Actually, getAggregateFromServer requires index. getCountFromServer is cheaper/supported more broadly without specific composite index sometimes?
                // For "Total Value", we definitely need aggregation.

                // We'll wrap in try/catch individual parts to ensure partial success
                let globalTotal = 0;
                let globalValue = 0;

                try {
                    const aggSnap = await getAggregateFromServer(globalQ, {
                        totalCount: count(),
                        totalValue: sum("value"),
                    });
                    globalTotal = aggSnap.data().totalCount;
                    globalValue = aggSnap.data().totalValue;
                } catch (aggErr) {
                    console.warn("Aggregation failed (likely missing index), falling back to basic count:", aggErr);
                    // Fallback for count only
                    try {
                        const countSnap = await getCountFromServer(globalQ);
                        globalTotal = countSnap.data().count;
                    } catch (ignore) { }
                }

                if (!isMounted) return;

                // 2. Count for Pagination
                const constraints = getBaseConstraints();
                const filterQ = query(collection(db, "leads"), ...constraints);
                const filterCountSnap = await getCountFromServer(filterQ);

                if (isMounted) {
                    setLeadStats((prev) => ({
                        ...prev,
                        total: globalTotal,
                        totalValue: globalValue,
                    }));
                    setTotalRecords(filterCountSnap.data().count);
                }
            } catch (err) {
                console.error("Error fetching stats:", err);
            }
        };

        fetchStatsAndCount();
        return () => {
            isMounted = false;
        };
    }, [profile?.orgId, getBaseConstraints]);

    // Effect: Fetch Paginated Data
    useEffect(() => {
        if (!profile?.orgId) {
            setLoading(false);
            return;
        }

        setLoading(true);

        const constraints = getBaseConstraints();
        constraints.push(orderBy(orderByField, orderDirection));

        // Pagination Logic
        if (page > 1) {
            const prevCursor = cursors[page - 1];
            if (prevCursor) {
                constraints.push(startAfter(prevCursor));
            } else {
                console.warn(
                    "Missing cursor for page " + page + ", loading from scratch (might be inaccurate deep in list)."
                );
                // Fallback: If we don't have cursor (e.g. reload or jump), we can't efficiently jump to page X in Firestore.
                // ideally handling "Invalid Cursor" by resetting to Page 1 in UI.
            }
        }

        constraints.push(limit(pageSize));

        const q = query(collection(db, "leads"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Lead[];

                // Update Cursor for the NEXT page
                if (snapshot.docs.length > 0) {
                    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
                    setCursors((prev) => ({ ...prev, [page]: lastDoc }));
                }

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
    }, [profile?.orgId, getBaseConstraints, orderByField, orderDirection, pageSize, page]);

    // Reconcile totalRecords with actual fetched leads to prevent count mismatch
    // This fixes the issue where onSnapshot updates with new data (e.g. from other users)
    // but the one-off getCountFromServer remains stale.
    useEffect(() => {
        const currentCount = leads.length;
        const currentTotalOnPage = (page - 1) * pageSize + currentCount;

        // If we received fewer items than the limit, we know the exact total corresponds to this end of list
        if (currentCount < pageSize) {
            if (totalRecords !== currentTotalOnPage) {
                setTotalRecords(currentTotalOnPage);
            }
        }
        // If we have a full page, we at least know the total is >= what we see
        else if (totalRecords < currentTotalOnPage) {
            setTotalRecords(currentTotalOnPage);
        }
    }, [leads.length, pageSize, page, totalRecords]);

    const createLead = useCallback(
        async (data: LeadFormData): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            const docRef = await addDoc(collection(db, "leads"), {
                ...data,
                name_lower: data.name.toLowerCase(),
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            // Optimistic Update
            setLeads((prev) => [{ id: docRef.id, ...data, name_lower: data.name.toLowerCase() } as Lead, ...prev]);
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
                    metadata: { leadId: docRef.id },
                }).catch(console.error);
            }

            return docRef.id;
        },
        [profile?.orgId, profile?.uid]
    );

    const updateLead = useCallback(
        async (id: string, data: Partial<LeadFormData>): Promise<void> => {
            if (!profile?.orgId) throw new Error("No organization");

            // If assignment is changing, we need to check if it's new
            let isNewAssignment = false;
            if (data.assignedTo !== undefined) {
                // Optimization: We could rely on UI passing correct data, but safely we should check old doc?
                // For now, let's assume if data.assignedTo is passed and not null, we notify if it's not me.
                // Ideally we check if it CHANGED.
                // Let's fetch the doc to be safe, though it adds latency.
                // It's an important action, so safety > micro-perf.
                const oldDoc = await getDoc(doc(db, "leads", id));
                if (oldDoc.exists()) {
                    const oldData = oldDoc.data() as Lead;
                    if (oldData.assignedTo !== data.assignedTo) {
                        isNewAssignment = true;
                    }
                }
            }

            await updateDoc(doc(db, "leads", id), {
                ...data,
                ...(data.name ? { name_lower: data.name.toLowerCase() } : {}),
                updatedAt: serverTimestamp(),
            });

            if (isNewAssignment && data.assignedTo && data.assignedTo !== profile.uid) {
                // Fetch name if not in data? We have name in data usually for updates? Not always.
                // We can use generic message or fetch name.
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

            await deleteDoc(doc(db, "leads", id));
        },
        [leads]
    );

    const bulkDeleteLeads = useCallback(
        async (ids: string[]): Promise<void> => {
            if (!ids.length) return;

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

            const batchSize = 500;
            for (let i = 0; i < ids.length; i += batchSize) {
                const batch = writeBatch(db);
                const chunk = ids.slice(i, i + batchSize);
                chunk.forEach((id) => {
                    batch.delete(doc(db, "leads", id));
                });
                await batch.commit();
            }
        },
        [leads]
    );

    // Bulk Delete All Matches (Server-Side)
    const bulkDeleteAllMatches = useCallback(async () => {
        if (!profile?.orgId) return;
        try {
            setLoading(true);
            const constraints = getBaseConstraints();
            // Query for all docs matching the current filter
            // Note: For very large datasets (10k+), this client-side loop might timeout.
            // Ideally, this should be handled by a Cloud Function.
            const q = query(collection(db, "leads"), ...constraints);
            const snapshot = await getDocs(q);

            const totalToDelete = snapshot.size;
            if (totalToDelete === 0) {
                setLoading(false);
                return;
            }

            const batchSize = 500;
            const chunks = [];
            let currentBatch = writeBatch(db);
            let count = 0;

            snapshot.docs.forEach((docSnap) => {
                currentBatch.delete(docSnap.ref);
                count++;
                if (count === batchSize) {
                    chunks.push(currentBatch.commit());
                    currentBatch = writeBatch(db);
                    count = 0;
                }
            });
            if (count > 0) chunks.push(currentBatch.commit());

            await Promise.all(chunks);

            // Fetch fresh stats after full deletion
            setLeads([]);
            setTotalRecords(0);
            setLeadStats((prev) => ({ ...prev, total: Math.max(0, prev.total - totalToDelete) }));
            setLoading(false);
        } catch (err) {
            console.error("Error deleting all matches:", err);
            setError(err instanceof Error ? err : new Error("Failed to delete all leads"));
            setLoading(false);
            throw err;
        }
    }, [profile?.orgId, getBaseConstraints]);

    const convertToCustomer = useCallback(
        async (leadId: string, overrides?: { company?: string; email?: string }): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            // Get lead data
            const leadDocRef = doc(db, "leads", leadId);
            const leadSnap = await getDoc(leadDocRef);

            if (!leadSnap.exists()) throw new Error("Lead not found");
            const leadDoc = { id: leadSnap.id, ...leadSnap.data() } as Lead;

            if (leadDoc.convertedToCustomerId) {
                throw new Error("Lead already converted to customer: " + leadDoc.convertedToCustomerId);
            }

            const finalCompany = overrides?.company || leadDoc.company || leadDoc.name;
            const finalEmail = overrides?.email || leadDoc.email || "";

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

            // Create contact for the new customer
            const leadName = leadDoc.name || "Contact";
            const nameParts = leadName.trim().split(" ");
            const contactData = {
                customerId: customerRef.id,
                firstName: nameParts[0] || leadName,
                lastName: nameParts.slice(1).join(" ") || "",
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
            };
            console.log("[convertToCustomer] Creating contact with data:", {
                ...contactData,
                customerId: customerRef.id,
                orgId: profile.orgId,
            });
            try {
                const contactRef = await addDoc(collection(db, "contacts"), contactData);
                console.log("[convertToCustomer] Contact created with ID:", contactRef.id);
            } catch (contactErr) {
                console.error("[convertToCustomer] Failed to create contact:", contactErr);
                // Don't throw - customer was already created, log and continue
            }

            // Transfer related items (proposals, estimates, tasks)
            const transferRelated = async (coll: string, field: string) => {
                const q = query(collection(db, coll), where(field, "==", leadId), where("orgId", "==", profile.orgId));
                const snap = await getDocs(q);
                const batch = writeBatch(db);
                snap.docs.forEach((d) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const update: any = {
                        customerId: customerRef.id,
                        transferredFromLeadId: leadId,
                        updatedAt: serverTimestamp(),
                    };
                    if (coll === "tasks") update.relatedTo = { type: "customer", id: customerRef.id };
                    else update.customerName = finalCompany;
                    batch.update(doc(db, coll, d.id), update);
                });
                if (snap.docs.length > 0) await batch.commit();
            };

            await Promise.all([
                transferRelated("proposals", "leadId"),
                transferRelated("estimates", "leadId"),
                transferRelated("tasks", "relatedTo.id"), // Note: Logic slightly different for tasks, handled inside helper if robust, but simplified here for brevity or keeping original logic.
            ]);

            // Re-implementing specific Task logic from original file to ensure correctness as generic helper might miss deep fields.
            // Actually, let's stick to the original logic for safety.

            // Transfer proposals
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

            // Transfer estimates
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

            // Transfer tasks
            const tasksQuery = query(
                collection(db, "tasks"),
                where("relatedTo.id", "==", leadId),
                where("orgId", "==", profile.orgId)
            );
            const tasksSnap = await getDocs(tasksQuery);
            for (const taskDoc of tasksSnap.docs) {
                await updateDoc(doc(db, "tasks", taskDoc.id), {
                    relatedTo: { type: "customer", id: customerRef.id },
                    transferredFromLeadId: leadId,
                    updatedAt: serverTimestamp(),
                });
            }

            // Transfer lead notes (from subcollection to root-level notes collection)
            console.log("[convertToCustomer] Transferring lead notes...");
            const leadNotesRef = collection(db, "leads", leadId, "notes");
            const leadNotesSnap = await getDocs(leadNotesRef);
            for (const noteDoc of leadNotesSnap.docs) {
                const noteData = noteDoc.data();
                // Create note in root-level notes collection with customerId
                await addDoc(collection(db, "notes"), {
                    ...noteData,
                    customerId: customerRef.id,
                    orgId: profile.orgId,
                    transferredFromLeadId: leadId,
                    transferredFromNoteId: noteDoc.id,
                    createdAt: noteData.createdAt || serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                // Delete original note from lead subcollection
                await deleteDoc(doc(db, "leads", leadId, "notes", noteDoc.id));
            }
            console.log(`[convertToCustomer] Transferred ${leadNotesSnap.docs.length} notes`);

            // Transfer lead reminders (from leadReminders collection to reminders collection)
            console.log("[convertToCustomer] Transferring lead reminders...");
            const leadRemindersQuery = query(
                collection(db, "leadReminders"),
                where("leadId", "==", leadId),
                where("orgId", "==", profile.orgId)
            );
            const leadRemindersSnap = await getDocs(leadRemindersQuery);
            for (const reminderDoc of leadRemindersSnap.docs) {
                const reminderData = reminderDoc.data();
                // Create reminder in root-level reminders collection with customerId
                await addDoc(collection(db, "reminders"), {
                    ...reminderData,
                    customerId: customerRef.id,
                    transferredFromLeadId: leadId,
                    transferredFromReminderId: reminderDoc.id,
                    updatedAt: serverTimestamp(),
                });
                // Delete original reminder
                await deleteDoc(doc(db, "leadReminders", reminderDoc.id));
            }
            console.log(`[convertToCustomer] Transferred ${leadRemindersSnap.docs.length} reminders`);

            // Transfer lead files (from leadFiles collection to customerFiles collection)
            console.log("[convertToCustomer] Transferring lead files...");
            const leadFilesQuery = query(
                collection(db, "leadFiles"),
                where("leadId", "==", leadId),
                where("orgId", "==", profile.orgId)
            );
            const leadFilesSnap = await getDocs(leadFilesQuery);
            for (const fileDoc of leadFilesSnap.docs) {
                const fileData = fileDoc.data();
                // Create file record in customerFiles collection
                await addDoc(collection(db, "customerFiles"), {
                    ...fileData,
                    customerId: customerRef.id,
                    transferredFromLeadId: leadId,
                    transferredFromFileId: fileDoc.id,
                    updatedAt: serverTimestamp(),
                });
                // Delete original file record (note: actual file in storage remains)
                await deleteDoc(doc(db, "leadFiles", fileDoc.id));
            }
            console.log(`[convertToCustomer] Transferred ${leadFilesSnap.docs.length} files`);

            // Transfer generic reminders (new relatedTo structure)
            console.log("[convertToCustomer] Transferring generic reminders...");
            const genericRemindersQuery = query(
                collection(db, "reminders"),
                where("relatedTo.id", "==", leadId),
                where("relatedTo.type", "==", "lead"),
                where("orgId", "==", profile.orgId)
            );
            const genericRemindersSnap = await getDocs(genericRemindersQuery);
            for (const reminderDoc of genericRemindersSnap.docs) {
                await updateDoc(doc(db, "reminders", reminderDoc.id), {
                    relatedTo: { type: "customer", id: customerRef.id },
                    transferredFromLeadId: leadId,
                    updatedAt: serverTimestamp(),
                });
            }
            console.log(`[convertToCustomer] Transferred ${genericRemindersSnap.docs.length} generic reminders`);

            // Transfer generic files (new relatedTo structure)
            console.log("[convertToCustomer] Transferring generic files...");
            const genericFilesQuery = query(
                collection(db, "files"),
                where("relatedTo.id", "==", leadId),
                where("relatedTo.type", "==", "lead"),
                where("orgId", "==", profile.orgId)
            );
            const genericFilesSnap = await getDocs(genericFilesQuery);
            for (const fileDoc of genericFilesSnap.docs) {
                await updateDoc(doc(db, "files", fileDoc.id), {
                    relatedTo: { type: "customer", id: customerRef.id },
                    transferredFromLeadId: leadId,
                    updatedAt: serverTimestamp(),
                });
            }
            console.log(`[convertToCustomer] Transferred ${genericFilesSnap.docs.length} generic files`);

            console.log("[convertToCustomer] Conversion complete, deleting lead...");
            await deleteDoc(doc(db, "leads", leadId));
            return customerRef.id;
        },
        [profile?.orgId, profile?.uid]
    );

    return {
        leads,
        loading,
        error,
        leadStats,
        createLead,
        updateLead,
        deleteLead,
        bulkDeleteLeads,
        bulkDeleteAllMatches,
        convertToCustomer,
        totalRecords, // Exposed for Server-Side Pagination
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
            // eslint-disable-next-line react-hooks/set-state-in-effect
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
