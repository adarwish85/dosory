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
    getDocs,
    serverTimestamp,
    Timestamp,
    QueryConstraint,
    writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { useActivity } from "@/lib/hooks/use-activity";
import { createBulkNotifications } from "@/lib/hooks/use-notifications";
import { getCachedData, setCachedData, buildCacheKey } from "@/lib/cache/collection-cache";
import type { Project, ProjectStatus, ProjectHealthStatus, Task, TaskStatus } from "@/lib/types";
import type { ProjectFormData, TaskFormData } from "@/lib/schemas";

// ============================================
// Health Status Calculation Helper
// ============================================

export function calculateProjectHealthStatus(
    tasks: Task[],
    milestones: { dueDate: Date; status: string }[] = []
): ProjectHealthStatus {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Check for overdue items (Off Track)
    const hasOverdueMilestone = milestones.some((m) => m.status !== "complete" && m.dueDate < now);
    const hasOverdueCriticalTask = tasks.some(
        (t) => t.status !== "done" && t.priority === "urgent" && t.dueDate && t.dueDate.toDate() < now
    );

    if (hasOverdueMilestone || hasOverdueCriticalTask) {
        return "off_track";
    }

    // Check for upcoming due items (At Risk)
    const hasUpcomingMilestone = milestones.some(
        (m) => m.status !== "complete" && m.dueDate >= now && m.dueDate <= threeDaysFromNow
    );
    const hasUpcomingTask = tasks.some(
        (t) => t.status !== "done" && t.dueDate && t.dueDate.toDate() >= now && t.dueDate.toDate() <= threeDaysFromNow
    );

    if (hasUpcomingMilestone || hasUpcomingTask) {
        return "at_risk";
    }

    return "on_track";
}

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
    const { profile, loading: profileLoading } = useUserProfile();
    const { logActivity } = useActivity({ enabled: false });

    // Cache key for stale-while-revalidate
    const cacheKey = buildCacheKey("projects", profile?.orgId, status, customerId, orderByField, orderDirection, queryLimit);
    const cached = getCachedData<Project>(cacheKey);

    const [projects, setProjects] = useState<Project[]>(cached || []);
    const [loading, setLoading] = useState(!cached);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (profileLoading) return;

        if (!profile?.orgId) {
            Promise.resolve().then(() => {
                setLoading(false);
            });
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
                setCachedData(cacheKey, data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching projects:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, profileLoading, status, customerId, orderByField, orderDirection, queryLimit]);

    const createProject = useCallback(
        async (data: ProjectFormData): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            // Get customer name
            const customerDoc = await getDoc(doc(db, "customers", data.customerId));
            const customerName = customerDoc.exists() ? customerDoc.data().company : "Unknown Customer";

            const slugify = (text: string) => text.toString().toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w-]+/g, "").replace(/--+/g, "-");
            const docRef = await addDoc(collection(db, "projects"), {
                ...data,
                customerName,
                slug: slugify(data.name),
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
        [profile, logActivity]
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

            // If marking as completed, set progress to 100%
            if (newStatus === "completed") {
                updateData.progress = 100;
                updateData.completedAt = serverTimestamp();
            }

            // If marking as archived, record archival time
            if (newStatus === "archived") {
                updateData.archivedAt = serverTimestamp();
            }

            await updateDoc(doc(db, "projects", id), updateData);

            if (logActivity) {
                await logActivity("project_status_changed", `Project status changed to ${newStatus}`, id, "project");
            }
        },
        [logActivity]
    );

    const duplicateProjectDeep = useCallback(
        async (sourceProjectId: string, newName: string): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            // 1. Fetch Source Project
            const projectSnap = await getDoc(doc(db, "projects", sourceProjectId));
            if (!projectSnap.exists()) throw new Error("Source project not found");
            const projectData = projectSnap.data();

            // 2. Create New Project
            const newProjectData = {
                ...projectData,
                name: newName,
                progress: 0,
                status: "to_do",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
                pinned: false,
            };
            const newProjectRef = await addDoc(collection(db, "projects"), newProjectData);
            const newProjectId = newProjectRef.id;

            // 3. Duplicate Milestones
            const milestonesQuery = query(
                collection(db, "milestones"),
                where("projectId", "==", sourceProjectId),
                where("orgId", "==", profile.orgId)
            );
            const milestonesSnap = await getDocs(milestonesQuery);

            for (const milestoneDoc of milestonesSnap.docs) {
                const milestoneData = milestoneDoc.data();
                const oldMilestoneId = milestoneDoc.id;

                const newMilestoneRef = await addDoc(collection(db, "milestones"), {
                    ...milestoneData,
                    projectId: newProjectId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    status: "incomplete",
                });
                const newMilestoneId = newMilestoneRef.id;

                // 4. Duplicate Task Lists for this Milestone
                const taskListsQuery = query(
                    collection(db, "task_lists"),
                    where("milestoneId", "==", oldMilestoneId),
                    where("orgId", "==", profile.orgId)
                );
                const taskListsSnap = await getDocs(taskListsQuery);

                for (const taskListDoc of taskListsSnap.docs) {
                    const taskListData = taskListDoc.data();
                    const oldTaskListId = taskListDoc.id;

                    const newTaskListRef = await addDoc(collection(db, "task_lists"), {
                        ...taskListData,
                        projectId: newProjectId,
                        milestoneId: newMilestoneId,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        createdBy: profile.uid,
                    });
                    const newTaskListId = newTaskListRef.id;

                    // 5. Duplicate Tasks for this Task List
                    const tasksQuery = query(
                        collection(db, "tasks"),
                        where("taskListId", "==", oldTaskListId),
                        where("orgId", "==", profile.orgId)
                    );
                    const tasksSnap = await getDocs(tasksQuery);

                    const taskBatch = writeBatch(db);
                    tasksSnap.docs.forEach((tDoc) => {
                        const tData = tDoc.data();
                        const tRef = doc(collection(db, "tasks"));
                        taskBatch.set(tRef, {
                            ...tData,
                            projectId: newProjectId,
                            milestoneId: newMilestoneId,
                            taskListId: newTaskListId,
                            status: "to_do",
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp(),
                            createdBy: profile.uid,
                        });
                    });
                    if (tasksSnap.docs.length > 0) {
                        await taskBatch.commit();
                    }
                }
            }

            if (logActivity) {
                await logActivity(
                    "project_duplicated",
                    `Duplicated project from ${projectData.name} to ${newName}`,
                    newProjectId,
                    "project"
                );
            }

            return newProjectId;
        },
        [profile, logActivity]
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
        duplicateProjectDeep,
    };
}

