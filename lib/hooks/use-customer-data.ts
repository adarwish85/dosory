// Firestore data hooks for Payments, Credit Notes, Reminders, Files, Vault
// Real-time listeners with CRUD operations

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
    QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { useActivity } from "@/lib/hooks/use-activity";

import type { Payment, CreditNote, Reminder, CustomerFile, VaultItem } from "@/lib/types";

// ============================================
// usePayments Hook
// ============================================

interface UsePaymentsOptions {
    customerId?: string;
    invoiceId?: string;
}

export function usePayments(options: UsePaymentsOptions = {}) {
    const { customerId, invoiceId } = options;
    const { profile } = useUserProfile();
    const { logActivity } = useActivity({ enabled: false });
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.orgId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(false);
            return;
        }

        const constraints: QueryConstraint[] = [where("orgId", "==", profile.orgId)];

        if (customerId) {
            constraints.push(where("customerId", "==", customerId));
        }

        if (invoiceId) {
            constraints.push(where("invoiceId", "==", invoiceId));
        }

        constraints.push(orderBy("date", "desc"));

        const q = query(collection(db, "payments"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Payment[];
                setPayments(data);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching payments:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, customerId, invoiceId]);

    const createPayment = useCallback(
        async (data: Omit<Payment, "id" | "orgId" | "createdAt" | "updatedAt">) => {
            if (!profile?.orgId) throw new Error("No organization");

            const docRef = await addDoc(collection(db, "payments"), {
                ...data,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            if (logActivity) {
                await logActivity("payment_received", `Received payment of ${data.amount}`, docRef.id, "payment", {
                    amount: data.amount,
                    customerId: data.customerId,
                });
            }

            return docRef;
        },
        [profile?.orgId, logActivity]
    );

    return { payments, loading, createPayment };
}

// ============================================
// useCreditNotes Hook
// ============================================

interface UseCreditNotesOptions {
    customerId?: string;
    status?: "open" | "closed" | "void" | "all";
}

export function useCreditNotes(options: UseCreditNotesOptions = {}) {
    const { customerId, status = "all" } = options;
    const { profile } = useUserProfile();
    const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.orgId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(false);
            return;
        }

        const constraints: QueryConstraint[] = [where("orgId", "==", profile.orgId)];

        if (customerId) {
            constraints.push(where("customerId", "==", customerId));
        }

        if (status !== "all") {
            constraints.push(where("status", "==", status));
        }

        constraints.push(orderBy("date", "desc"));

        const q = query(collection(db, "credit_notes"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as CreditNote[];
                setCreditNotes(data);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching credit notes:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, customerId, status]);

    const createCreditNote = useCallback(
        async (data: any) => {
            if (!profile?.orgId) throw new Error("No organization");

            const docRef = await addDoc(collection(db, "credit_notes"), {
                ...data,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                status: "open",
            });
            return docRef;
        },
        [profile]
    );

    return { creditNotes, loading, createCreditNote };
}

// ============================================
// useReminders Hook
// ============================================

interface UseRemindersOptions {
    customerId?: string;
}

export function useReminders(options: UseRemindersOptions = {}) {
    const { customerId } = options;
    const { profile } = useUserProfile();
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.orgId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(false);
            return;
        }

        const constraints: QueryConstraint[] = [where("orgId", "==", profile.orgId)];

        if (customerId) {
            constraints.push(where("customerId", "==", customerId));
        }

        constraints.push(orderBy("date", "asc"));

        const q = query(collection(db, "reminders"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Reminder[];
                setReminders(data);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching reminders:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, customerId]);

    const createReminder = useCallback(
        async (data: Omit<Reminder, "id" | "orgId" | "createdAt" | "updatedAt" | "isNotified">) => {
            if (!profile?.orgId) throw new Error("No organization");

            return await addDoc(collection(db, "reminders"), {
                ...data,
                orgId: profile.orgId,
                isNotified: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        },
        [profile?.orgId]
    );

    const deleteReminder = useCallback(async (id: string) => {
        await deleteDoc(doc(db, "reminders", id));
    }, []);

    return { reminders, loading, createReminder, deleteReminder };
}

// ============================================
// useCustomerFiles Hook
// ============================================

interface UseCustomerFilesOptions {
    customerId?: string;
}

export function useCustomerFiles(options: UseCustomerFilesOptions = {}) {
    const { customerId } = options;
    const { profile } = useUserProfile();
    const [files, setFiles] = useState<CustomerFile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.orgId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(false);
            return;
        }

        const constraints: QueryConstraint[] = [where("orgId", "==", profile.orgId)];

        if (customerId) {
            constraints.push(where("customerId", "==", customerId));
        }

        constraints.push(orderBy("createdAt", "desc"));

        const q = query(collection(db, "customer_files"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as CustomerFile[];
                setFiles(data);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching files:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, customerId]);

    const uploadFile = useCallback(
        async (file: File, customerId: string) => {
            if (!profile?.orgId) throw new Error("No organization");

            // 1. Upload to Storage
            const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
            const { storage } = await import("@/lib/firebase");
            const storageRef = ref(storage, `organizations/${profile.orgId}/customers/${customerId}/files/${file.name}`);

            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            // 2. Create Firestore Record
            await addDoc(collection(db, "customer_files"), {
                name: file.name,
                url,
                size: file.size,
                type: file.type,
                customerId,
                uploadedBy: profile.email,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        },
        [profile]
    );

    const deleteFile = useCallback(async (id: string) => {
        // Note: Ideally also delete from storage, but for now just Firestore
        await deleteDoc(doc(db, "customer_files", id));
    }, []);

    return { files, loading, deleteFile, uploadFile };
}

// ============================================
// useVault Hook
// ============================================

interface UseVaultOptions {
    customerId?: string;
}

export function useVault(options: UseVaultOptions = {}) {
    const { customerId } = options;
    const { profile } = useUserProfile();
    const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.orgId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(false);
            return;
        }

        const constraints: QueryConstraint[] = [where("orgId", "==", profile.orgId)];

        if (customerId) {
            constraints.push(where("customerId", "==", customerId));
        }

        constraints.push(orderBy("createdAt", "desc"));

        const q = query(collection(db, "vault"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as VaultItem[];
                setVaultItems(data);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching vault items:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, customerId]);

    const createVaultItem = useCallback(
        async (data: Omit<VaultItem, "id" | "orgId" | "createdAt" | "updatedAt">) => {
            if (!profile?.orgId) throw new Error("No organization");

            return await addDoc(collection(db, "vault"), {
                ...data,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        },
        [profile]
    );

    const deleteVaultItem = useCallback(async (id: string) => {
        await deleteDoc(doc(db, "vault", id));
    }, []);

    return { vaultItems, loading, createVaultItem, deleteVaultItem };
}
