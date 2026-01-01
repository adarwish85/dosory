// Payroll Hook - Salary inputs, allowances, deductions, summaries
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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import type { PayrollInput, PayrollSummary, PayrollSummaryItem } from "@/lib/types/hr-types";
import type { PayrollInputFormData } from "@/lib/schemas";

// ============================================
// usePayrollInputs Hook
// ============================================

interface UsePayrollInputsOptions {
    employeeId?: string;
    activeOnly?: boolean;
}

export function usePayrollInputs(options: UsePayrollInputsOptions = {}) {
    const { employeeId, activeOnly = true } = options;
    const { profile } = useUserProfile();
    const [payrollInputs, setPayrollInputs] = useState<PayrollInput[]>([]);
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
            collection(db, "payroll_inputs"),
            where("orgId", "==", profile.orgId),
            orderBy("createdAt", "desc")
        );

        if (employeeId) {
            q = query(
                collection(db, "payroll_inputs"),
                where("orgId", "==", profile.orgId),
                where("employeeId", "==", employeeId),
                orderBy("effectiveFrom", "desc")
            );
        }

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                let data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as PayrollInput[];

                if (activeOnly) {
                    data = data.filter((p) => p.isActive);
                }

                setPayrollInputs(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching payroll inputs:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, employeeId, activeOnly]);

    // Create payroll input
    const createPayrollInput = useCallback(
        async (data: PayrollInputFormData, employeeName: string): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            // Calculate totals
            const totalAllowances = data.allowances.reduce((sum, a) => sum + a.amount, 0);
            const totalDeductions = data.deductions.reduce((sum, d) => sum + d.amount, 0);
            const grossSalary = data.baseSalary + totalAllowances;
            const netSalary = grossSalary - totalDeductions;

            // Deactivate previous active payroll for this employee
            const prevQuery = query(
                collection(db, "payroll_inputs"),
                where("orgId", "==", profile.orgId),
                where("employeeId", "==", data.employeeId),
                where("isActive", "==", true)
            );
            const prevSnap = await getDocs(prevQuery);

            for (const prevDoc of prevSnap.docs) {
                await updateDoc(doc(db, "payroll_inputs", prevDoc.id), {
                    isActive: false,
                    effectiveTo: Timestamp.fromDate(data.effectiveFrom),
                    updatedAt: serverTimestamp(),
                });
            }

            const docRef = await addDoc(collection(db, "payroll_inputs"), {
                ...data,
                employeeName,
                effectiveFrom: Timestamp.fromDate(data.effectiveFrom),
                effectiveTo: data.effectiveTo ? Timestamp.fromDate(data.effectiveTo) : null,
                totalAllowances,
                totalDeductions,
                grossSalary,
                netSalary,
                isActive: true,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            // Log audit
            await addDoc(collection(db, "hr_audit_logs"), {
                action: "salary_changed",
                targetType: "payroll",
                targetId: docRef.id,
                targetName: employeeName,
                description: `Created payroll input for ${employeeName}. Base salary: ${data.currency} ${data.baseSalary}`,
                newValue: { baseSalary: data.baseSalary, grossSalary, netSalary },
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

    // Update payroll input
    const updatePayrollInput = useCallback(
        async (id: string, data: Partial<PayrollInputFormData>): Promise<void> => {
            if (!profile?.orgId) throw new Error("No organization");

            const updateData: Record<string, unknown> = {
                ...data,
                updatedAt: serverTimestamp(),
            };

            // Get current data for audit
            const currentDoc = await getDoc(doc(db, "payroll_inputs", id));
            const currentData = currentDoc.exists() ? (currentDoc.data() as PayrollInput) : null;

            // Recalculate totals if allowances or deductions changed
            if (data.allowances || data.deductions || data.baseSalary !== undefined) {
                const allowances = data.allowances || currentData?.allowances || [];
                const deductions = data.deductions || currentData?.deductions || [];
                const baseSalary = data.baseSalary ?? currentData?.baseSalary ?? 0;

                const totalAllowances = allowances.reduce((sum, a) => sum + a.amount, 0);
                const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
                const grossSalary = baseSalary + totalAllowances;
                const netSalary = grossSalary - totalDeductions;

                updateData.totalAllowances = totalAllowances;
                updateData.totalDeductions = totalDeductions;
                updateData.grossSalary = grossSalary;
                updateData.netSalary = netSalary;
            }

            if (data.effectiveFrom) updateData.effectiveFrom = Timestamp.fromDate(data.effectiveFrom);
            if (data.effectiveTo) updateData.effectiveTo = Timestamp.fromDate(data.effectiveTo);

            await updateDoc(doc(db, "payroll_inputs", id), updateData);

            // Log audit
            await addDoc(collection(db, "hr_audit_logs"), {
                action: "payroll_updated",
                targetType: "payroll",
                targetId: id,
                targetName: currentData?.employeeName || "Unknown",
                description: `Updated payroll input`,
                oldValue: currentData ? { baseSalary: currentData.baseSalary, grossSalary: currentData.grossSalary } : null,
                newValue: updateData,
                orgId: profile.orgId,
                userId: profile.uid,
                userName: profile.displayName || profile.email || "Unknown",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        },
        [profile]
    );

    // Get active payroll for an employee
    const getActivePayroll = useCallback(
        (empId: string): PayrollInput | undefined => {
            return payrollInputs.find((p) => p.employeeId === empId && p.isActive);
        },
        [payrollInputs]
    );

    // Calculate total payroll cost
    const totalPayrollCost = payrollInputs
        .filter((p) => p.isActive)
        .reduce((sum, p) => sum + p.grossSalary, 0);

    return {
        payrollInputs,
        loading,
        error,
        totalPayrollCost,
        createPayrollInput,
        updatePayrollInput,
        getActivePayroll,
    };
}

// ============================================
// usePayrollSummary Hook
// ============================================

export function usePayrollSummary() {
    const { profile } = useUserProfile();
    const [summaries, setSummaries] = useState<PayrollSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.orgId) {
            Promise.resolve().then(() => {
                setLoading(false);
            });
            return;
        }

        const q = query(
            collection(db, "payroll_summaries"),
            where("orgId", "==", profile.orgId),
            orderBy("generatedAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as PayrollSummary[];
            setSummaries(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.orgId]);

    // Generate payroll summary for a period
    const generateSummary = useCallback(
        async (period: string): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            // Get all active payroll inputs
            const payrollQuery = query(
                collection(db, "payroll_inputs"),
                where("orgId", "==", profile.orgId),
                where("isActive", "==", true)
            );
            const payrollSnap = await getDocs(payrollQuery);

            // Get attendance for overtime calculation
            const [year, month] = period.split("-").map(Number);
            const monthStart = new Date(year, month - 1, 1);
            const monthEnd = new Date(year, month, 0);

            const attendanceQuery = query(
                collection(db, "attendance_logs"),
                where("orgId", "==", profile.orgId),
                where("date", ">=", Timestamp.fromDate(monthStart)),
                where("date", "<=", Timestamp.fromDate(monthEnd))
            );
            const attendanceSnap = await getDocs(attendanceQuery);

            // Group attendance by employee for overtime
            const overtimeByEmployee: Record<string, number> = {};
            attendanceSnap.docs.forEach((doc) => {
                const data = doc.data();
                if (data.overtimeMinutes) {
                    overtimeByEmployee[data.employeeId] = (overtimeByEmployee[data.employeeId] || 0) + data.overtimeMinutes;
                }
            });

            // Build summary items
            const items: PayrollSummaryItem[] = [];
            let totalBaseSalary = 0;
            let totalAllowances = 0;
            let totalDeductions = 0;
            let totalOvertime = 0;
            let totalGross = 0;
            let totalNet = 0;

            payrollSnap.docs.forEach((doc) => {
                const p = doc.data() as PayrollInput;
                const overtimeMinutes = overtimeByEmployee[p.employeeId] || 0;
                const overtimeHours = overtimeMinutes / 60;
                const hourlyRate = p.baseSalary / 160; // Assuming 160 work hours/month
                const overtimeAmount = overtimeHours * hourlyRate * (p.overtimeRate || 1.5);

                const itemGross = p.grossSalary + overtimeAmount;
                const itemNet = p.netSalary + overtimeAmount;

                items.push({
                    employeeId: p.employeeId,
                    employeeName: p.employeeName,
                    departmentName: "", // Would need to join with employee data
                    baseSalary: p.baseSalary,
                    allowances: p.totalAllowances,
                    deductions: p.totalDeductions,
                    overtime: overtimeAmount,
                    gross: itemGross,
                    net: itemNet,
                });

                totalBaseSalary += p.baseSalary;
                totalAllowances += p.totalAllowances;
                totalDeductions += p.totalDeductions;
                totalOvertime += overtimeAmount;
                totalGross += itemGross;
                totalNet += itemNet;
            });

            const docRef = await addDoc(collection(db, "payroll_summaries"), {
                orgId: profile.orgId,
                period,
                generatedAt: serverTimestamp(),
                generatedBy: profile.uid,
                totalEmployees: items.length,
                totalBaseSalary,
                totalAllowances,
                totalDeductions,
                totalOvertime,
                totalGross,
                totalNet,
                status: "draft",
                exportedToAccounting: false,
                items,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            return docRef.id;
        },
        [profile]
    );

    // Export to accounting (stub for integration)
    const exportToAccounting = useCallback(
        async (summaryId: string): Promise<void> => {
            if (!profile?.orgId) throw new Error("No organization");

            // This is a stub - actual implementation would integrate with accounting module
            await updateDoc(doc(db, "payroll_summaries", summaryId), {
                status: "exported",
                exportedToAccounting: true,
                exportedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // TODO: Create expense records in accounting module
            // This would call the accounting API or create expense documents
            console.log("Payroll exported to accounting (stub):", summaryId);
        },
        [profile]
    );

    return {
        summaries,
        loading,
        generateSummary,
        exportToAccounting,
    };
}
