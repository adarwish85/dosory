// Task Comments Hook - CRUD for task comments with real-time updates
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
import type { TaskComment } from "@/lib/types";

// ============================================
// useTaskComments Hook
// ============================================

export function useTaskComments(taskId: string | undefined) {
    const { profile } = useUserProfile();
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!taskId || !profile?.orgId) {
            Promise.resolve().then(() => {
                setComments([]);
                setLoading(false);
            });
            return;
        }

        const q = query(
            collection(db, "task_comments"),
            where("taskId", "==", taskId),
            where("orgId", "==", profile.orgId),
            orderBy("createdAt", "asc")
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as TaskComment[];
                setComments(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching task comments:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [taskId, profile?.orgId]);

    const addComment = useCallback(
        async (content: string, mentions?: string[]): Promise<string> => {
            if (!taskId || !profile?.orgId) throw new Error("No task or organization");

            const docRef = await addDoc(collection(db, "task_comments"), {
                taskId,
                content,
                authorId: profile.uid,
                authorName: profile.displayName || profile.email || "Unknown",
                authorAvatar: profile.photoURL || undefined,
                mentions: mentions || [],
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // Update task comment count and last comment timestamp
            await updateDoc(doc(db, "tasks", taskId), {
                commentCount: increment(1),
                lastCommentAt: serverTimestamp(),
            });

            // Create notifications for mentions
            if (mentions && mentions.length > 0) {
                for (const userId of mentions) {
                    await addDoc(collection(db, "notifications"), {
                        type: "task_mention",
                        title: "You were mentioned",
                        message: `${profile.displayName || "Someone"} mentioned you in a comment`,
                        userId,
                        taskId,
                        read: false,
                        orgId: profile.orgId,
                        createdAt: serverTimestamp(),
                    });
                }
            }

            return docRef.id;
        },
        [taskId, profile]
    );

    const updateComment = useCallback(
        async (commentId: string, content: string): Promise<void> => {
            await updateDoc(doc(db, "task_comments", commentId), {
                content,
                updatedAt: serverTimestamp(),
            });
        },
        []
    );

    const deleteComment = useCallback(
        async (commentId: string): Promise<void> => {
            if (!taskId) throw new Error("No task");

            await deleteDoc(doc(db, "task_comments", commentId));

            // Decrement task comment count
            await updateDoc(doc(db, "tasks", taskId), {
                commentCount: increment(-1),
            });
        },
        [taskId]
    );

    return {
        comments,
        loading,
        error,
        addComment,
        updateComment,
        deleteComment,
    };
}
