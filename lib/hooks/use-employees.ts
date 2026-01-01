// Employees Hook - Core employee management
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
import type { Employee, EmployeeStatus, HRAuditLog } from "@/lib/types/hr-types";
import type { EmployeeFormData } from "@/lib/schemas";

// ============================================
// useEmployees Hook
// ============================================

interface UseEmployeesOptions {
    status?: EmployeeStatus | "all";
    departmentId?: string;
    managerId?: string;
    orderByField?: "firstName" | "lastName" | "hireDate" | "createdAt";
    orderDirection?: "asc" | "desc";
    limit?: number;
}

export function useEmployees(options: UseEmployeesOptions = {}) {
    const {
        status = "all",
        departmentId,
        managerId,
        orderByField = "firstName",
        orderDirection = "asc",
        limit: queryLimit = 100,
    } = options;
    const { profile } = useUserProfile();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
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

        if (departmentId) {
            constraints.push(where("departmentId", "==", departmentId));
        }

        if (managerId) {
            constraints.push(where("reportingManagerId", "==", managerId));
        }

        constraints.push(orderBy(orderByField, orderDirection));
        constraints.push(limit(queryLimit));

        const q = query(collection(db, "employees"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Employee[];
                setEmployees(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching employees:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, status, departmentId, managerId, orderByField, orderDirection, queryLimit]);

    const createEmployee = useCallback(
        async (data: EmployeeFormData): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            // Fetch department and job title names for denormalization
            let departmentName = "";
            let jobTitleName = "";
            let reportingManagerName = "";

            if (data.departmentId) {
                const deptDoc = await getDoc(doc(db, "departments", data.departmentId));
                if (deptDoc.exists()) {
                    departmentName = deptDoc.data().name;
                }
            }

            if (data.jobTitleId) {
                const jobDoc = await getDoc(doc(db, "job_titles", data.jobTitleId));
                if (jobDoc.exists()) {
                    jobTitleName = jobDoc.data().name;
                }
            }

            if (data.reportingManagerId) {
                const mgrDoc = await getDoc(doc(db, "employees", data.reportingManagerId));
                if (mgrDoc.exists()) {
                    const mgrData = mgrDoc.data();
                    reportingManagerName = `${mgrData.firstName} ${mgrData.lastName}`;
                }
            }

            const docRef = await addDoc(collection(db, "employees"), {
                ...data,
                departmentName,
                jobTitleName,
                reportingManagerName,
                hireDate: Timestamp.fromDate(data.hireDate),
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            // Log audit
            await logHRAudit({
                action: "employee_created",
                targetType: "employee",
                targetId: docRef.id,
                targetName: `${data.firstName} ${data.lastName}`,
                description: `Created employee ${data.firstName} ${data.lastName}`,
                orgId: profile.orgId,
                userId: profile.uid,
                userName: profile.displayName || profile.email || "Unknown",
            });

            // Update department employee count
            if (data.departmentId) {
                const deptRef = doc(db, "departments", data.departmentId);
                const deptDoc = await getDoc(deptRef);
                if (deptDoc.exists()) {
                    const currentCount = deptDoc.data().employeeCount || 0;
                    await updateDoc(deptRef, { employeeCount: currentCount + 1 });
                }
            }

            return docRef.id;
        },
        [profile]
    );

    const updateEmployee = useCallback(
        async (id: string, data: Partial<EmployeeFormData>): Promise<void> => {
            if (!profile?.orgId) throw new Error("No organization");

            const updateData: Record<string, unknown> = {
                ...data,
                updatedAt: serverTimestamp(),
            };

            // Convert dates
            if (data.hireDate) {
                updateData.hireDate = Timestamp.fromDate(data.hireDate);
            }

            // Update denormalized names if IDs changed
            if (data.departmentId) {
                const deptDoc = await getDoc(doc(db, "departments", data.departmentId));
                if (deptDoc.exists()) {
                    updateData.departmentName = deptDoc.data().name;
                }
            }

            if (data.jobTitleId) {
                const jobDoc = await getDoc(doc(db, "job_titles", data.jobTitleId));
                if (jobDoc.exists()) {
                    updateData.jobTitleName = jobDoc.data().name;
                }
            }

            if (data.reportingManagerId) {
                const mgrDoc = await getDoc(doc(db, "employees", data.reportingManagerId));
                if (mgrDoc.exists()) {
                    const mgrData = mgrDoc.data();
                    updateData.reportingManagerName = `${mgrData.firstName} ${mgrData.lastName}`;
                }
            }

            // Get old data for audit
            const oldDoc = await getDoc(doc(db, "employees", id));
            const oldData = oldDoc.exists() ? oldDoc.data() : {};

            await updateDoc(doc(db, "employees", id), updateData);

            // Log audit
            await logHRAudit({
                action: "employee_updated",
                targetType: "employee",
                targetId: id,
                targetName: `${oldData.firstName || ""} ${oldData.lastName || ""}`,
                description: `Updated employee record`,
                oldValue: oldData as Record<string, unknown>,
                newValue: updateData,
                orgId: profile.orgId,
                userId: profile.uid,
                userName: profile.displayName || profile.email || "Unknown",
            });
        },
        [profile]
    );

    const terminateEmployee = useCallback(
        async (id: string, terminationDate: Date): Promise<void> => {
            if (!profile?.orgId) throw new Error("No organization");

            const empDoc = await getDoc(doc(db, "employees", id));
            if (!empDoc.exists()) throw new Error("Employee not found");

            const empData = empDoc.data();

            await updateDoc(doc(db, "employees", id), {
                status: "terminated",
                terminationDate: Timestamp.fromDate(terminationDate),
                updatedAt: serverTimestamp(),
            });

            // Log audit
            await logHRAudit({
                action: "employee_terminated",
                targetType: "employee",
                targetId: id,
                targetName: `${empData.firstName} ${empData.lastName}`,
                description: `Terminated employee ${empData.firstName} ${empData.lastName}`,
                orgId: profile.orgId,
                userId: profile.uid,
                userName: profile.displayName || profile.email || "Unknown",
            });

            // Update department employee count
            if (empData.departmentId) {
                const deptRef = doc(db, "departments", empData.departmentId);
                const deptDoc = await getDoc(deptRef);
                if (deptDoc.exists()) {
                    const currentCount = deptDoc.data().employeeCount || 0;
                    await updateDoc(deptRef, { employeeCount: Math.max(0, currentCount - 1) });
                }
            }
        },
        [profile]
    );

    const deleteEmployee = useCallback(
        async (id: string): Promise<void> => {
            await deleteDoc(doc(db, "employees", id));
        },
        []
    );

    // Get employees grouped by department
    const employeesByDepartment = employees.reduce(
        (acc, emp) => {
            const dept = emp.departmentName || "Unassigned";
            if (!acc[dept]) {
                acc[dept] = [];
            }
            acc[dept].push(emp);
            return acc;
        },
        {} as Record<string, Employee[]>
    );

    // Get managers (employees with hrRole of manager or hr_admin)
    const managers = employees.filter((emp) => emp.hrRole === "manager" || emp.hrRole === "hr_admin");

    // Employee stats
    const employeeStats = {
        total: employees.length,
        active: employees.filter((e) => e.status === "active").length,
        onLeave: employees.filter((e) => e.status === "on_leave").length,
        terminated: employees.filter((e) => e.status === "terminated").length,
        fullTime: employees.filter((e) => e.employmentType === "full_time").length,
        partTime: employees.filter((e) => e.employmentType === "part_time").length,
        contractor: employees.filter((e) => e.employmentType === "contractor").length,
    };

    return {
        employees,
        loading,
        error,
        employeesByDepartment,
        managers,
        employeeStats,
        createEmployee,
        updateEmployee,
        terminateEmployee,
        deleteEmployee,
    };
}

// ============================================
// useEmployee Hook (Single Employee)
// ============================================

export function useEmployee(id: string | null) {
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!id) {
            Promise.resolve().then(() => {
                setEmployee(null);
                setLoading(false);
            });
            return;
        }

        const unsubscribe = onSnapshot(
            doc(db, "employees", id),
            (snapshot) => {
                if (snapshot.exists()) {
                    setEmployee({ id: snapshot.id, ...snapshot.data() } as Employee);
                } else {
                    setEmployee(null);
                }
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching employee:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [id]);

    return { employee, loading, error };
}

// ============================================
// useCurrentEmployee Hook
// ============================================

export function useCurrentEmployee() {
    const { profile } = useUserProfile();
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.orgId || !profile?.uid) {
            Promise.resolve().then(() => {
                setLoading(false);
            });
            return;
        }

        const q = query(
            collection(db, "employees"),
            where("orgId", "==", profile.orgId),
            where("userId", "==", profile.uid),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                setEmployee({ id: doc.id, ...doc.data() } as Employee);
            } else {
                setEmployee(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.orgId, profile?.uid]);

    return { employee, loading };
}

// ============================================
// HR Audit Logging Helper
// ============================================

interface LogHRAuditParams {
    action: HRAuditLog["action"];
    targetType: HRAuditLog["targetType"];
    targetId: string;
    targetName?: string;
    description: string;
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    orgId: string;
    userId: string;
    userName: string;
}

async function logHRAudit(params: LogHRAuditParams): Promise<void> {
    try {
        await addDoc(collection(db, "hr_audit_logs"), {
            ...params,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Failed to log HR audit:", error);
    }
}

// ============================================
// useTeamMembers Hook (For Managers)
// ============================================

export function useTeamMembers(managerId: string | null) {
    const { profile } = useUserProfile();
    const [teamMembers, setTeamMembers] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.orgId || !managerId) {
            Promise.resolve().then(() => {
                setTeamMembers([]);
                setLoading(false);
            });
            return;
        }

        const q = query(
            collection(db, "employees"),
            where("orgId", "==", profile.orgId),
            where("reportingManagerId", "==", managerId),
            where("status", "==", "active"),
            orderBy("firstName", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Employee[];
            setTeamMembers(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.orgId, managerId]);

    return { teamMembers, loading };
}
