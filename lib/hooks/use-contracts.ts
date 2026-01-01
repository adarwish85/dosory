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
    getDoc,
    serverTimestamp,
    Timestamp,
    runTransaction,
    limit,
    startAfter,
    getCountFromServer,
    QueryConstraint,
    DocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { useActivity } from "@/lib/hooks/use-activity";
import type { Contract, ContractStatus } from "@/lib/types";
import type { ContractFormData } from "@/lib/schemas";

// ============================================
// Contract Status Transitions
// ============================================

const ALLOWED_STATUS_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
    draft: ["sent", "signed", "trash"],
    sent: ["signed", "expired", "trash"],
    signed: ["expired", "trash"], // Signed contracts usually stay signed but can be voided/trashed
    expired: ["draft", "trash"], // Renewing might involve creating a new one or resetting to draft
    trash: ["draft"], // Restore
};

function validateStatusTransition(currentStatus: ContractStatus, newStatus: ContractStatus): boolean {
    const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[currentStatus];
    return allowedTransitions?.includes(newStatus) ?? false;
}

// ============================================
// Helper: Generate Contract Number
// ============================================

async function generateContractNumber(orgId: string): Promise<{ number: number; formatted: string }> {
    const counterRef = doc(db, "organizations", orgId, "counters", "contracts");
    const settingsRef = doc(db, "organizations", orgId, "settings", "general");

    try {
        return await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            const settingsDoc = await transaction.get(settingsRef);

            let currentCounter = 0;
            if (counterDoc.exists()) {
                currentCounter = counterDoc.data().currentNumber || 0;
            }

            const settings = settingsDoc.exists() ? settingsDoc.data() : {};
            const prefix = settings.contractPrefix || "CNT-";
            const padding = 6; // Fixed padding for now

            const nextNumber = currentCounter + 1;

            transaction.set(counterRef, { currentNumber: nextNumber }, { merge: true });

            const paddedNumber = String(nextNumber).padStart(padding, "0");
            return {
                number: nextNumber,
                formatted: `${prefix}${paddedNumber}`,
            };
        });
    } catch (error) {
        console.error("Error generating contract number:", error);
        // Fallback
        const fallbackNum = Date.now();
        return {
            number: fallbackNum,
            formatted: `CNT-${fallbackNum}`,
        };
    }
}

// ============================================
// useContracts Hook
// ============================================

interface UseContractsOptions {
    status?: ContractStatus | "all";
    customerId?: string;
    projectId?: string;
    limit?: number;
    page?: number;
    orderByField?: "startDate" | "createdAt" | "contractValue";
    orderDirection?: "asc" | "desc";
}

