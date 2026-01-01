// Firestore data hooks for Task Lists
// Task Lists belong to Milestones within Projects

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
    writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import type { TaskList } from "@/lib/types";

interface UseTaskListsOptions {
    projectId?: string;
    milestoneId?: string;
}

export function useTaskLists(options: UseTaskListsOptions = {}) {
    const { projectId, milestoneId } = options;
    const { profile } = useUserProfile();
    const [taskLists, setTaskLists] = useState<TaskList[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!profile?.orgId || !projectId) {
            setTaskLists([]);
            setLoading(false);
            return;
        }

        let q = query(
            collection(db, "task_lists"),
            where("orgId", "==", profile.orgId),
            where("projectId", "==", projectId)
        );

        // If milestoneId provided, filter by it
        if (milestoneId) {
            q = query(
                collection(db, "task_lists"),
                where("orgId", "==", profile.orgId),
                where("milestoneId", "==", milestoneId)
            );
        }

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as TaskList[];
                // Sort by order client-side to avoid compound index
                data.sort((a, b) => (a.order || 0) - (b.order || 0));
                setTaskLists(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching task lists:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, projectId, milestoneId]);

    const createTaskList = useCallback(
        async (data: { name: string; milestoneId: string; projectId: string; color?: string; description?: string }): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            // Calculate next order number
            const maxOrder = taskLists.length > 0
                ? Math.max(...taskLists.filter(tl => tl.milestoneId === data.milestoneId).map(tl => tl.order))
                : 0;

            const docRef = await addDoc(collection(db, "task_lists"), {
                ...data,
                order: maxOrder + 1,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            return docRef.id;
        },
        [profile?.orgId, profile?.uid, taskLists]
    );

    const updateTaskList = useCallback(
        async (id: string, data: Partial<Omit<TaskList, "id" | "orgId" | "createdAt" | "createdBy">>): Promise<void> => {
            await updateDoc(doc(db, "task_lists", id), {
                ...data,
                updatedAt: serverTimestamp(),
            });
        },
        []
    );

    const deleteTaskList = useCallback(async (id: string): Promise<void> => {
        await deleteDoc(doc(db, "task_lists", id));
    }, []);

    const reorderTaskLists = useCallback(
        async (reorderedLists: { id: string; order: number }[]): Promise<void> => {
            const batch = writeBatch(db);

            reorderedLists.forEach(({ id, order }) => {
                const ref = doc(db, "task_lists", id);
                batch.update(ref, { order, updatedAt: serverTimestamp() });
            });

            await batch.commit();
        },
        []
    );

    // Get task lists grouped by milestone
    const taskListsByMilestone = taskLists.reduce((acc, tl) => {
        if (!acc[tl.milestoneId]) {
            acc[tl.milestoneId] = [];
        }
        acc[tl.milestoneId].push(tl);
        return acc;
    }, {} as Record<string, TaskList[]>);

    return {
        taskLists,
        taskListsByMilestone,
        loading,
        error,
        createTaskList,
        updateTaskList,
        deleteTaskList,
        reorderTaskLists,
    };
}
