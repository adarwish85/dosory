// Attendance Hook - Clock in/out, time tracking, attendance logs
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
    getDocs,
    serverTimestamp,
    Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import type { AttendanceLog, AttendanceStatus, WorkSchedule } from "@/lib/types/hr-types";
import type { AttendanceLogFormData, WorkScheduleFormData } from "@/lib/schemas";

// ============================================
// useAttendance Hook
// ============================================

interface UseAttendanceOptions {
    employeeId?: string;
    startDate?: Date;
    endDate?: Date;
}

export function useAttendance(options: UseAttendanceOptions = {}) {
    const { employeeId, startDate, endDate } = options;
    const { profile } = useUserProfile();
    const [logs, setLogs] = useState<AttendanceLog[]>([]);
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
            collection(db, "attendance_logs"),
            where("orgId", "==", profile.orgId),
            orderBy("date", "desc")
        );

        // Note: Firestore requires composite indexes for multiple where + orderBy
        // For complex filters, we may need to filter client-side
        if (employeeId) {
            q = query(
                collection(db, "attendance_logs"),
                where("orgId", "==", profile.orgId),
                where("employeeId", "==", employeeId),
                orderBy("date", "desc")
            );
        }

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                let data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as AttendanceLog[];

                // Client-side date filtering
                if (startDate) {
                    const startTs = Timestamp.fromDate(startDate);
                    data = data.filter((log) => log.date >= startTs);
                }
                if (endDate) {
                    const endTs = Timestamp.fromDate(endDate);
                    data = data.filter((log) => log.date <= endTs);
                }

                setLogs(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching attendance logs:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, employeeId, startDate, endDate]);

    // Clock In
    const clockIn = useCallback(
        async (empId: string, empName: string): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            // Check if there's already a log for today
            const existingQuery = query(
                collection(db, "attendance_logs"),
                where("orgId", "==", profile.orgId),
                where("employeeId", "==", empId),
                where("date", "==", Timestamp.fromDate(todayStart))
            );
            const existingSnap = await getDocs(existingQuery);

            if (!existingSnap.empty) {
                // Update existing log
                const existingDoc = existingSnap.docs[0];
                await updateDoc(doc(db, "attendance_logs", existingDoc.id), {
                    clockIn: serverTimestamp(),
                    status: "present",
                    updatedAt: serverTimestamp(),
                });
                return existingDoc.id;
            }

            // Create new log
            const docRef = await addDoc(collection(db, "attendance_logs"), {
                employeeId: empId,
                employeeName: empName,
                date: Timestamp.fromDate(todayStart),
                clockIn: serverTimestamp(),
                status: "present" as AttendanceStatus,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            return docRef.id;
        },
        [profile]
    );

    // Clock Out
    const clockOut = useCallback(
        async (empId: string): Promise<void> => {
            if (!profile?.orgId) throw new Error("No organization");

            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            // Find today's log
            const todayQuery = query(
                collection(db, "attendance_logs"),
                where("orgId", "==", profile.orgId),
                where("employeeId", "==", empId),
                where("date", "==", Timestamp.fromDate(todayStart))
            );
            const todaySnap = await getDocs(todayQuery);

            if (todaySnap.empty) {
                throw new Error("No clock-in record found for today");
            }

            const logDoc = todaySnap.docs[0];
            const logData = logDoc.data();

            // Calculate worked minutes
            const clockInTime = logData.clockIn?.toDate();
            const clockOutTime = new Date();
            let workedMinutes = 0;
            let overtimeMinutes = 0;

            if (clockInTime) {
                workedMinutes = Math.floor((clockOutTime.getTime() - clockInTime.getTime()) / 60000);
                // Standard work day is 8 hours = 480 minutes
                if (workedMinutes > 480) {
                    overtimeMinutes = workedMinutes - 480;
                }
            }

            await updateDoc(doc(db, "attendance_logs", logDoc.id), {
                clockOut: serverTimestamp(),
                workedMinutes,
                overtimeMinutes,
                hasOvertime: overtimeMinutes > 0,
                updatedAt: serverTimestamp(),
            });

            // Log audit for overtime
            if (overtimeMinutes > 0) {
                await addDoc(collection(db, "hr_audit_logs"), {
                    action: "attendance_edited",
                    targetType: "attendance",
                    targetId: logDoc.id,
                    description: `Overtime recorded: ${Math.floor(overtimeMinutes / 60)}h ${overtimeMinutes % 60}m`,
                    orgId: profile.orgId,
                    userId: profile.uid,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
            }
        },
        [profile]
    );

    // Manual Entry (HR Admin or Manager)
    const createManualEntry = useCallback(
        async (data: AttendanceLogFormData, empName: string): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            let workedMinutes = 0;
            let overtimeMinutes = 0;

            if (data.clockIn && data.clockOut) {
                workedMinutes = Math.floor((data.clockOut.getTime() - data.clockIn.getTime()) / 60000);
                if (workedMinutes > 480) {
                    overtimeMinutes = workedMinutes - 480;
                }
            }

            const dateStart = new Date(data.date.getFullYear(), data.date.getMonth(), data.date.getDate());

            const docRef = await addDoc(collection(db, "attendance_logs"), {
                ...data,
                employeeName: empName,
                date: Timestamp.fromDate(dateStart),
                clockIn: data.clockIn ? Timestamp.fromDate(data.clockIn) : null,
                clockOut: data.clockOut ? Timestamp.fromDate(data.clockOut) : null,
                workedMinutes,
                overtimeMinutes,
                hasOvertime: overtimeMinutes > 0,
                isManualEntry: true,
                manualEntryBy: profile.uid,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            // Log audit
            await addDoc(collection(db, "hr_audit_logs"), {
                action: "attendance_manual_entry",
                targetType: "attendance",
                targetId: docRef.id,
                targetName: empName,
                description: `Manual attendance entry for ${empName} on ${data.date.toDateString()}`,
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

    // Update attendance log
    const updateAttendanceLog = useCallback(
        async (id: string, data: Partial<AttendanceLogFormData>): Promise<void> => {
            if (!profile?.orgId) throw new Error("No organization");

            const updateData: Record<string, unknown> = {
                ...data,
                updatedAt: serverTimestamp(),
            };

            if (data.clockIn) updateData.clockIn = Timestamp.fromDate(data.clockIn);
            if (data.clockOut) updateData.clockOut = Timestamp.fromDate(data.clockOut);
            if (data.date) updateData.date = Timestamp.fromDate(data.date);

            // Recalculate worked minutes if times changed
            if (data.clockIn && data.clockOut) {
                const workedMinutes = Math.floor((data.clockOut.getTime() - data.clockIn.getTime()) / 60000);
                updateData.workedMinutes = workedMinutes;
                updateData.overtimeMinutes = workedMinutes > 480 ? workedMinutes - 480 : 0;
                updateData.hasOvertime = workedMinutes > 480;
            }

            await updateDoc(doc(db, "attendance_logs", id), updateData);

            // Log audit
            await addDoc(collection(db, "hr_audit_logs"), {
                action: "attendance_edited",
                targetType: "attendance",
                targetId: id,
                description: `Attendance record edited`,
                orgId: profile.orgId,
                userId: profile.uid,
                userName: profile.displayName || profile.email || "Unknown",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        },
        [profile]
    );

    // Get today's attendance for an employee
    const getTodayAttendance = useCallback(
        (empId: string): AttendanceLog | undefined => {
            const today = new Date();
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const todayTs = Timestamp.fromDate(todayStart);

            return logs.find(
                (log) => log.employeeId === empId && log.date.seconds === todayTs.seconds
            );
        },
        [logs]
    );

    // Calculate monthly summary
    const getMonthSummary = useCallback(
        (empId: string, year: number, month: number) => {
            const monthLogs = logs.filter((log) => {
                const logDate = log.date.toDate();
                return (
                    log.employeeId === empId &&
                    logDate.getFullYear() === year &&
                    logDate.getMonth() === month
                );
            });

            return {
                totalDays: monthLogs.length,
                presentDays: monthLogs.filter((l) => l.status === "present").length,
                lateDays: monthLogs.filter((l) => l.isLate).length,
                earlyLeaveDays: monthLogs.filter((l) => l.isEarlyLeave).length,
                absentDays: monthLogs.filter((l) => l.status === "absent").length,
                leaveDays: monthLogs.filter((l) => l.status === "on_leave").length,
                totalWorkedMinutes: monthLogs.reduce((sum, l) => sum + (l.workedMinutes || 0), 0),
                totalOvertimeMinutes: monthLogs.reduce((sum, l) => sum + (l.overtimeMinutes || 0), 0),
            };
        },
        [logs]
    );

    return {
        logs,
        loading,
        error,
        clockIn,
        clockOut,
        createManualEntry,
        updateAttendanceLog,
        getTodayAttendance,
        getMonthSummary,
    };
}

// ============================================
// useWorkSchedules Hook
// ============================================

export function useWorkSchedules(employeeId?: string) {
    const { profile } = useUserProfile();
    const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.orgId) {
            Promise.resolve().then(() => {
                setLoading(false);
            });
            return;
        }

        let q = query(
            collection(db, "work_schedules"),
            where("orgId", "==", profile.orgId),
            orderBy("createdAt", "desc")
        );

        if (employeeId) {
            q = query(
                collection(db, "work_schedules"),
                where("orgId", "==", profile.orgId),
                where("employeeId", "==", employeeId),
                orderBy("effectiveFrom", "desc")
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as WorkSchedule[];
            setSchedules(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.orgId, employeeId]);

    const createSchedule = useCallback(
        async (data: WorkScheduleFormData): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            const docRef = await addDoc(collection(db, "work_schedules"), {
                ...data,
                effectiveFrom: Timestamp.fromDate(data.effectiveFrom),
                effectiveTo: data.effectiveTo ? Timestamp.fromDate(data.effectiveTo) : null,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            return docRef.id;
        },
        [profile]
    );

    const updateSchedule = useCallback(
        async (id: string, data: Partial<WorkScheduleFormData>): Promise<void> => {
            const updateData: Record<string, unknown> = {
                ...data,
                updatedAt: serverTimestamp(),
            };

            if (data.effectiveFrom) updateData.effectiveFrom = Timestamp.fromDate(data.effectiveFrom);
            if (data.effectiveTo) updateData.effectiveTo = Timestamp.fromDate(data.effectiveTo);

            await updateDoc(doc(db, "work_schedules", id), updateData);
        },
        []
    );

    // Get active schedule for an employee
    const getActiveSchedule = useCallback(
        (empId: string): WorkSchedule | undefined => {
            const now = new Date();
            return schedules.find((s) => {
                const from = s.effectiveFrom.toDate();
                const to = s.effectiveTo?.toDate();
                return s.employeeId === empId && from <= now && (!to || to >= now);
            });
        },
        [schedules]
    );

    // Get default work schedule template
    const getDefaultSchedule = useCallback((): WorkScheduleFormData["weeklySchedule"] => {
        const defaultDay = { enabled: true, startTime: "09:00", endTime: "17:00", breakMinutes: 60 };
        const weekendDay = { enabled: false, startTime: "09:00", endTime: "17:00", breakMinutes: 0 };

        return {
            sunday: weekendDay,
            monday: defaultDay,
            tuesday: defaultDay,
            wednesday: defaultDay,
            thursday: defaultDay,
            friday: defaultDay,
            saturday: weekendDay,
        };
    }, []);

    return {
        schedules,
        loading,
        createSchedule,
        updateSchedule,
        getActiveSchedule,
        getDefaultSchedule,
    };
}