export function useContracts(options: UseContractsOptions = {}) {
    const {
        status = "all",
        customerId,
        projectId,
        limit: pageSize = 50,
        page = 1,
        orderByField = "createdAt",
        orderDirection = "desc",
    } = options;

    const { profile } = useUserProfile();
    const { logActivity } = useActivity({ enabled: false });

    // Data State
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Pagination State
    const [totalRecords, setTotalRecords] = useState(0);
    const [cursors, setCursors] = useState<Record<number, DocumentSnapshot>>({});

    // Fetch Total Count
    useEffect(() => {
        if (!profile?.orgId) return;

        const fetchCount = async () => {
            try {
                const constraints: QueryConstraint[] = [where("orgId", "==", profile.orgId)];
                if (status !== "all" && status) {
                    constraints.push(where("status", "==", status));
                }
                if (customerId) {
                    constraints.push(where("customerId", "==", customerId));
                }
                if (projectId) {
                    constraints.push(where("projectId", "==", projectId));
                }

                const q = query(collection(db, "contracts"), ...constraints);
                const snapshot = await getCountFromServer(q);
                setTotalRecords(snapshot.data().count);
            } catch (err) {
                console.error("Error fetching contract count:", err);
            }
        };

        fetchCount();
    }, [profile?.orgId, status, customerId, projectId]);

    // Fetch Contracts
    useEffect(() => {
        if (!profile?.orgId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(false);
            return;
        }

        const constraints: QueryConstraint[] = [
            where("orgId", "==", profile.orgId),
            orderBy(orderByField, orderDirection),
            limit(pageSize),
        ];

        if (status !== "all" && status) {
            constraints.push(where("status", "==", status));
        }

        if (customerId) {
            constraints.push(where("customerId", "==", customerId));
        }

        if (projectId) {
            constraints.push(where("projectId", "==", projectId));
        }

        if (page > 1 && cursors[page - 1]) {
            constraints.push(startAfter(cursors[page - 1]));
        }

        const q = query(collection(db, "contracts"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Contract[];

                if (snapshot.docs.length > 0) {
                    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
                    setCursors((prev) => ({ ...prev, [page]: lastDoc }));
                }

                setContracts(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching contracts:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, status, customerId, projectId, pageSize, page, orderByField, orderDirection, cursors]);

    // Calculate stats
    const contractStats = contracts.reduce(
        (acc, contract) => {
            acc[contract.status] = (acc[contract.status] || 0) + 1;
            return acc;
        },
        {} as Record<ContractStatus | string, number>
    );

    const createContract = useCallback(
        async (data: ContractFormData): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            const { number, formatted } = await generateContractNumber(profile.orgId);

            // Fetch customer name if not provided (though form usually has ID)
            let customerName = "";
            if (data.customerId) {
                const customerDoc = await getDoc(doc(db, "customers", data.customerId));
                if (customerDoc.exists()) {
                    customerName = customerDoc.data().company || customerDoc.data().name;
                }
            }

            const docRef = await addDoc(collection(db, "contracts"), {
                ...data,
                number,
                numberFormatted: formatted,
                customerName,
                status: "draft",
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
                startDate: data.startDate ? Timestamp.fromDate(data.startDate) : serverTimestamp(),
                endDate: data.endDate ? Timestamp.fromDate(data.endDate) : null,
            });

            if (logActivity) {
                await logActivity("contract_created", `Created contract ${formatted}`, docRef.id, "contract");
            }

            return docRef.id;
        },
        [profile, logActivity]
    );

    const updateContract = useCallback(async (id: string, data: Partial<ContractFormData>): Promise<void> => {
        const updateData: Record<string, unknown> = {
            ...data,
            updatedAt: serverTimestamp(),
        };

        if (data.startDate) updateData.startDate = Timestamp.fromDate(data.startDate);
        if (data.endDate) updateData.endDate = Timestamp.fromDate(data.endDate);

        await updateDoc(doc(db, "contracts", id), updateData);
    }, []);

    const deleteContract = useCallback(
        async (id: string): Promise<void> => {
            await deleteDoc(doc(db, "contracts", id));
            if (logActivity) {
                await logActivity("contract_deleted", "Deleted contract", id, "contract");
            }
        },
        [logActivity]
    );

    const signContract = useCallback(
        async (id: string, signatureData?: { signedBy: string; signatureImage?: string }): Promise<void> => {
            const contractRef = doc(db, "contracts", id);

            await updateDoc(contractRef, {
                status: "signed",
                signedAt: serverTimestamp(),
                signedBy: signatureData?.signedBy || "Customer", // Ideally Contact ID or Name
                signatureImage: signatureData?.signatureImage || null,
                updatedAt: serverTimestamp(),
            });

            if (logActivity) {
                await logActivity("contract_signed", "Contract signed", id, "contract");
            }
        },
        [logActivity]
    );

    const updateStatus = useCallback(async (id: string, newStatus: ContractStatus): Promise<void> => {
        // Fetch current to validate
        const contractRef = doc(db, "contracts", id);
        const snap = await getDoc(contractRef);
        if (!snap.exists()) throw new Error("Contract not found");

        const currentStatus = snap.data().status as ContractStatus;
        if (!validateStatusTransition(currentStatus, newStatus)) {
            throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}`);
        }

        await updateDoc(contractRef, {
            status: newStatus,
            updatedAt: serverTimestamp(),
        });
    }, []);

    return {
        contracts,
        loading,
        error,
        totalRecords,
        contractStats,
        createContract,
        updateContract,
        deleteContract,
        signContract,
        updateStatus,
    };
}

export function useContract(id: string | null) {
    const [contract, setContract] = useState<Contract | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!id) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(
            doc(db, "contracts", id),
            (doc) => {
                if (doc.exists()) {
                    setContract({ id: doc.id, ...doc.data() } as Contract);
                } else {
                    setContract(null);
                }
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching contract:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [id]);

    return { contract, loading, error };
}
