
// Firestore data hooks for Project-related data
// - Milestones (Kanban/List)
// - Timesheets (Tracking)
// - Files (Project specific)
// - Discussions project threads

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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import type { Milestone, Timesheet, ProjectFile, ProjectDiscussion } from "@/lib/types";
import type { MilestoneFormData, TimeLogFormData, DiscussionFormData } from "@/lib/schemas";

// ============================================
// useMilestones Hook
// ============================================

export function useMilestones(projectId: string | undefined) {
    const { profile } = useUserProfile();
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.orgId || !projectId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, "milestones"),
            where("orgId", "==", profile.orgId),
            where("projectId", "==", projectId),
            orderBy("order", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Milestone[];
            setMilestones(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.orgId, projectId]);

    const createMilestone = useCallback(
        async (data: MilestoneFormData) => {
            if (!profile?.orgId) throw new Error("No organization");

            return await addDoc(collection(db, "milestones"), {
                ...data,
                dueDate: Timestamp.fromDate(data.dueDate),
                projectId: projectId!,
                orgId: profile.orgId,
                status: "incomplete",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        },
        [profile, projectId]
    );

    const updateMilestone = useCallback(async (id: string, data: Partial<MilestoneFormData>) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: any = { ...data, updatedAt: serverTimestamp() };
        if (data.dueDate) updateData.dueDate = Timestamp.fromDate(data.dueDate);
        await updateDoc(doc(db, "milestones", id), updateData);
    }, []);

    const deleteMilestone = useCallback(async (id: string) => {
        await deleteDoc(doc(db, "milestones", id));
    }, []);

    return { milestones, loading, createMilestone, updateMilestone, deleteMilestone };
}

// ============================================
// useTimesheets Hook
// ============================================

export function useTimesheets(projectId: string | undefined, taskId?: string) {
    const { profile } = useUserProfile();
    const [logs, setLogs] = useState<Timesheet[]>([]);
    const [totalDuration, setTotalDuration] = useState(0); // in seconds
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.orgId || !projectId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(false);
            return;
        }

        const constraints: QueryConstraint[] = [
            where("orgId", "==", profile.orgId),
            where("projectId", "==", projectId),
        ];

        if (taskId) {
            constraints.push(where("taskId", "==", taskId));
        }

        constraints.push(orderBy("startTime", "desc"));

        const q = query(collection(db, "timesheets"), ...constraints);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Timesheet[];
            setLogs(data);

            const total = data.reduce((acc, log) => acc + (log.duration || 0), 0);
            setTotalDuration(total);

            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.orgId, projectId, taskId]);

    const logTime = useCallback(
        async (data: TimeLogFormData) => {
            if (!profile?.orgId) throw new Error("No organization");

            // Calculate duration if endTime is provided
            let duration = 0;
            if (data.startTime && data.endTime) {
                duration = Math.floor((data.endTime.getTime() - data.startTime.getTime()) / 1000);
            }

            return await addDoc(collection(db, "timesheets"), {
                ...data,
                billable: data.billable ?? true,
                startTime: Timestamp.fromDate(data.startTime),
                endTime: data.endTime ? Timestamp.fromDate(data.endTime) : null,
                duration,
                userId: profile.uid,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        },
        [profile]
    );

    // Start Timer (create a log with no end time)
    const startTimer = useCallback(async (taskId?: string, note?: string) => {
        if (!profile?.orgId || !projectId) throw new Error("Missing context");

        return await addDoc(collection(db, "timesheets"), {
            projectId,
            taskId,
            userId: profile.uid,
            startTime: serverTimestamp(),
            note,
            billable: true,
            duration: 0,
            orgId: profile.orgId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    }, [profile, projectId]);

    // Stop Timer (update the most recent active log)
    const stopTimer = useCallback(async (logId: string) => {
        // We need to fetch the log first to calculate duration, or do it client side if we have the log
        // For simplicity, assuming the component passes the logId
        // In a real app we might want a dedicated 'activeTimer' state/hook
        const logRef = doc(db, "timesheets", logId);
        await updateDoc(logRef, {
            endTime: serverTimestamp(),
            // Duration would ideally be calculated via a Cloud Function trigger or by reading the doc first
            // Here we just set endTime. The hook will update and we can calc duration on read.
            // BUT for immediate UI feedback, let's update updatedAt
            updatedAt: serverTimestamp(),
        });
    }, []);

    return { logs, totalDuration, loading, logTime, startTimer, stopTimer };
}

// ============================================
// useProjectDiscussions Hook
// ============================================

export function useProjectDiscussions(projectId: string | undefined) {
    const { profile } = useUserProfile();
    const [discussions, setDiscussions] = useState<ProjectDiscussion[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.orgId || !projectId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, "project_discussions"),
            where("orgId", "==", profile.orgId),
            where("projectId", "==", projectId),
            orderBy("lastReply", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as ProjectDiscussion[];
            setDiscussions(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.orgId, projectId]);

    const createDiscussion = useCallback(
        async (data: DiscussionFormData) => {
            if (!profile?.orgId) throw new Error("No organization");

            return await addDoc(collection(db, "project_discussions"), {
                ...data,
                projectId,
                createdBy: profile.uid,
                participants: [profile.uid, ...(data.participants || [])],
                lastReply: serverTimestamp(),
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        },
        [profile, projectId]
    );

    return { discussions, loading, createDiscussion };
}

// ============================================
// useProjectFiles Hook
// ============================================

export function useProjectFiles(projectId: string | undefined) {
    const { profile } = useUserProfile();
    const [files, setFiles] = useState<ProjectFile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.orgId || !projectId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, "project_files"),
            where("orgId", "==", profile.orgId),
            where("projectId", "==", projectId),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as ProjectFile[];
            setFiles(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.orgId, projectId]);

    const uploadFile = useCallback(
        async (file: File) => {
            if (!profile?.orgId || !projectId) throw new Error("Missing context");

            // 1. Upload to Storage
            const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
            const { storage } = await import("@/lib/firebase");
            const storageRef = ref(storage, `organizations/${profile.orgId}/projects/${projectId}/files/${file.name}`);

            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            // 2. Create Firestore Record
            return await addDoc(collection(db, "project_files"), {
                name: file.name,
                url,
                size: file.size,
                type: file.type,
                projectId,
                uploadedBy: profile.email,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        },
        [profile, projectId]
    );

    const deleteFile = useCallback(async (id: string) => {
        await deleteDoc(doc(db, "project_files", id));
    }, []);

    return { files, loading, uploadFile, deleteFile };
}
