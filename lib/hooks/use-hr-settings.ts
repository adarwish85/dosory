// HR Settings Hooks - Departments, Job Titles, Leave Types
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
import type { HRDepartment, JobTitle, LeaveType } from "@/lib/types/hr-types";
import type { HRDepartmentFormData, JobTitleFormData, LeaveTypeFormData } from "@/lib/schemas";

// ============================================
// useDepartments Hook
// ============================================

export function useDepartments() {
    const { profile } = useUserProfile();
    const [departments, setDepartments] = useState<HRDepartment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!profile?.orgId) {
            Promise.resolve().then(() => {
                setLoading(false);
            });
            return;
        }

        const q = query(
            collection(db, "departments"),
            where("orgId", "==", profile.orgId),
            orderBy("name", "asc")
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as HRDepartment[];
                setDepartments(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching departments:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId]);

    const createDepartment = useCallback(
        async (data: HRDepartmentFormData): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            const docRef = await addDoc(collection(db, "departments"), {
                ...data,
                employeeCount: 0,
                status: "active",
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            return docRef.id;
        },
        [profile]
    );

    const updateDepartment = useCallback(
        async (id: string, data: Partial<HRDepartmentFormData>): Promise<void> => {
            await updateDoc(doc(db, "departments", id), {
                ...data,
                updatedAt: serverTimestamp(),
            });
        },
        []
    );

    const deleteDepartment = useCallback(async (id: string): Promise<void> => {
        await deleteDoc(doc(db, "departments", id));
    }, []);

    return {
        departments,
        loading,
        error,
        createDepartment,
        updateDepartment,
        deleteDepartment,
    };
}

// ============================================
// useJobTitles Hook
// ============================================

export function useJobTitles(departmentId?: string) {
    const { profile } = useUserProfile();
    const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
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
            collection(db, "job_titles"),
            where("orgId", "==", profile.orgId),
            orderBy("name", "asc")
        );

        // Filter by department if provided
        if (departmentId) {
            q = query(
                collection(db, "job_titles"),
                where("orgId", "==", profile.orgId),
                where("departmentId", "==", departmentId),
                orderBy("name", "asc")
            );
        }

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as JobTitle[];
                setJobTitles(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching job titles:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, departmentId]);

    const createJobTitle = useCallback(
        async (data: JobTitleFormData): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            const docRef = await addDoc(collection(db, "job_titles"), {
                ...data,
                status: "active",
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            return docRef.id;
        },
        [profile]
    );

    const updateJobTitle = useCallback(
        async (id: string, data: Partial<JobTitleFormData>): Promise<void> => {
            await updateDoc(doc(db, "job_titles", id), {
                ...data,
                updatedAt: serverTimestamp(),
            });
        },
        []
    );

    const deleteJobTitle = useCallback(async (id: string): Promise<void> => {
        await deleteDoc(doc(db, "job_titles", id));
    }, []);

    return {
        jobTitles,
        loading,
        error,
        createJobTitle,
        updateJobTitle,
        deleteJobTitle,
    };
}

// ============================================
// useLeaveTypes Hook
// ============================================

// Get default leave types for seeding - exported separately
export function getDefaultLeaveTypes(): LeaveTypeFormData[] {
    return [
        {
            name: "Annual Leave",
            code: "annual",
            description: "Paid annual leave",
            color: "#22c55e",
            defaultDaysPerYear: 21,
            isPaid: true,
            requiresApproval: true,
            allowsHalfDay: true,
        },
        {
            name: "Sick Leave",
            code: "sick",
            description: "Paid sick leave",
            color: "#ef4444",
            defaultDaysPerYear: 14,
            isPaid: true,
            requiresApproval: true,
            allowsHalfDay: true,
        },
        {
            name: "Unpaid Leave",
            code: "unpaid",
            description: "Unpaid time off",
            color: "#6b7280",
            defaultDaysPerYear: 0,
            isPaid: false,
            requiresApproval: true,
            allowsHalfDay: true,
        },
    ];
}

export function useLeaveTypes() {
    const { profile } = useUserProfile();
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!profile?.orgId) {
            Promise.resolve().then(() => {
                setLoading(false);
            });
            return;
        }

        const q = query(
            collection(db, "leave_types"),
            where("orgId", "==", profile.orgId),
            orderBy("name", "asc")
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as LeaveType[];
                setLeaveTypes(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching leave types:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId]);

    const createLeaveType = useCallback(
        async (data: LeaveTypeFormData): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            const docRef = await addDoc(collection(db, "leave_types"), {
                ...data,
                status: "active",
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            return docRef.id;
        },
        [profile]
    );

    const updateLeaveType = useCallback(
        async (id: string, data: Partial<LeaveTypeFormData>): Promise<void> => {
            await updateDoc(doc(db, "leave_types", id), {
                ...data,
                updatedAt: serverTimestamp(),
            });
        },
        []
    );

    const deleteLeaveType = useCallback(async (id: string): Promise<void> => {
        await deleteDoc(doc(db, "leave_types", id));
    }, []);

    return {
        leaveTypes,
        loading,
        error,
        createLeaveType,
        updateLeaveType,
        deleteLeaveType,
    };
}

