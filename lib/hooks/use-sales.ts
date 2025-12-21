// Firestore data hooks for Estimates and Proposals
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
    getDoc,
    serverTimestamp,
    Timestamp,
    QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import type { Estimate, EstimateStatus, Proposal, ProposalStatus } from "@/lib/types";
import type { EstimateFormData, ProposalFormData } from "@/lib/schemas";

// ============================================
// useEstimates Hook
// ============================================

interface UseEstimatesOptions {
    status?: EstimateStatus | "all";
    customerId?: string;
}

export function useEstimates(options: UseEstimatesOptions = {}) {
    const { status = "all", customerId } = options;
    const { profile } = useUserProfile();
    const [estimates, setEstimates] = useState<Estimate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!profile?.orgId) {
            setLoading(false);
            return;
        }

        const constraints: QueryConstraint[] = [
            where("orgId", "==", profile.orgId),
        ];

        if (status !== "all") {
            constraints.push(where("status", "==", status));
        }

        if (customerId) {
            constraints.push(where("customerId", "==", customerId));
        }

        constraints.push(orderBy("createdAt", "desc"));

        const q = query(collection(db, "estimates"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Estimate[];
                setEstimates(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching estimates:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, status, customerId]);

    // Calculate totals helper
    const calculateTotals = (items: { quantity: number; rate: number; taxRate?: number }[], discount?: { type: "percentage" | "fixed"; value: number }) => {
        let subtotal = 0;
        let taxTotal = 0;

        items.forEach((item) => {
            const lineTotal = item.quantity * item.rate;
            subtotal += lineTotal;
            if (item.taxRate) {
                taxTotal += lineTotal * (item.taxRate / 100);
            }
        });

        let discountAmount = 0;
        if (discount) {
            discountAmount = discount.type === "percentage" ? subtotal * (discount.value / 100) : discount.value;
        }

        const total = subtotal + taxTotal - discountAmount;
        return { subtotal, taxTotal, discountAmount, total };
    };

    const createEstimate = useCallback(
        async (data: EstimateFormData): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            // Get customer name
            const customerDoc = await getDoc(doc(db, "customers", data.customerId));
            const customerName = customerDoc.exists() ? customerDoc.data().company : "Unknown Customer";

            // Generate estimate number
            const estNumber = `EST-${Date.now().toString().slice(-6).padStart(6, "0")}`;

            // Calculate totals
            const { subtotal, taxTotal, total } = calculateTotals(data.items, data.discount);

            const docRef = await addDoc(collection(db, "estimates"), {
                ...data,
                number: estNumber,
                customerName,
                subtotal,
                taxTotal,
                total,
                status: "draft",
                date: Timestamp.fromDate(data.date),
                expiryDate: Timestamp.fromDate(data.expiryDate),
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            return docRef.id;
        },
        [profile?.orgId, profile?.uid]
    );

    const updateEstimate = useCallback(
        async (id: string, data: Partial<EstimateFormData>): Promise<void> => {
            const updateData: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };
            if (data.date) updateData.date = Timestamp.fromDate(data.date);
            if (data.expiryDate) updateData.expiryDate = Timestamp.fromDate(data.expiryDate);
            await updateDoc(doc(db, "estimates", id), updateData);
        },
        []
    );

    const deleteEstimate = useCallback(async (id: string): Promise<void> => {
        await deleteDoc(doc(db, "estimates", id));
    }, []);

    const markAsSent = useCallback(async (id: string): Promise<void> => {
        await updateDoc(doc(db, "estimates", id), { status: "sent", updatedAt: serverTimestamp() });
    }, []);

    // FIX BLE-002: Validate expiry date before accepting
    const markAsAccepted = useCallback(async (id: string): Promise<void> => {
        const estimateDoc = await getDoc(doc(db, "estimates", id));
        if (!estimateDoc.exists()) throw new Error("Estimate not found");

        const estimate = estimateDoc.data() as Estimate;

        // Check if expired
        if (estimate.expiryDate) {
            const expiryDate = estimate.expiryDate.toDate();
            if (expiryDate < new Date()) {
                throw new Error("Cannot accept expired estimate. Expiry date was " + expiryDate.toLocaleDateString());
            }
        }

        await updateDoc(doc(db, "estimates", id), {
            status: "accepted",
            acceptedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
    }, []);

    const markAsDeclined = useCallback(async (id: string): Promise<void> => {
        await updateDoc(doc(db, "estimates", id), { status: "declined", updatedAt: serverTimestamp() });
    }, []);

    // FIX EST-002: Convert to invoice with duplicate check
    const convertToInvoice = useCallback(async (id: string): Promise<string> => {
        if (!profile?.orgId) throw new Error("No organization");

        const estimateDoc = await getDoc(doc(db, "estimates", id));
        if (!estimateDoc.exists()) throw new Error("Estimate not found");

        const estimate = estimateDoc.data() as Estimate;

        // Check if already converted
        if (estimate.convertedToInvoiceId) {
            throw new Error("Estimate already converted to invoice: " + estimate.convertedToInvoiceId);
        }

        // Check if accepted
        if (estimate.status !== "accepted") {
            throw new Error("Only accepted estimates can be converted to invoices");
        }

        // Generate invoice number
        const invNumber = `INV-${Date.now().toString().slice(-6).padStart(6, "0")}`;

        // Create invoice from estimate
        const invoiceRef = await addDoc(collection(db, "invoices"), {
            number: invNumber,
            customerId: estimate.customerId,
            customerName: estimate.customerName,
            items: estimate.items,
            subtotal: estimate.subtotal,
            taxTotal: estimate.taxTotal,
            total: estimate.total,
            amountPaid: 0,
            amountDue: estimate.total,
            discount: estimate.discount,
            status: "draft",
            date: serverTimestamp(),
            dueDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days
            currency: estimate.currency || "USD",
            fromEstimateId: id,
            fromEstimateNumber: estimate.number,
            orgId: profile.orgId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: profile.uid,
        });

        // Update estimate with conversion reference
        await updateDoc(doc(db, "estimates", id), {
            convertedToInvoiceId: invoiceRef.id,
            convertedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        return invoiceRef.id;
    }, [profile?.orgId, profile?.uid]);

    // Calculate estimate stats
    const estimateStats = estimates.reduce(
        (acc, est) => {
            acc[est.status] = (acc[est.status] || 0) + 1;
            acc.total++;
            acc.totalAmount += est.total || 0;
            return acc;
        },
        { total: 0, totalAmount: 0 } as Record<string, number>
    );

    return {
        estimates,
        loading,
        error,
        estimateStats,
        createEstimate,
        updateEstimate,
        deleteEstimate,
        markAsSent,
        markAsAccepted,
        markAsDeclined,
        convertToInvoice,
    };
}

// ============================================
// useProposals Hook
// ============================================

interface UseProposalsOptions {
    status?: ProposalStatus | "all";
    customerId?: string;
    leadId?: string;
}

export function useProposals(options: UseProposalsOptions = {}) {
    const { status = "all", customerId, leadId } = options;
    const { profile } = useUserProfile();
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!profile?.orgId) {
            setLoading(false);
            return;
        }

        const constraints: QueryConstraint[] = [
            where("orgId", "==", profile.orgId),
        ];

        if (status !== "all") {
            constraints.push(where("status", "==", status));
        }

        if (customerId) {
            constraints.push(where("customerId", "==", customerId));
        }

        if (leadId) {
            constraints.push(where("leadId", "==", leadId));
        }

        constraints.push(orderBy("createdAt", "desc"));

        const q = query(collection(db, "proposals"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Proposal[];
                setProposals(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching proposals:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, status, customerId, leadId]);

    const createProposal = useCallback(
        async (data: ProposalFormData): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            // Generate proposal number
            const propNumber = `PRO-${Date.now().toString().slice(-6).padStart(6, "0")}`;

            // Calculate total if items provided
            let total = 0;
            if (data.items) {
                total = data.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
            }

            const docRef = await addDoc(collection(db, "proposals"), {
                ...data,
                number: propNumber,
                total,
                status: "draft",
                date: Timestamp.fromDate(data.date),
                openTill: Timestamp.fromDate(data.openTill),
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            return docRef.id;
        },
        [profile?.orgId, profile?.uid]
    );

    const updateProposal = useCallback(
        async (id: string, data: Partial<ProposalFormData>): Promise<void> => {
            const updateData: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };
            if (data.date) updateData.date = Timestamp.fromDate(data.date);
            if (data.openTill) updateData.openTill = Timestamp.fromDate(data.openTill);
            await updateDoc(doc(db, "proposals", id), updateData);
        },
        []
    );

    const deleteProposal = useCallback(async (id: string): Promise<void> => {
        await deleteDoc(doc(db, "proposals", id));
    }, []);

    const markAsSent = useCallback(async (id: string): Promise<void> => {
        await updateDoc(doc(db, "proposals", id), { status: "sent", updatedAt: serverTimestamp() });
    }, []);

    const markAsAccepted = useCallback(async (id: string): Promise<void> => {
        await updateDoc(doc(db, "proposals", id), { status: "accepted", updatedAt: serverTimestamp() });
    }, []);

    const markAsDeclined = useCallback(async (id: string): Promise<void> => {
        await updateDoc(doc(db, "proposals", id), { status: "declined", updatedAt: serverTimestamp() });
    }, []);

    // Calculate proposal stats
    const proposalStats = proposals.reduce(
        (acc, prop) => {
            acc[prop.status] = (acc[prop.status] || 0) + 1;
            acc.total++;
            acc.totalAmount += prop.total || 0;
            return acc;
        },
        { total: 0, totalAmount: 0 } as Record<string, number>
    );

    return {
        proposals,
        loading,
        error,
        proposalStats,
        createProposal,
        updateProposal,
        deleteProposal,
        markAsSent,
        markAsAccepted,
        markAsDeclined,
    };
}
