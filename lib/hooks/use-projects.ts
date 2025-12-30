// Firestore data hooks for Projects and Tasks
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
    getDoc,
    serverTimestamp,
    Timestamp,
    QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { useActivity } from "@/lib/hooks/use-activity";
import { createBulkNotifications } from "@/lib/hooks/use-notifications";
import type { Project, ProjectStatus, Task, TaskStatus } from "@/lib/types";
import type { ProjectFormData, TaskFormData } from "@/lib/schemas";

// ============================================
// useProjects Hook
// ============================================

interface UseProjectsOptions {
    status?: ProjectStatus | "all";
    customerId?: string;
    orderByField?: "name" | "createdAt" | "deadline";
    orderDirection?: "asc" | "desc";
    limit?: number;
}

export function useProjects(options: UseProjectsOptions = {}) {
    const {
        status = "all",
        customerId,
        orderByField = "createdAt",
        orderDirection = "desc",
        limit: queryLimit = 100,
    } = options;
    const { profile } = useUserProfile();
    const { logActivity } = useActivity({ enabled: false });
    const [projects, setProjects] = useState<Project[]>([]);
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

        if (customerId) {
            constraints.push(where("customerId", "==", customerId));
        }

        constraints.push(orderBy(orderByField, orderDirection));
        constraints.push(limit(queryLimit));

        const q = query(collection(db, "projects"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Project[];
                setProjects(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching projects:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, status, customerId, orderByField, orderDirection, queryLimit]);

    const createProject = useCallback(
        async (data: ProjectFormData): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            // Get customer name
            const customerDoc = await getDoc(doc(db, "customers", data.customerId));
            const customerName = customerDoc.exists() ? customerDoc.data().company : "Unknown Customer";

            const docRef = await addDoc(collection(db, "projects"), {
                ...data,
                customerName,
                progress: 0,
                startDate: data.startDate ? Timestamp.fromDate(data.startDate) : null,
                deadline: data.deadline ? Timestamp.fromDate(data.deadline) : null,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            if (logActivity) {
                await logActivity("project_created", `Created project ${data.name}`, docRef.id, "project");
            }

            return docRef.id;
        },
        [profile?.orgId, profile?.uid, logActivity]
    );

    const updateProject = useCallback(async (id: string, data: Partial<ProjectFormData>): Promise<void> => {
        const updateData: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };

        if (data.startDate) updateData.startDate = Timestamp.fromDate(data.startDate);
        if (data.deadline) updateData.deadline = Timestamp.fromDate(data.deadline);

        await updateDoc(doc(db, "projects", id), updateData);
    }, []);

    const deleteProject = useCallback(async (id: string): Promise<void> => {
        await deleteDoc(doc(db, "projects", id));
    }, []);

    // FIX BLE-005: Update progress with auto-status sync
    const updateProgress = useCallback(async (id: string, progress: number): Promise<{ suggestFinish: boolean }> => {
        const normalizedProgress = Math.min(100, Math.max(0, progress));

        const updateData: Record<string, unknown> = {
            progress: normalizedProgress,
            updatedAt: serverTimestamp(),
        };

        // If progress is 100%, suggest finishing the project
        const suggestFinish = normalizedProgress === 100;

        await updateDoc(doc(db, "projects", id), updateData);

        return { suggestFinish };
    }, []);

    // FIX BLE-005: Update status with auto-progress sync
    const updateStatus = useCallback(
        async (id: string, newStatus: ProjectStatus): Promise<void> => {
            const updateData: Record<string, unknown> = {
                status: newStatus,
                updatedAt: serverTimestamp(),
            };

            // If marking as finished, set progress to 100%
            if (newStatus === "finished") {
                updateData.progress = 100;
                updateData.finishedAt = serverTimestamp();
            }

            // If marking as cancelled, record cancellation time
            if (newStatus === "cancelled") {
                updateData.cancelledAt = serverTimestamp();
            }

            await updateDoc(doc(db, "projects", id), updateData);

            if (logActivity) {
                await logActivity("project_status_changed", `Project status changed to ${newStatus}`, id, "project");
            }
        },
        [logActivity]
    );

    // Calculate project stats by status
    const projectStats = projects.reduce(
        (acc, project) => {
            acc[project.status] = (acc[project.status] || 0) + 1;
            acc.total++;
            return acc;
        },
        { total: 0 } as Record<string, number>
    );

    return {
        projects,
        loading,
        error,
        projectStats,
        createProject,
        updateProject,
        deleteProject,
        updateProgress,
        updateStatus,
    };
}

// ============================================
// useProject Hook (single project)
// ============================================

export function useProject(id: string | null) {
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!id) {
            setProject(null);
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(
            doc(db, "projects", id),
            (snapshot) => {
                if (snapshot.exists()) {
                    setProject({ id: snapshot.id, ...snapshot.data() } as Project);
                } else {
                    setProject(null);
                }
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching project:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [id]);

    return { project, loading, error };
}

// ============================================
// useTasks Hook
// ============================================

interface UseTasksOptions {
    status?: TaskStatus | "all";
    projectId?: string;
    customerId?: string;
    assignee?: string;
    orderByField?: "name" | "createdAt" | "dueDate" | "priority";
    orderDirection?: "asc" | "desc";
    limit?: number;
    relatedTo?: { type: string; id: string };
}

export function useTasks(options: UseTasksOptions = {}) {
    const {
        status = "all",
        projectId,
        customerId,
        assignee,
        orderByField = "createdAt",
        orderDirection = "desc",
        limit: queryLimit = 100,
        relatedTo,
    } = options;
    const { profile } = useUserProfile();
    const { logActivity } = useActivity({ enabled: false });
    const [tasks, setTasks] = useState<Task[]>([]);
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

        if (projectId) {
            constraints.push(where("projectId", "==", projectId));
        }

        if (customerId) {
            constraints.push(where("customerId", "==", customerId));
        }

        if (relatedTo) {
            constraints.push(where("relatedTo.id", "==", relatedTo.id));
            if (relatedTo.type) {
                constraints.push(where("relatedTo.type", "==", relatedTo.type));
            }
        }

        if (assignee) {
            constraints.push(where("assignees", "array-contains", assignee));
        }

        constraints.push(orderBy(orderByField, orderDirection));
        constraints.push(limit(queryLimit));

        const q = query(collection(db, "tasks"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Task[];
                setTasks(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching tasks:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, status, projectId, customerId, assignee, orderByField, orderDirection, queryLimit, relatedTo?.id, relatedTo?.type]);

    const createTask = useCallback(
        async (data: TaskFormData): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            const docRef = await addDoc(collection(db, "tasks"), {
                ...data,
                startDate: data.startDate ? Timestamp.fromDate(data.startDate) : null,
                dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : null,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            // Create notifications for assignees
            if (data.assignees && data.assignees.length > 0) {
                const assigneesToNotify = data.assignees
                    .filter((userId) => userId !== profile.uid) // Don't notify self
                    .map((userId) => ({ userId, orgId: profile.orgId }));

                if (assigneesToNotify.length > 0) {
                    createBulkNotifications(assigneesToNotify, {
                        type: "task.assigned",
                        title: "New Task Assigned",
                        message: `You have been assigned to task: ${data.name}`,
                        link: "/dashboard/tasks",
                        metadata: { taskId: docRef.id },
                    }).catch(console.error);
                }
            }

            return docRef.id;
        },
        [profile?.orgId, profile?.uid]
    );

    const updateTask = useCallback(async (id: string, data: Partial<TaskFormData>): Promise<void> => {
        const updateData: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };

        if (data.startDate) updateData.startDate = Timestamp.fromDate(data.startDate);
        if (data.dueDate) updateData.dueDate = Timestamp.fromDate(data.dueDate);

        await updateDoc(doc(db, "tasks", id), updateData);
    }, []);

    const deleteTask = useCallback(async (id: string): Promise<void> => {
        await deleteDoc(doc(db, "tasks", id));
    }, []);

    const updateTaskStatus = useCallback(
        async (id: string, newStatus: TaskStatus): Promise<void> => {
            await updateDoc(doc(db, "tasks", id), {
                status: newStatus,
                updatedAt: serverTimestamp(),
            });

            if (newStatus === "completed" && logActivity) {
                await logActivity("task_completed", "Task completed", id, "task");
            }
        },
        [logActivity]
    );

    // Calculate task stats
    const taskStats = tasks.reduce(
        (acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            acc[task.priority] = (acc[task.priority] || 0) + 1;
            acc.total++;
            return acc;
        },
        { total: 0 } as Record<string, number>
    );

    return {
        tasks,
        loading,
        error,
        taskStats,
        createTask,
        updateTask,
        deleteTask,
        updateTaskStatus,
    };
}

// ============================================
// useTask Hook (single task)
// ============================================

export function useTask(id: string | null) {
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!id) {
            setTask(null);
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(
            doc(db, "tasks", id),
            (snapshot) => {
                if (snapshot.exists()) {
                    setTask({ id: snapshot.id, ...snapshot.data() } as Task);
                } else {
                    setTask(null);
                }
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching task:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [id]);

    return { task, loading, error };
}
