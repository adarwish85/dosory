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
    // Hoisted so React Compiler's inferred dependency matches the written one exactly
    // (`orgId`, not the whole `profile` object) — otherwise it refuses to preserve the
    // manual memoization below and skips optimizing the hook.
    const orgId = profile?.orgId;
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
    }, [orgId, customerId, invoiceId]);

    const createPayment = useCallback(
        async (data: Omit<Payment, "id" | "orgId" | "createdAt" | "updatedAt">) => {
            if (!orgId) throw new Error("No organization");

            const docRef = await addDoc(collection(db, "payments"), {
                ...data,
                orgId,
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
        [orgId, logActivity]
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
        // MONEY-MODULE — left as `any` deliberately (diagnosis only this round).
        // Tightening this to Omit<CreditNote, …> surfaces a real mismatch: the caller
        // app/dashboard/accounting/credit-notes/new/page.tsx:100 passes `date` as a JS Date
        // while CreditNote.date is a Firestore Timestamp. Fixing that touches credit-note
        // amounts and persistence, so it is written up for Ahmed rather than changed here.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // See the note in usePayments above.
    const orgId = profile?.orgId;
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
            // SWEEP E — read/write disagreement. create-reminder-dialog.tsx writes
            // `relatedTo: { type: "customer", id: customerId }` and NO top-level customerId
            // field, so filtering on `customerId` matched nothing and the customer Reminders
            // tab was permanently empty with no error. The deployed index
            // reminders(orgId, relatedTo.id, relatedTo.type, date) confirms `relatedTo` is the
            // intended shape, so the READER is what was wrong here.
            constraints.push(where("relatedTo.id", "==", customerId));
            constraints.push(where("relatedTo.type", "==", "customer"));
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
    }, [orgId, customerId]);

    const createReminder = useCallback(
        async (data: Omit<Reminder, "id" | "orgId" | "createdAt" | "updatedAt" | "isNotified">) => {
            if (!orgId) throw new Error("No organization");

            return await addDoc(collection(db, "reminders"), {
                ...data,
                orgId,
                isNotified: false,
                // checkReminders (Cloud Function) queries sendEmail==true && emailSent==false.
                // Firestore equality skips docs missing the field, so both MUST exist or the
                // reminder is invisible to the mailer. Mirror use-reminders.ts.
                sendEmail: data.sendEmail ?? false,
                emailSent: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        },
        [orgId]
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
            const storageRef = ref(
                storage,
                `organizations/${profile.orgId}/customers/${customerId}/files/${file.name}`
            );

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
