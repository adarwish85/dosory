// Firestore data hooks for Support Tickets and Knowledge Base
// Real-time listeners with CRUD operations

"use client";

import { useState, useEffect, useCallback } from "react";
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    Timestamp,
    QueryConstraint,
    increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import type {
    Ticket,
    TicketStatus,
    TicketPriority,
    TicketReply,
    Department,
    KnowledgeArticle,
    KnowledgeGroup,
} from "@/lib/types";
import type { TicketFormData, TicketReplyFormData } from "@/lib/schemas";

// ============================================
// useTickets Hook
// ============================================

interface UseTicketsOptions {
    status?: TicketStatus | "all";
    priority?: TicketPriority;
    departmentId?: string;
    assignedTo?: string;
    customerId?: string;
    projectId?: string;
}

export function useTickets(options: UseTicketsOptions = {}) {
    const { status = "all", priority, departmentId, assignedTo, customerId, projectId } = options;
    const { profile } = useUserProfile();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!profile?.orgId) {
            setLoading(false);
            return;
        }

        const constraints: QueryConstraint[] = [where("orgId", "==", profile.orgId)];

        if (status !== "all") {
            constraints.push(where("status", "==", status));
        }

        if (priority) {
            constraints.push(where("priority", "==", priority));
        }

        if (departmentId) {
            constraints.push(where("departmentId", "==", departmentId));
        }

        if (assignedTo) {
            constraints.push(where("assignedTo", "==", assignedTo));
        }

        if (customerId) {
            constraints.push(where("customerId", "==", customerId));
        }

        if (projectId) {
            constraints.push(where("projectId", "==", projectId));
        }

        constraints.push(orderBy("createdAt", "desc"));

        const q = query(collection(db, "support_tickets"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Ticket[];
                setTickets(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching tickets:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, status, priority, departmentId, assignedTo, customerId, projectId]);

    const createTicket = useCallback(
        async (data: TicketFormData): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            const docRef = await addDoc(collection(db, "support_tickets"), {
                ...data,
                status: "open",
                lastReplyByStaff: false,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            return docRef.id;
        },
        [profile?.orgId, profile?.uid]
    );

    const updateTicket = useCallback(async (id: string, data: Partial<TicketFormData>): Promise<void> => {
        await updateDoc(doc(db, "support_tickets", id), {
            ...data,
            updatedAt: serverTimestamp(),
        });
    }, []);

    const deleteTicket = useCallback(async (id: string): Promise<void> => {
        await deleteDoc(doc(db, "support_tickets", id));
    }, []);

    const updateTicketStatus = useCallback(async (id: string, newStatus: TicketStatus): Promise<void> => {
        await updateDoc(doc(db, "support_tickets", id), {
            status: newStatus,
            updatedAt: serverTimestamp(),
        });
    }, []);

    const assignTicket = useCallback(async (id: string, staffId: string): Promise<void> => {
        await updateDoc(doc(db, "support_tickets", id), {
            assignedTo: staffId,
            status: "in_progress",
            updatedAt: serverTimestamp(),
        });
    }, []);

    // Calculate ticket stats
    const ticketStats = tickets.reduce(
        (acc, ticket) => {
            acc[ticket.status] = (acc[ticket.status] || 0) + 1;
            acc[`priority_${ticket.priority}`] = (acc[`priority_${ticket.priority}`] || 0) + 1;
            acc.total++;
            return acc;
        },
        { total: 0 } as Record<string, number>
    );

    return {
        tickets,
        loading,
        error,
        ticketStats,
        createTicket,
        updateTicket,
        deleteTicket,
        updateTicketStatus,
        assignTicket,
    };
}

// ============================================
// useTicketReplies Hook
// ============================================

export function useTicketReplies(ticketId: string | null) {
    const { profile } = useUserProfile();
    const [replies, setReplies] = useState<TicketReply[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!ticketId || !profile?.orgId) {
            setLoading(false);
            return;
        }

        const q = query(collection(db, "support_tickets", ticketId, "messages"), orderBy("createdAt", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as TicketReply[];
            setReplies(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [ticketId, profile?.orgId]);

    const addReply = useCallback(
        async (data: TicketReplyFormData): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            const isStaff = true; // In a real app, check user role

            const docRef = await addDoc(collection(db, "support_tickets", data.ticketId, "messages"), {
                ...data,
                isStaffReply: isStaff,
                staffId: isStaff ? profile.uid : null,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // Update ticket with last reply info
            await updateDoc(doc(db, "support_tickets", data.ticketId), {
                lastReply: serverTimestamp(),
                lastReplyByStaff: isStaff,
                status: isStaff ? "answered" : "open",
                updatedAt: serverTimestamp(),
            });

            return docRef.id;
        },
        [profile?.orgId, profile?.uid]
    );

    return { replies, loading, addReply };
}

// ============================================
// useDepartments Hook
// ============================================

export function useDepartments() {
    const { profile } = useUserProfile();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.orgId) {
            setLoading(false);
            return;
        }

        const q = query(collection(db, "departments"), where("orgId", "==", profile.orgId), orderBy("name", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Department[];
            setDepartments(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.orgId]);

    const createDepartment = useCallback(
        async (name: string, email?: string): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            const docRef = await addDoc(collection(db, "departments"), {
                name,
                email,
                hideFromClient: false,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            return docRef.id;
        },
        [profile?.orgId]
    );

    return { departments, loading, createDepartment };
}

// ============================================
// useKnowledgeBase Hook
// ============================================

export function useKnowledgeBase() {
    const { profile } = useUserProfile();
    const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
    const [groups, setGroups] = useState<KnowledgeGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!profile?.orgId) {
            setLoading(false);
            return;
        }

        // Fetch groups - Client-side sort to avoid index requirement
        const groupsQuery = query(collection(db, "knowledgeGroups"), where("orgId", "==", profile.orgId));

        const unsubGroups = onSnapshot(
            groupsQuery,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as KnowledgeGroup[];
                // Sort by order
                data.sort((a, b) => (a.order || 0) - (b.order || 0));
                setGroups(data);
            },
            (err) => {
                console.error("Error fetching knowledge groups:", err);
                // Don't set global error to avoid blocking other UI, but log it
            }
        );

        // Fetch articles - Client-side sort to avoid index requirement
        const articlesQuery = query(collection(db, "knowledgeArticles"), where("orgId", "==", profile.orgId));

        const unsubArticles = onSnapshot(
            articlesQuery,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as KnowledgeArticle[];
                // Sort by order
                data.sort((a, b) => (a.order || 0) - (b.order || 0));
                setArticles(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching knowledge articles:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => {
            unsubGroups();
            unsubArticles();
        };
    }, [profile?.orgId]);

    const createArticle = useCallback(
        async (data: {
            subject: string;
            groupId: string;
            content: string;
            description?: string;
            isActive?: boolean;
            internalOnly?: boolean;
        }): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            // Generate slug
            const slug = data.subject
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");

            // Get max order
            const maxOrder =
                articles.length > 0
                    ? Math.max(...articles.filter((a) => a.groupId === data.groupId).map((a) => a.order))
                    : 0;

            const docRef = await addDoc(collection(db, "knowledgeArticles"), {
                ...data,
                slug,
                order: maxOrder + 1,
                views: 0,
                isActive: data.isActive ?? true,
                internalOnly: data.internalOnly ?? false,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            return docRef.id;
        },
        [profile?.orgId, profile?.uid, articles]
    );

    const updateArticle = useCallback(async (id: string, data: Partial<KnowledgeArticle>): Promise<void> => {
        await updateDoc(doc(db, "knowledgeArticles", id), {
            ...data,
            updatedAt: serverTimestamp(),
        });
    }, []);

    const deleteArticle = useCallback(async (id: string): Promise<void> => {
        await deleteDoc(doc(db, "knowledgeArticles", id));
    }, []);

    const incrementViews = useCallback(async (id: string): Promise<void> => {
        await updateDoc(doc(db, "knowledgeArticles", id), {
            views: increment(1),
        });
    }, []);

    const createGroup = useCallback(
        async (data: { name: string; description?: string; color?: string }): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            const slug = data.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");

            const maxOrder = groups.length > 0 ? Math.max(...groups.map((g) => g.order)) : 0;

            const docRef = await addDoc(collection(db, "knowledgeGroups"), {
                ...data,
                slug,
                order: maxOrder + 1,
                isActive: true,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            return docRef.id;
        },
        [profile?.orgId, groups]
    );

    const updateGroup = useCallback(async (id: string, data: Partial<KnowledgeGroup>): Promise<void> => {
        await updateDoc(doc(db, "knowledgeGroups", id), {
            ...data,
            updatedAt: serverTimestamp(),
        });
    }, []);

    const deleteGroup = useCallback(async (id: string): Promise<void> => {
        await deleteDoc(doc(db, "knowledgeGroups", id));
    }, []);

    return {
        articles,
        groups,
        loading,
        error,
        createArticle,
        updateArticle,
        deleteArticle,
        incrementViews,
        createGroup,
        updateGroup,
        deleteGroup,
    };
}
