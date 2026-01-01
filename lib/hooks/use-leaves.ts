// Leaves Hook - Leave requests, balances, and approvals
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
    getDoc,
    getDocs,
    serverTimestamp,
    Timestamp,
    writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import type { LeaveRequest, LeaveRequestStatus, LeaveBalance, LeaveType } from "@/lib/types/hr-types";
import type { LeaveRequestFormData } from "@/lib/schemas";

// ============================================
// useLeaveRequests Hook
// ============================================

interface UseLeaveRequestsOptions {
    employeeId?: string;
    departmentId?: string;
    status?: LeaveRequestStatus | "all";
    year?: number;
}

export function useLeaveRequests(options: UseLeaveRequestsOptions = {}) {
    const { employeeId, departmentId, status = "all", year } = options;
    const { profile } = useUserProfile();
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
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
            collection(db, "leave_requests"),
            where("orgId", "==", profile.orgId),
            orderBy("createdAt", "desc")
        );

        if (employeeId) {
            q = query(
                collection(db, "leave_requests"),
                where("orgId", "==", profile.orgId),
                where("employeeId", "==", employeeId),
                orderBy("createdAt", "desc")
            );
        }

        if (departmentId) {
            q = query(
                collection(db, "leave_requests"),
                where("orgId", "==", profile.orgId),
                where("departmentId", "==", departmentId),
                orderBy("createdAt", "desc")
            );
        }

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                let data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as LeaveRequest[];

                // Client-side filtering for status
                if (status !== "all") {
                    data = data.filter((r) => r.status === status);
                }

                // Client-side filtering for year
                if (year) {
                    data = data.filter((r) => r.startDate.toDate().getFullYear() === year);
                }

                setRequests(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching leave requests:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, employeeId, departmentId, status, year]);

    // Submit leave request
    const submitRequest = useCallback(
        async (
            data: LeaveRequestFormData,
            employeeId: string,
            employeeName: string,
            departmentId: string,
            leaveTypeName: string
        ): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            // Calculate total days
            const startDate = data.startDate;
            const endDate = data.endDate;
            let totalDays = 0;

            // Simple day calculation (doesn't account for weekends/holidays)
            const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
            totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            if (data.isHalfDay) {
                totalDays = 0.5;
            }

            // Check leave balance
            const balanceQuery = query(
                collection(db, "leave_balances"),
                where("orgId", "==", profile.orgId),
                where("employeeId", "==", employeeId),
                where("leaveTypeId", "==", data.leaveTypeId),
                where("year", "==", startDate.getFullYear())
            );
            const balanceSnap = await getDocs(balanceQuery);

            if (!balanceSnap.empty) {
                const balance = balanceSnap.docs[0].data() as LeaveBalance;
                if (balance.remaining < totalDays) {
                    throw new Error(`Insufficient leave balance. Available: ${balance.remaining} days`);
                }
            }

            const docRef = await addDoc(collection(db, "leave_requests"), {
                ...data,
                employeeId,
                employeeName,
                departmentId,
                leaveTypeName,
                startDate: Timestamp.fromDate(startDate),
                endDate: Timestamp.fromDate(endDate),
                totalDays,
                status: "pending" as LeaveRequestStatus,
                submittedAt: serverTimestamp(),
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            // Update pending balance
            if (!balanceSnap.empty) {
                const balanceDoc = balanceSnap.docs[0];
                const balanceData = balanceDoc.data() as LeaveBalance;
                await updateDoc(doc(db, "leave_balances", balanceDoc.id), {
                    pending: balanceData.pending + totalDays,
                    remaining: balanceData.remaining - totalDays,
                    updatedAt: serverTimestamp(),
                });
            }

            // Log audit
            await addDoc(collection(db, "hr_audit_logs"), {
                action: "leave_requested",
                targetType: "leave",
                targetId: docRef.id,
                targetName: employeeName,
                description: `${employeeName} requested ${totalDays} day(s) of ${leaveTypeName}`,
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

    // Approve leave request
    const approveRequest = useCallback(
        async (requestId: string): Promise<void> => {
            if (!profile?.orgId) throw new Error("No organization");

            const requestDoc = await getDoc(doc(db, "leave_requests", requestId));
            if (!requestDoc.exists()) throw new Error("Request not found");

            const requestData = requestDoc.data() as LeaveRequest;

            // Update request status
            await updateDoc(doc(db, "leave_requests", requestId), {
                status: "approved",
                approverId: profile.uid,
                approverName: profile.displayName || profile.email,
                approvedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // Update leave balance (move from pending to used)
            const balanceQuery = query(
                collection(db, "leave_balances"),
                where("orgId", "==", profile.orgId),
                where("employeeId", "==", requestData.employeeId),
                where("leaveTypeId", "==", requestData.leaveTypeId),
                where("year", "==", requestData.startDate.toDate().getFullYear())
            );
            const balanceSnap = await getDocs(balanceQuery);

            if (!balanceSnap.empty) {
                const balanceDoc = balanceSnap.docs[0];
                const balanceData = balanceDoc.data() as LeaveBalance;
                await updateDoc(doc(db, "leave_balances", balanceDoc.id), {
                    pending: Math.max(0, balanceData.pending - requestData.totalDays),
                    used: balanceData.used + requestData.totalDays,
                    updatedAt: serverTimestamp(),
                });
            }

            // Create attendance records for leave days
            const batch = writeBatch(db);
            const startDate = requestData.startDate.toDate();
            const endDate = requestData.endDate.toDate();

            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                const attendanceRef = doc(collection(db, "attendance_logs"));
                batch.set(attendanceRef, {
                    employeeId: requestData.employeeId,
                    employeeName: requestData.employeeName,
                    date: Timestamp.fromDate(dayStart),
                    status: "on_leave",
                    leaveRequestId: requestId,
                    orgId: profile.orgId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    createdBy: profile.uid,
                });
            }
            await batch.commit();

            // Log audit
            await addDoc(collection(db, "hr_audit_logs"), {
                action: "leave_approved",
                targetType: "leave",
                targetId: requestId,
                targetName: requestData.employeeName,
                description: `Approved ${requestData.totalDays} day(s) of ${requestData.leaveTypeName} for ${requestData.employeeName}`,
                orgId: profile.orgId,
                userId: profile.uid,
                userName: profile.displayName || profile.email || "Unknown",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        },
        [profile]
    );

    // Reject leave request
    const rejectRequest = useCallback(
        async (requestId: string, reason: string): Promise<void> => {
            if (!profile?.orgId) throw new Error("No organization");

            const requestDoc = await getDoc(doc(db, "leave_requests", requestId));
            if (!requestDoc.exists()) throw new Error("Request not found");

            const requestData = requestDoc.data() as LeaveRequest;

            // Update request status
            await updateDoc(doc(db, "leave_requests", requestId), {
                status: "rejected",
                approverId: profile.uid,
                approverName: profile.displayName || profile.email,
                rejectedAt: serverTimestamp(),
                rejectionReason: reason,
                updatedAt: serverTimestamp(),
            });

            // Restore leave balance
            const balanceQuery = query(
                collection(db, "leave_balances"),
                where("orgId", "==", profile.orgId),
                where("employeeId", "==", requestData.employeeId),
                where("leaveTypeId", "==", requestData.leaveTypeId),
                where("year", "==", requestData.startDate.toDate().getFullYear())
            );
            const balanceSnap = await getDocs(balanceQuery);

            if (!balanceSnap.empty) {
                const balanceDoc = balanceSnap.docs[0];
                const balanceData = balanceDoc.data() as LeaveBalance;
                await updateDoc(doc(db, "leave_balances", balanceDoc.id), {
                    pending: Math.max(0, balanceData.pending - requestData.totalDays),
                    remaining: balanceData.remaining + requestData.totalDays,
                    updatedAt: serverTimestamp(),
                });
            }

            // Log audit
            await addDoc(collection(db, "hr_audit_logs"), {
                action: "leave_rejected",
                targetType: "leave",
                targetId: requestId,
                targetName: requestData.employeeName,
                description: `Rejected ${requestData.leaveTypeName} request for ${requestData.employeeName}. Reason: ${reason}`,
                orgId: profile.orgId,
                userId: profile.uid,
                userName: profile.displayName || profile.email || "Unknown",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        },
        [profile]
    );

    // Cancel leave request (by employee)
    const cancelRequest = useCallback(
        async (requestId: string): Promise<void> => {
            if (!profile?.orgId) throw new Error("No organization");

            const requestDoc = await getDoc(doc(db, "leave_requests", requestId));
            if (!requestDoc.exists()) throw new Error("Request not found");

            const requestData = requestDoc.data() as LeaveRequest;

            if (requestData.status !== "pending") {
                throw new Error("Can only cancel pending requests");
            }

            // Update request status
            await updateDoc(doc(db, "leave_requests", requestId), {
                status: "cancelled",
                updatedAt: serverTimestamp(),
            });

            // Restore leave balance
            const balanceQuery = query(
                collection(db, "leave_balances"),
                where("orgId", "==", profile.orgId),
                where("employeeId", "==", requestData.employeeId),
                where("leaveTypeId", "==", requestData.leaveTypeId),
                where("year", "==", requestData.startDate.toDate().getFullYear())
            );
            const balanceSnap = await getDocs(balanceQuery);

            if (!balanceSnap.empty) {
                const balanceDoc = balanceSnap.docs[0];
                const balanceData = balanceDoc.data() as LeaveBalance;
                await updateDoc(doc(db, "leave_balances", balanceDoc.id), {
                    pending: Math.max(0, balanceData.pending - requestData.totalDays),
                    remaining: balanceData.remaining + requestData.totalDays,
                    updatedAt: serverTimestamp(),
                });
            }

            // Log audit
            await addDoc(collection(db, "hr_audit_logs"), {
                action: "leave_cancelled",
                targetType: "leave",
                targetId: requestId,
                targetName: requestData.employeeName,
                description: `${requestData.employeeName} cancelled ${requestData.leaveTypeName} request`,
                orgId: profile.orgId,
                userId: profile.uid,
                userName: profile.displayName || profile.email || "Unknown",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        },
        [profile]
    );

    // Get pending requests count
    const pendingCount = requests.filter((r) => r.status === "pending").length;

    return {
        requests,
        loading,
        error,
        pendingCount,
        submitRequest,
        approveRequest,
        rejectRequest,
        cancelRequest,
    };
}

// ============================================
// useLeaveBalances Hook
// ============================================

export function useLeaveBalances(employeeId: string | null, year?: number) {
    const { profile } = useUserProfile();
    const [balances, setBalances] = useState<LeaveBalance[]>([]);
    const [loading, setLoading] = useState(true);

    const currentYear = year || new Date().getFullYear();

    useEffect(() => {
        if (!profile?.orgId || !employeeId) {
            Promise.resolve().then(() => {
                setBalances([]);
                setLoading(false);
            });
            return;
        }

        const q = query(
            collection(db, "leave_balances"),
            where("orgId", "==", profile.orgId),
            where("employeeId", "==", employeeId),
            where("year", "==", currentYear)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as LeaveBalance[];
            setBalances(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.orgId, employeeId, currentYear]);

    // Initialize balances for an employee (called when creating employee or at year start)
    const initializeBalances = useCallback(
        async (empId: string, leaveTypes: LeaveType[]): Promise<void> => {
            if (!profile?.orgId) throw new Error("No organization");

            const batch = writeBatch(db);

            for (const leaveType of leaveTypes) {
                const balanceRef = doc(collection(db, "leave_balances"));
                batch.set(balanceRef, {
                    employeeId: empId,
                    leaveTypeId: leaveType.id,
                    leaveTypeName: leaveType.name,
                    year: currentYear,
                    entitled: leaveType.defaultDaysPerYear,
                    used: 0,
                    pending: 0,
                    remaining: leaveType.defaultDaysPerYear,
                    carriedOver: 0,
                    orgId: profile.orgId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    createdBy: profile.uid,
                });
            }

            await batch.commit();
        },
        [profile, currentYear]
    );

    // Adjust balance (HR Admin only)
    const adjustBalance = useCallback(
        async (balanceId: string, adjustment: number, reason: string): Promise<void> => {
            if (!profile?.orgId) throw new Error("No organization");

            const balanceDoc = await getDoc(doc(db, "leave_balances", balanceId));
            if (!balanceDoc.exists()) throw new Error("Balance not found");

            const balanceData = balanceDoc.data() as LeaveBalance;
            const newEntitled = balanceData.entitled + adjustment;
            const newRemaining = balanceData.remaining + adjustment;

            await updateDoc(doc(db, "leave_balances", balanceId), {
                entitled: newEntitled,
                remaining: newRemaining,
                updatedAt: serverTimestamp(),
            });

            // Log audit
            await addDoc(collection(db, "hr_audit_logs"), {
                action: "leave_approved", // Using existing action type
                targetType: "leave",
                targetId: balanceId,
                description: `Leave balance adjusted by ${adjustment} days. Reason: ${reason}`,
                oldValue: { entitled: balanceData.entitled, remaining: balanceData.remaining },
                newValue: { entitled: newEntitled, remaining: newRemaining },
                orgId: profile.orgId,
                userId: profile.uid,
                userName: profile.displayName || profile.email || "Unknown",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        },
        [profile]
    );

    return {
        balances,
        loading,
        initializeBalances,
        adjustBalance,
    };
}

// ============================================
// useTeamLeaveCalendar Hook
// ============================================

export function useTeamLeaveCalendar(departmentId?: string, month?: number, year?: number) {
    const { profile } = useUserProfile();
    const [leaveEvents, setLeaveEvents] = useState<
        { id: string; employeeId: string; employeeName: string; leaveType: string; startDate: Date; endDate: Date; status: LeaveRequestStatus }[]
    >([]);
    const [loading, setLoading] = useState(true);

    const currentMonth = month ?? new Date().getMonth();
    const currentYear = year ?? new Date().getFullYear();

    useEffect(() => {
        if (!profile?.orgId) {
            Promise.resolve().then(() => {
                setLoading(false);
            });
            return;
        }

        // Get start and end of month
        const monthStart = new Date(currentYear, currentMonth, 1);
        const monthEnd = new Date(currentYear, currentMonth + 1, 0);

        let q = query(
            collection(db, "leave_requests"),
            where("orgId", "==", profile.orgId),
            where("status", "in", ["approved", "pending"]),
            orderBy("startDate", "asc")
        );

        if (departmentId) {
            q = query(
                collection(db, "leave_requests"),
                where("orgId", "==", profile.orgId),
                where("departmentId", "==", departmentId),
                where("status", "in", ["approved", "pending"]),
                orderBy("startDate", "asc")
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs
                .map((doc) => {
                    const d = doc.data() as LeaveRequest;
                    return {
                        id: doc.id,
                        employeeId: d.employeeId,
                        employeeName: d.employeeName,
                        leaveType: d.leaveTypeName,
                        startDate: d.startDate.toDate(),
                        endDate: d.endDate.toDate(),
                        status: d.status,
                    };
                })
                .filter((event) => {
                    // Filter events that overlap with the current month
                    return event.startDate <= monthEnd && event.endDate >= monthStart;
                });

            setLeaveEvents(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.orgId, departmentId, currentMonth, currentYear]);

    return { leaveEvents, loading };
}
