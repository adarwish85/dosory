// Firestore data hooks for Leads
// Real-time listeners with CRUD operations

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

export interface ConvertLeadOptions {
    company?: string;
    email?: string;
    createContact?: boolean;
    createProjectFromDeal?: boolean;
    createInvoiceFromEstimate?: boolean;
    selectedEstimateId?: string;
}

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
    const { profile, loading: profileLoading } = useUserProfile();

    // Data State
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Pagination State
    const [totalRecords, setTotalRecords] = useState(0);
    const [cursors, setCursors] = useState<Record<number, QueryDocumentSnapshot>>({}); // Store last doc of each page

    // Stats State
    const [leadStats, setLeadStats] = useState({ total: 0, totalValue: 0, starred: 0, qualified: 0 });

    // Listener version tracking to prevent stale updates
    const listenerVersionRef = useRef(0);

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
        if (profileLoading) return;
        let isMounted = true;
        const fetchStatsAndCount = async () => {
            if (!profile?.orgId) return;
            try {
                // 1. Aggregation for global stats
                const globalQ = query(collection(db, "leads"), where("orgId", "==", profile.orgId));

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
                    } catch { }
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
    }, [profile?.orgId, profileLoading, getBaseConstraints]);

    // Effect: Fetch Paginated Data
    useEffect(() => {
        // Increment version to invalidate previous listeners
        const currentVersion = ++listenerVersionRef.current;

        console.log("📊 useLeads effect v" + currentVersion + ":", { profileLoading, orgId: profile?.orgId, page, pageSize, orderByField, orderDirection });

        if (profileLoading) {
            console.log("📊 useLeads v" + currentVersion + ": Waiting for profile...");
            return;
        }

        if (!profile?.orgId) {
            console.log("📊 useLeads v" + currentVersion + ": No orgId, skipping");
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
                console.warn("useLeads v" + currentVersion + ": Missing cursor for page " + page);
            }
        }

        constraints.push(limit(pageSize));

        const q = query(collection(db, "leads"), ...constraints);
        console.log("📊 useLeads v" + currentVersion + ": Setting up listener for orgId:", profile.orgId);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                // Check if this is still the active listener
                if (listenerVersionRef.current !== currentVersion) {
                    console.log("📊 useLeads v" + currentVersion + ": STALE - ignoring (current is v" + listenerVersionRef.current + ")");
                    return;
                }

                console.log("📊 useLeads v" + currentVersion + ": Received", snapshot.docs.length, "leads");
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
                // Check if this is still the active listener
                if (listenerVersionRef.current !== currentVersion) {
                    console.log("📊 useLeads v" + currentVersion + ": STALE error - ignoring");
                    return;
                }

                console.error("📊 useLeads v" + currentVersion + ": Error:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => {
            console.log("📊 useLeads v" + currentVersion + ": Cleaning up");
            unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.orgId, profileLoading, getBaseConstraints, orderByField, orderDirection, pageSize, page]);

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
        [profile?.orgId, profile?.uid]
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
        [leads]
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
        async (leadId: string, options: ConvertLeadOptions = {}): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            const {
                company,
                email,
                createContact = true,
                createProjectFromDeal = false,
                createInvoiceFromEstimate = false,
                selectedEstimateId,
            } = options;

            // Get lead data
            const leadDocRef = doc(db, "leads", leadId);
            const leadSnap = await getDoc(leadDocRef);

            if (!leadSnap.exists()) throw new Error("Lead not found");
            const leadDoc = { id: leadSnap.id, ...leadSnap.data() } as Lead;

            if (leadDoc.convertedToCustomerId) {
                throw new Error("Lead already converted to customer: " + leadDoc.convertedToCustomerId);
            }

            const finalCompany = company || leadDoc.company || leadDoc.name;
            const finalEmail = email || leadDoc.email || "";

            console.log("🔄 Starting lead conversion for ID:", leadId);

            // 1. Create Customer
            console.log("🔄 Step 1: Creating customer...");
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
            console.log("✅ Customer created:", customerRef.id);

            // 2. Create Contact (Optional)
            if (createContact) {
                console.log("🔄 Step 2: Creating contact...");
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
                await addDoc(collection(db, "contacts"), contactData);
                console.log("✅ Contact created.");
            }

            // 3. Create Project from Deal (Optional)
            let newProjectId: string | undefined;
            if (createProjectFromDeal && leadDoc.deal) {
                console.log("🔄 Step 3: Creating project from deal...");
                const projectData = {
                    name: leadDoc.deal.subject || `Project for ${finalCompany}`,
                    customerId: customerRef.id,
                    description: leadDoc.deal.description || "",
                    status: "to_do",
                    projectRate: leadDoc.deal.value || 0,
                    startDate: serverTimestamp(),
                    deadline: leadDoc.deal.expectedCloseDate || null,
                    billingType: "fixed",
                    orgId: profile.orgId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    createdBy: profile.uid,
                };
                const projectRef = await addDoc(collection(db, "projects"), projectData);
                newProjectId = projectRef.id;
                console.log("✅ Project created:", newProjectId);
            }

            // 4. Create Invoice from Estimate (Optional)
            if (createInvoiceFromEstimate && selectedEstimateId) {
                console.log("🔄 Step 4: Creating invoice from estimate:", selectedEstimateId);
                const estimateSnap = await getDoc(doc(db, "estimates", selectedEstimateId));
                if (estimateSnap.exists()) {
                    const estData = estimateSnap.data();
                    const invoiceData = {
                        customerId: customerRef.id,
                        customerName: finalCompany,
                        projectId: newProjectId || null,
                        date: serverTimestamp(),
                        dueDate: serverTimestamp(),
                        status: "draft",
                        currency: estData.currency,
                        subtotal: estData.subtotal,
                        discount: estData.discount,
                        taxTotal: estData.taxTotal,
                        total: estData.total,
                        items: estData.items,
                        amountPaid: 0,
                        amountDue: estData.total,
                        notes: estData.notes || "",
                        terms: estData.terms || "",
                        orgId: profile.orgId,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        createdBy: profile.uid,
                        fromEstimateId: selectedEstimateId,
                        fromEstimateNumber: estData.number,
                        number: `INV-${Date.now().toString().slice(-6)}`,
                    };
                    const invRef = await addDoc(collection(db, "invoices"), invoiceData);

                    await updateDoc(doc(db, "estimates", selectedEstimateId), {
                        status: "accepted",
                        convertedToInvoiceId: invRef.id,
                        updatedAt: serverTimestamp(),
                    });
                    console.log("✅ Invoice created and estimate updated.");
                }
            }

            // 5. Transfer related items
            console.log("🔄 Step 5: Transferring related items...");
            const transferRelated = async (coll: string, field: string) => {
                const q = query(collection(db, coll), where(field, "==", leadId), where("orgId", "==", profile.orgId));
                const snap = await getDocs(q);
                const batch = writeBatch(db);
                snap.docs.forEach((d) => {
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
                transferRelated("tasks", "relatedTo.id"),
            ]);
            console.log("✅ Related items transferred.");

            // 6. Transfer lead notes
            console.log("🔄 Step 6: Transferring notes...");
            const leadNotesRef = collection(db, "leads", leadId, "notes");
            const leadNotesSnap = await getDocs(leadNotesRef);
            for (const noteDoc of leadNotesSnap.docs) {
                const noteData = noteDoc.data();
                await addDoc(collection(db, "customers", customerRef.id, "notes"), {
                    ...noteData,
                    addedFrom: profile?.email || "System",
                    description: noteData.content || noteData.description || "",
                    dateAdded: noteData.createdAt
                        ? new Date(noteData.createdAt.toDate()).toLocaleString()
                        : new Date().toLocaleString(),
                    customerId: customerRef.id,
                    orgId: profile.orgId,
                    transferredFromLeadId: leadId,
                    transferredFromNoteId: noteDoc.id,
                    createdAt: noteData.createdAt || serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                await deleteDoc(doc(db, "leads", leadId, "notes", noteDoc.id));
            }
            console.log("✅ Notes transferred.");

            // 7. Transfer generic reminders
            console.log("🔄 Step 7: Transferring reminders...");
            const genericRemindersQuery = query(
                collection(db, "reminders"),
                where("relatedTo.id", "==", leadId),
                where("orgId", "==", profile.orgId)
            );
            const genericRemindersSnap = await getDocs(genericRemindersQuery);
            for (const reminderDoc of genericRemindersSnap.docs) {
                await updateDoc(doc(db, "reminders", reminderDoc.id), {
                    relatedTo: { type: "customer", id: customerRef.id },
                    customerId: customerRef.id,
                    transferredFromLeadId: leadId,
                    updatedAt: serverTimestamp(),
                });
            }
            console.log("✅ Reminders transferred.");

            // 8. Transfer activities
            console.log("🔄 Step 8: Transferring activities...");
            const activitiesQuery = query(
                collection(db, "activities"),
                where("relatedTo.id", "==", leadId),
                where("orgId", "==", profile.orgId)
            );
            const activitiesSnap = await getDocs(activitiesQuery);
            for (const activityDoc of activitiesSnap.docs) {
                await updateDoc(doc(db, "activities", activityDoc.id), {
                    relatedTo: { type: "customer", id: customerRef.id },
                    customerId: customerRef.id,
                    transferredFromLeadId: leadId,
                    updatedAt: serverTimestamp(),
                });
            }
            console.log("✅ Activities transferred.");

            // 9. Transfer generic files
            console.log("🔄 Step 9: Transferring files...");
            const genericFilesQuery = query(
                collection(db, "files"),
                where("relatedTo.id", "==", leadId),
                where("orgId", "==", profile.orgId)
            );
            const genericFilesSnap = await getDocs(genericFilesQuery);
            for (const fileDoc of genericFilesSnap.docs) {
                const fileData = fileDoc.data();
                await addDoc(collection(db, "customer_files"), {
                    ...fileData,
                    customerId: customerRef.id,
                    relatedTo: { type: "customer", id: customerRef.id },
                    transferredFromLeadId: leadId,
                    createdAt: fileData.createdAt || serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                await deleteDoc(fileDoc.ref);
            }
            console.log("✅ Files transferred.");

            // 10. Delete Lead
            console.log("🔄 Step 10: Deleting lead...");
            await deleteDoc(doc(db, "leads", leadId));
            console.log("✅ Lead deleted successfully.");

            return customerRef.id;
        },
        [profile?.orgId, profile?.uid, profile?.email]
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
