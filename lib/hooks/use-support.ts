// Firestore data hooks for Departments and the Knowledge Base.
// Real-time listeners with CRUD operations.
//
// TICKET HOOKS REMOVED 2026-08-07 (Sweep E — read/write collection agreement).
// `useTickets` and `useTicketReplies` lived here and read/wrote `support_tickets`/`orgId`.
// Nothing had written that collection since the support module moved to TicketService
// (`tickets`/`tenantId`), so their three consumers — the customer-tickets tab, the
// project-tickets tab and the dashboard Today view — were permanently empty and silent.
// All ticket access now goes through lib/hooks/use-tickets.ts → TicketService. Deleting
// these rather than leaving them exported is the point: an exported hook pointing at an
// abandoned collection is how a fifth surface silently forks again.
// Pinned by tests/unit/ticket-collection-agreement.test.ts.

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
    increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import type { Department, KnowledgeArticle, KnowledgeGroup } from "@/lib/types";

// ============================================
// useDepartments Hook
// ============================================

export function useDepartments() {
    const { profile } = useUserProfile();
    // Hoisted so the React Compiler's inferred dependency matches the written one exactly
    // (`profile?.orgId`, not the whole `profile` object) — otherwise it refuses to preserve
    // the manual memoization below and skips optimizing the hook.
    const orgId = profile?.orgId;
    const [departments, setDepartments] = useState<Department[]>([]);
    const [subscribing, setSubscribing] = useState(true);

    useEffect(() => {
        if (!orgId) return;

        const q = query(collection(db, "departments"), where("orgId", "==", orgId), orderBy("name", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Department[];
            setDepartments(data);
            setSubscribing(false);
        });

        return () => unsubscribe();
    }, [orgId]);

    const createDepartment = useCallback(
        async (name: string, email?: string): Promise<string> => {
            if (!orgId) throw new Error("No organization");

            const docRef = await addDoc(collection(db, "departments"), {
                name,
                email,
                hideFromClient: false,
                orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            return docRef.id;
        },
        [orgId]
    );

    // Derived, not set from inside the effect body: with no org there is nothing to load.
    const loading = orgId ? subscribing : false;

    return { departments, loading, createDepartment };
}

// ============================================
// useKnowledgeBase Hook
// ============================================

export function useKnowledgeBase() {
    const { profile } = useUserProfile();
    // See the note in useDepartments: hoisting these keeps the React Compiler's inferred
    // dependencies identical to the written ones.
    const orgId = profile?.orgId;
    const uid = profile?.uid;
    const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
    const [groups, setGroups] = useState<KnowledgeGroup[]>([]);
    const [subscribing, setSubscribing] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!orgId) return;

        // Fetch groups - Client-side sort to avoid index requirement
        const groupsQuery = query(collection(db, "knowledgeGroups"), where("orgId", "==", orgId));

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
        const articlesQuery = query(collection(db, "knowledgeArticles"), where("orgId", "==", orgId));

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
                setSubscribing(false);
            },
            (err) => {
                console.error("Error fetching knowledge articles:", err);
                setError(err);
                setSubscribing(false);
            }
        );

        return () => {
            unsubGroups();
            unsubArticles();
        };
    }, [orgId]);

    // Derived rather than set inside the effect body — nothing loads without an org.
    const loading = orgId ? subscribing : false;

    const createArticle = useCallback(
        async (data: {
            subject: string;
            groupId: string;
            content: string;
            description?: string;
            isActive?: boolean;
            internalOnly?: boolean;
        }): Promise<string> => {
            if (!orgId) throw new Error("No organization");

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
                orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: uid,
            });

            return docRef.id;
        },
        [orgId, uid, articles]
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
            if (!orgId) throw new Error("No organization");

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
                orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            return docRef.id;
        },
        [orgId, groups]
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
