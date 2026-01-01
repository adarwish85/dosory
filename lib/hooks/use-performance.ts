// Performance Notes Hook - Manager notes, ratings, and flags
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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import type { PerformanceNote, PerformanceRating, PerformanceFlag } from "@/lib/types/hr-types";
import type { PerformanceNoteFormData } from "@/lib/schemas";

// ============================================
// usePerformanceNotes Hook
// ============================================

interface UsePerformanceNotesOptions {
    employeeId?: string;
    year?: number;
    flag?: PerformanceFlag;
}

export function usePerformanceNotes(options: UsePerformanceNotesOptions = {}) {
    const { employeeId, year, flag } = options;
    const { profile } = useUserProfile();
    const [notes, setNotes] = useState<PerformanceNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!profile?.orgId) {
            Promise.resolve().then(() => {
                setLoading(false);
            });
            return;
        }

        let q = query(
            collection(db, "performance_notes"),
            where("orgId", "==", profile.orgId),
            orderBy("createdAt", "desc")
        );

        if (employeeId) {
            q = query(
                collection(db, "performance_notes"),
                where("orgId", "==", profile.orgId),
                where("employeeId", "==", employeeId),
                orderBy("year", "desc"),
                orderBy("month", "desc")
            );
        }

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                let data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as PerformanceNote[];

                // Client-side filtering
                if (year) {
                    data = data.filter((n) => n.year === year);
                }
                if (flag && flag !== "none") {
                    data = data.filter((n) => n.flag === flag);
                }

                setNotes(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching performance notes:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, employeeId, year, flag]);

    // Create performance note
    const createNote = useCallback(
        async (data: PerformanceNoteFormData, employeeName: string): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            // Get project/task names if IDs provided
            let projectName: string | undefined;
            let taskName: string | undefined;

            // Note: In production, you'd fetch these from their respective collections
            // For now, we'll leave them undefined unless passed in

            const docRef = await addDoc(collection(db, "performance_notes"), {
                ...data,
                employeeName,
                projectName,
                taskName,
                authorId: profile.uid,
                authorName: profile.displayName || profile.email || "Unknown",
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            // Log audit
            await addDoc(collection(db, "hr_audit_logs"), {
                action: "performance_note_added",
                targetType: "performance",
                targetId: docRef.id,
                targetName: employeeName,
                description: `Added performance note for ${employeeName} (${data.month}/${data.year})${data.rating ? ` - Rating: ${data.rating}/5` : ""}${data.flag && data.flag !== "none" ? ` - Flag: ${data.flag}` : ""}`,
                orgId: profile.orgId,
                userId: profile.uid,
                userName: profile.displayName || profile.email || "Unknown",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            return docRef.id;
        },
        [profile]
    );

    // Update performance note
    const updateNote = useCallback(
        async (id: string, data: Partial<PerformanceNoteFormData>): Promise<void> => {
            await updateDoc(doc(db, "performance_notes", id), {
                ...data,
                updatedAt: serverTimestamp(),
            });
        },
        []
    );

    // Delete performance note
    const deleteNote = useCallback(async (id: string): Promise<void> => {
        await deleteDoc(doc(db, "performance_notes", id));
    }, []);

    // Get average rating for an employee
    const getAverageRating = useCallback(
        (empId: string): number | null => {
            const empNotes = notes.filter((n) => n.employeeId === empId && n.rating);
            if (empNotes.length === 0) return null;

            const sum = empNotes.reduce((acc, n) => acc + (n.rating || 0), 0);
            return Math.round((sum / empNotes.length) * 10) / 10; // Round to 1 decimal
        },
        [notes]
    );

    // Get employees with specific flags
    const getEmployeesWithFlag = useCallback(
        (targetFlag: PerformanceFlag): string[] => {
            const flaggedNotes = notes.filter((n) => n.flag === targetFlag);
            return [...new Set(flaggedNotes.map((n) => n.employeeId))];
        },
        [notes]
    );

    // Get performance summary stats
    const performanceStats = {
        totalNotes: notes.length,
        promotionCandidates: notes.filter((n) => n.flag === "promotion_candidate").length,
        performanceConcerns: notes.filter((n) => n.flag === "performance_concern").length,
        averageRating:
            notes.filter((n) => n.rating).length > 0
                ? notes.filter((n) => n.rating).reduce((sum, n) => sum + (n.rating || 0), 0) / notes.filter((n) => n.rating).length
                : null,
    };

    return {
        notes,
        loading,
        error,
        performanceStats,
        createNote,
        updateNote,
        deleteNote,
        getAverageRating,
        getEmployeesWithFlag,
    };
}

// ============================================
// Rating Display Helpers
// ============================================

export const ratingLabels: Record<PerformanceRating, string> = {
    1: "Needs Improvement",
    2: "Below Expectations",
    3: "Meets Expectations",
    4: "Exceeds Expectations",
    5: "Outstanding",
};

export const ratingColors: Record<PerformanceRating, string> = {
    1: "text-red-600 bg-red-50",
    2: "text-orange-600 bg-orange-50",
    3: "text-yellow-600 bg-yellow-50",
    4: "text-green-600 bg-green-50",
    5: "text-emerald-600 bg-emerald-50",
};

export const flagLabels: Record<PerformanceFlag, string> = {
    promotion_candidate: "Promotion Candidate",
    performance_concern: "Performance Concern",
    none: "No Flag",
};

export const flagColors: Record<PerformanceFlag, string> = {
    promotion_candidate: "text-emerald-600 bg-emerald-50",
    performance_concern: "text-red-600 bg-red-50",
    none: "text-gray-600 bg-gray-50",
};
