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
    serverTimestamp,
    getDocs,
    Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";

// Types
export interface TicketAuthor {
    uid: string;
    name: string;
    email: string;
}

export interface TicketReply {
    id: string;
    message: string;
    attachments?: string[];
    author: {
        uid: string;
        name: string;
        isAdmin: boolean;
    };
    createdAt: Date;
}

export interface PlatformTicket {
    id: string;
    subject: string;
    description: string;
    category: "bug" | "feature" | "billing" | "general";
    priority: "low" | "medium" | "high";
    status: "open" | "in_progress" | "resolved" | "closed";
    attachments?: string[];
    orgId: string;
    orgName: string;
    createdBy: TicketAuthor;
    replies: TicketReply[];
    createdAt: Date;
    updatedAt: Date;
}

export type TicketCategory = PlatformTicket["category"];
export type TicketPriority = PlatformTicket["priority"];
export type TicketStatus = PlatformTicket["status"];

export const TICKET_CATEGORIES: { value: TicketCategory; label: string }[] = [
    { value: "bug", label: "Bug Report" },
    { value: "feature", label: "Feature Request" },
    { value: "billing", label: "Billing Issue" },
    { value: "general", label: "General Question" },
];

export const TICKET_PRIORITIES: { value: TicketPriority; label: string; color: string }[] = [
    { value: "low", label: "Low", color: "bg-gray-100 text-gray-700" },
    { value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-700" },
    { value: "high", label: "High", color: "bg-red-100 text-red-700" },
];

export const TICKET_STATUSES: { value: TicketStatus; label: string; color: string }[] = [
    { value: "open", label: "Open", color: "bg-blue-100 text-blue-700" },
    { value: "in_progress", label: "In Progress", color: "bg-purple-100 text-purple-700" },
    { value: "resolved", label: "Resolved", color: "bg-green-100 text-green-700" },
    { value: "closed", label: "Closed", color: "bg-gray-100 text-gray-700" },
];

// Helper to convert Firestore timestamp
const convertTimestamp = (ts: Timestamp | Date | undefined): Date => {
    if (!ts) return new Date();
    if (ts instanceof Timestamp) return ts.toDate();
    return ts;
};

/**
 * Hook for tenancy users to manage their platform tickets
 */
export function usePlatformTickets() {
    const { profile } = useUserProfile();
    const [tickets, setTickets] = useState<PlatformTicket[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch tickets for the current user's organization
    useEffect(() => {
        if (!profile?.orgId) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, "platformTickets"),
            where("orgId", "==", profile.orgId),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => {
                const d = doc.data();
                return {
                    id: doc.id,
                    ...d,
                    createdAt: convertTimestamp(d.createdAt),
                    updatedAt: convertTimestamp(d.updatedAt),
                    replies: (d.replies || []).map((r: any) => ({
                        ...r,
                        createdAt: convertTimestamp(r.createdAt),
                    })),
                } as PlatformTicket;
            });
            setTickets(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.orgId]);

    // Create a new ticket
    const createTicket = useCallback(
        async (data: {
            subject: string;
            description: string;
            category: TicketCategory;
            priority: TicketPriority;
            attachments?: File[];
        }): Promise<string> => {
            if (!profile?.orgId || !profile?.uid) throw new Error("Not authenticated");

            // Upload attachments if any
            let attachmentUrls: string[] = [];
            if (data.attachments && data.attachments.length > 0) {
                const ticketId = `temp-${Date.now()}`;
                attachmentUrls = await Promise.all(
                    data.attachments.map(async (file) => {
                        const path = `platformTickets/${ticketId}/${Date.now()}-${file.name}`;
                        const storageRef = ref(storage, path);
                        await uploadBytes(storageRef, file);
                        return getDownloadURL(storageRef);
                    })
                );
            }

            const ticketData = {
                subject: data.subject,
                description: data.description,
                category: data.category,
                priority: data.priority,
                status: "open" as TicketStatus,
                attachments: attachmentUrls,
                orgId: profile.orgId,
                orgName: profile.orgId, // Use orgId as display name
                createdBy: {
                    uid: profile.uid,
                    name: `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || profile.email || "User",
                    email: profile.email || "",
                },
                replies: [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const docRef = await addDoc(collection(db, "platformTickets"), ticketData);
            return docRef.id;
        },
        [profile]
    );

    // Add a reply to a ticket (for tenancy users)
    const addReply = useCallback(
        async (ticketId: string, message: string, attachments?: File[]): Promise<void> => {
            if (!profile?.uid) throw new Error("Not authenticated");

            // Upload attachments if any
            let attachmentUrls: string[] = [];
            if (attachments && attachments.length > 0) {
                attachmentUrls = await Promise.all(
                    attachments.map(async (file) => {
                        const path = `platformTickets/${ticketId}/replies/${Date.now()}-${file.name}`;
                        const storageRef = ref(storage, path);
                        await uploadBytes(storageRef, file);
                        return getDownloadURL(storageRef);
                    })
                );
            }

            const ticket = tickets.find((t) => t.id === ticketId);
            if (!ticket) throw new Error("Ticket not found");

            const newReply: TicketReply = {
                id: `reply-${Date.now()}`,
                message,
                attachments: attachmentUrls,
                author: {
                    uid: profile.uid,
                    name: `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "User",
                    isAdmin: false,
                },
                createdAt: new Date(),
            };

            await updateDoc(doc(db, "platformTickets", ticketId), {
                replies: [...ticket.replies, newReply],
                updatedAt: serverTimestamp(),
            });
        },
        [profile, tickets]
    );

    return {
        tickets,
        loading,
        createTicket,
        addReply,
    };
}

/**
 * Hook for super admin to manage all platform tickets
 */
export function useAllPlatformTickets() {
    const [tickets, setTickets] = useState<PlatformTicket[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch all platform tickets
    useEffect(() => {
        const q = query(
            collection(db, "platformTickets"),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => {
                const d = doc.data();
                return {
                    id: doc.id,
                    ...d,
                    createdAt: convertTimestamp(d.createdAt),
                    updatedAt: convertTimestamp(d.updatedAt),
                    replies: (d.replies || []).map((r: any) => ({
                        ...r,
                        createdAt: convertTimestamp(r.createdAt),
                    })),
                } as PlatformTicket;
            });
            setTickets(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Update ticket status
    const updateStatus = useCallback(
        async (ticketId: string, status: TicketStatus): Promise<void> => {
            await updateDoc(doc(db, "platformTickets", ticketId), {
                status,
                updatedAt: serverTimestamp(),
            });
        },
        []
    );

    // Update ticket priority
    const updatePriority = useCallback(
        async (ticketId: string, priority: TicketPriority): Promise<void> => {
            await updateDoc(doc(db, "platformTickets", ticketId), {
                priority,
                updatedAt: serverTimestamp(),
            });
        },
        []
    );

    // Add admin reply to a ticket
    const addAdminReply = useCallback(
        async (
            ticketId: string,
            message: string,
            adminInfo: { uid: string; name: string },
            attachments?: File[]
        ): Promise<void> => {
            // Get current ticket
            const ticket = tickets.find((t) => t.id === ticketId);
            if (!ticket) throw new Error("Ticket not found");

            // Upload attachments if any
            let attachmentUrls: string[] = [];
            if (attachments && attachments.length > 0) {
                attachmentUrls = await Promise.all(
                    attachments.map(async (file) => {
                        const path = `platformTickets/${ticketId}/replies/${Date.now()}-${file.name}`;
                        const storageRef = ref(storage, path);
                        await uploadBytes(storageRef, file);
                        return getDownloadURL(storageRef);
                    })
                );
            }

            const newReply: TicketReply = {
                id: `reply-${Date.now()}`,
                message,
                attachments: attachmentUrls,
                author: {
                    uid: adminInfo.uid,
                    name: adminInfo.name,
                    isAdmin: true,
                },
                createdAt: new Date(),
            };

            await updateDoc(doc(db, "platformTickets", ticketId), {
                replies: [...ticket.replies, newReply],
                updatedAt: serverTimestamp(),
            });
        },
        [tickets]
    );

    // Get ticket counts by status
    const getStatusCounts = useCallback(() => {
        return {
            open: tickets.filter((t) => t.status === "open").length,
            in_progress: tickets.filter((t) => t.status === "in_progress").length,
            resolved: tickets.filter((t) => t.status === "resolved").length,
            closed: tickets.filter((t) => t.status === "closed").length,
            total: tickets.length,
        };
    }, [tickets]);

    return {
        tickets,
        loading,
        updateStatus,
        updatePriority,
        addAdminReply,
        getStatusCounts,
    };
}