// ============================================
// useProject Hook (single project)
// ============================================

export function useProject(id: string | null) {
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const { profile } = useUserProfile();

    useEffect(() => {
        if (!id) {
            Promise.resolve().then(() => {
                setProject(null);
                setLoading(false);
            });
            return;
        }

        // Try fetching by ID first, if not found try by slug
        const loadProject = async () => {
            try {
                setLoading(true);
                // 1. Try by document ID
                const docRef = doc(db, "projects", id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setProject({ id: docSnap.id, ...docSnap.data() } as Project);
                    setLoading(false);
                    return;
                }

                // 2. If not found and we have orgId, try by slug
                if (profile?.orgId) {
                    const slugQuery = query(
                        collection(db, "projects"),
                        where("slug", "==", id),
                        where("orgId", "==", profile.orgId)
                    );
                    const slugSnap = await getDocs(slugQuery);

                    if (!slugSnap.empty) {
                        const foundDoc = slugSnap.docs[0];
                        setProject({ id: foundDoc.id, ...foundDoc.data() } as Project);
                        setLoading(false);
                        return;
                    }
                }

                // Not found by ID or slug
                setProject(null);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching project:", err);
                setError(err as Error);
                setLoading(false);
            }
        };

        loadProject();
    }, [id, profile?.orgId]);

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
    const { profile, loading: profileLoading } = useUserProfile();
    const { logActivity } = useActivity({ enabled: false });

    // Cache key for stale-while-revalidate
    const taskCacheKey = buildCacheKey("tasks", profile?.orgId, status, projectId, customerId, assignee, orderByField, orderDirection, queryLimit, relatedTo?.id, relatedTo?.type);
    const cachedTasks = getCachedData<Task>(taskCacheKey);

    const [tasks, setTasks] = useState<Task[]>(cachedTasks || []);
    const [loading, setLoading] = useState(!cachedTasks);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (profileLoading) return;

        if (!profile?.orgId) {
            Promise.resolve().then(() => {
                setLoading(false);
            });
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
                setCachedData(taskCacheKey, data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching tasks:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [
        profile?.orgId,
        status,
        projectId,
        customerId,
        assignee,
        orderByField,
        orderDirection,
        queryLimit,
        relatedTo?.id,
        relatedTo?.type,
        relatedTo,
        profileLoading,
    ]);

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
        [profile]
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
            // Check if task is blocked when trying to complete
            if (newStatus === "done") {
                const task = tasks.find((t) => t.id === id);
                if (task?.isBlocked) {
                    throw new Error("Cannot mark as done: Task is blocked by another task");
                }
            }

            await updateDoc(doc(db, "tasks", id), {
                status: newStatus,
                updatedAt: serverTimestamp(),
            });

            // If task completed, auto-unblock dependent tasks
            if (newStatus === "done") {
                // Find tasks blocked by this one
                const q = query(collection(db, "tasks"), where("blockedByTaskId", "==", id));
                const blockedTasks = await getDocs(q);

                for (const blockedDoc of blockedTasks.docs) {
                    await updateDoc(doc(db, "tasks", blockedDoc.id), {
                        isBlocked: false,
                        updatedAt: serverTimestamp(),
                    });
                }

                if (logActivity) {
                    await logActivity("task_completed", "Task completed", id, "task");
                }
            }
        },
        [tasks, logActivity]
    );

    // Set a task as blocked by another
    const setBlocker = useCallback(
        async (taskId: string, blockerTaskId: string | null): Promise<void> => {
            if (!profile?.orgId) throw new Error("No organization");

            if (blockerTaskId) {
                // Get blocker task details
                const blockerDoc = await getDoc(doc(db, "tasks", blockerTaskId));
                if (!blockerDoc.exists()) throw new Error("Blocker task not found");

                const blockerData = blockerDoc.data();
                const isBlocked = blockerData.status !== "done";

                await updateDoc(doc(db, "tasks", taskId), {
                    blockedByTaskId: blockerTaskId,
                    blockedByTaskName: blockerData.name,
                    isBlocked,
                    status: isBlocked ? "blocked" : undefined,
                    updatedAt: serverTimestamp(),
                });
            } else {
                // Remove blocker
                await updateDoc(doc(db, "tasks", taskId), {
                    blockedByTaskId: null,
                    blockedByTaskName: null,
                    isBlocked: false,
                    updatedAt: serverTimestamp(),
                });
            }
        },
        [profile]
    );

    // Calculate task stats
    const taskStats = tasks.reduce(
        (acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            acc[task.priority] = (acc[task.priority] || 0) + 1;
            acc.total++;
            if (task.isBlocked) acc.blocked = (acc.blocked || 0) + 1;
            if (task.dueDate && task.dueDate.toDate() < new Date() && task.status !== "done") {
                acc.overdue = (acc.overdue || 0) + 1;
            }
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
        setBlocker,
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
            Promise.resolve().then(() => {
                setTask(null);
                setLoading(false);
            });
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
