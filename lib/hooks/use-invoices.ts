// Firestore data hooks for Invoices
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
    runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import type { Invoice, InvoiceStatus, LineItem } from "@/lib/types";
import type { InvoiceFormData } from "@/lib/schemas";

// ============================================
// FIX BLE-001: Invoice Status Transition Map
// ============================================

const ALLOWED_STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
    draft: ["sent", "cancelled"],
    sent: ["viewed", "partial", "paid", "overdue", "cancelled"],
    viewed: ["partial", "paid", "overdue", "cancelled"],
    partial: ["paid", "overdue", "cancelled"],
    paid: [], // Terminal state - no transitions allowed
    overdue: ["partial", "paid", "cancelled"],
    cancelled: [], // Terminal state
};

function validateStatusTransition(currentStatus: InvoiceStatus, newStatus: InvoiceStatus): boolean {
    const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[currentStatus];
    return allowedTransitions.includes(newStatus);
}

function getStatusTransitionError(currentStatus: InvoiceStatus, newStatus: InvoiceStatus): string {
    return `Cannot transition invoice from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${ALLOWED_STATUS_TRANSITIONS[currentStatus].join(", ") || "none"}`;
}

// ============================================
// Helper: Generate Invoice Number
// ============================================

async function generateInvoiceNumber(orgId: string, prefix: string = "INV-"): Promise<string> {
    // In a real app, use a counter document or Cloud Function for atomic incrementing
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
}

// ============================================
// Helper: Calculate Invoice Totals
// ============================================

function calculateInvoiceTotals(items: LineItem[], discount?: { type: "percentage" | "fixed"; value: number }) {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);

    let discountAmount = 0;
    if (discount) {
        discountAmount = discount.type === "percentage"
            ? subtotal * (discount.value / 100)
            : discount.value;
    }

    const taxableAmount = subtotal - discountAmount;
    const taxTotal = items.reduce((sum, item) => {
        if (item.taxRate) {
            const itemTaxable = item.amount * (taxableAmount / subtotal);
            return sum + itemTaxable * (item.taxRate / 100);
        }
        return sum;
    }, 0);

    const total = taxableAmount + taxTotal;

    return { subtotal, taxTotal, total };
}

// ============================================
// useInvoices Hook
// ============================================

interface UseInvoicesOptions {
    status?: InvoiceStatus | "all";
    customerId?: string;
    projectId?: string;
    orderByField?: "number" | "date" | "dueDate" | "total";
    orderDirection?: "asc" | "desc";
}

export function useInvoices(options: UseInvoicesOptions = {}) {
    const {
        status = "all",
        customerId,
        projectId,
        orderByField = "date",
        orderDirection = "desc",
    } = options;
    const { profile } = useUserProfile();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!profile?.orgId) {
            console.log("useInvoices: No orgId yet, skipping query");
            setLoading(false);
            return;
        }

        console.log("useInvoices: Building query with orgId:", profile.orgId);

        const constraints: QueryConstraint[] = [
            where("orgId", "==", profile.orgId),
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

        constraints.push(orderBy(orderByField, orderDirection || "desc"));

        const q = query(collection(db, "invoices"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                console.log("useInvoices: Snapshot received", snapshot.size);
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Invoice[];
                setInvoices(data);
                setLoading(false);
            },
            (err) => {
                console.error("useInvoices: Error fetching invoices:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, status, customerId, projectId, orderByField, orderDirection]);

    const createInvoice = useCallback(
        async (data: InvoiceFormData): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            // Get customer name
            const customerDoc = await getDoc(doc(db, "customers", data.customerId));
            const customerName = customerDoc.exists()
                ? customerDoc.data().company
                : "Unknown Customer";

            // Generate invoice number
            const number = await generateInvoiceNumber(profile.orgId);

            // Calculate totals
            const { subtotal, taxTotal, total } = calculateInvoiceTotals(data.items, data.discount);

            const docRef = await addDoc(collection(db, "invoices"), {
                ...data,
                number,
                customerName,
                subtotal,
                taxTotal,
                total,
                amountPaid: 0,
                amountDue: total,
                status: "draft",
                date: Timestamp.fromDate(data.date),
                dueDate: Timestamp.fromDate(data.dueDate),
                orgId: profile.orgId,
                currency: data.currency || "USD",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            return docRef.id;
        },
        [profile?.orgId, profile?.uid]
    );

    const updateInvoice = useCallback(
        async (id: string, data: Partial<InvoiceFormData>): Promise<void> => {
            const updateData: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };

            // Recalculate totals if items changed
            if (data.items) {
                const { subtotal, taxTotal, total } = calculateInvoiceTotals(data.items, data.discount);
                updateData.subtotal = subtotal;
                updateData.taxTotal = taxTotal;
                updateData.total = total;
            }

            // Convert dates to Timestamps
            if (data.date) updateData.date = Timestamp.fromDate(data.date);
            if (data.dueDate) updateData.dueDate = Timestamp.fromDate(data.dueDate);

            await updateDoc(doc(db, "invoices", id), updateData);
        },
        []
    );

    const deleteInvoice = useCallback(async (id: string): Promise<void> => {
        await deleteDoc(doc(db, "invoices", id));
    }, []);

    // FIX BLE-001: Status transition with validation
    const updateStatus = useCallback(async (id: string, newStatus: InvoiceStatus): Promise<void> => {
        const invoiceDoc = await getDoc(doc(db, "invoices", id));
        if (!invoiceDoc.exists()) throw new Error("Invoice not found");

        const invoice = invoiceDoc.data() as Invoice;

        if (!validateStatusTransition(invoice.status, newStatus)) {
            throw new Error(getStatusTransitionError(invoice.status, newStatus));
        }

        const updateData: Record<string, unknown> = {
            status: newStatus,
            updatedAt: serverTimestamp(),
        };

        // Add timestamps for specific statuses
        if (newStatus === "sent") updateData.sentAt = serverTimestamp();
        if (newStatus === "paid") updateData.paidAt = serverTimestamp();
        if (newStatus === "viewed") updateData.viewedAt = serverTimestamp();

        await updateDoc(doc(db, "invoices", id), updateData);
    }, []);

    // FIX INV-002: Payment with overpayment validation
    const recordPayment = useCallback(async (
        invoiceId: string,
        amount: number,
        paymentMode: string,
        paymentDate?: Date,
        note?: string
    ): Promise<string> => {
        if (!profile?.orgId) throw new Error("No organization");

        const invoiceDoc = await getDoc(doc(db, "invoices", invoiceId));
        if (!invoiceDoc.exists()) throw new Error("Invoice not found");

        const invoice = invoiceDoc.data() as Invoice;

        // Validate: no overpayment
        if (amount > invoice.amountDue) {
            throw new Error(`Payment amount (${amount}) exceeds balance due (${invoice.amountDue})`);
        }

        if (amount <= 0) {
            throw new Error("Payment amount must be greater than zero");
        }

        // Use transaction for atomic update
        const paymentId = await runTransaction(db, async (transaction) => {
            const newAmountPaid = invoice.amountPaid + amount;
            const newAmountDue = invoice.total - newAmountPaid;
            const newStatus: InvoiceStatus = newAmountDue <= 0 ? "paid" : "partial";

            // Create payment record
            const paymentRef = doc(collection(db, "payments"));
            transaction.set(paymentRef, {
                invoiceId,
                invoiceNumber: invoice.number,
                customerId: invoice.customerId,
                customerName: invoice.customerName,
                amount,
                paymentMode,
                date: paymentDate ? Timestamp.fromDate(paymentDate) : serverTimestamp(),
                note: note || "",
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            // Update invoice
            transaction.update(doc(db, "invoices", invoiceId), {
                amountPaid: newAmountPaid,
                amountDue: newAmountDue,
                status: newStatus,
                ...(newStatus === "paid" && { paidAt: serverTimestamp() }),
                updatedAt: serverTimestamp(),
            });

            return paymentRef.id;
        });

        return paymentId;
    }, [profile?.orgId, profile?.uid]);

    // Convenience functions using updateStatus
    const markAsSent = useCallback(async (id: string): Promise<void> => {
        await updateStatus(id, "sent");
    }, [updateStatus]);

    const markAsPaid = useCallback(async (id: string): Promise<void> => {
        const invoiceDoc = await getDoc(doc(db, "invoices", id));
        if (!invoiceDoc.exists()) throw new Error("Invoice not found");

        const invoice = invoiceDoc.data() as Invoice;

        // Record full payment
        await recordPayment(id, invoice.amountDue, "manual");
    }, [recordPayment]);

    // Calculate invoice stats
    const invoiceStats = invoices.reduce(
        (acc, inv) => {
            acc[inv.status] = (acc[inv.status] || 0) + 1;
            acc.total++;
            acc.totalAmount += inv.total;
            acc.totalPaid += inv.amountPaid;
            acc.totalDue += inv.amountDue;
            return acc;
        },
        { total: 0, totalAmount: 0, totalPaid: 0, totalDue: 0 } as Record<string, number>
    );

    return {
        invoices,
        loading,
        error,
        invoiceStats,
        createInvoice,
        updateInvoice,
        deleteInvoice,
        updateStatus,
        recordPayment,
        markAsSent,
        markAsPaid,
    };
}

// ============================================
// useInvoice Hook (single invoice)
// ============================================

export function useInvoice(id: string | null) {
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!id) {
            setInvoice(null);
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(
            doc(db, "invoices", id),
            (snapshot) => {
                if (snapshot.exists()) {
                    setInvoice({ id: snapshot.id, ...snapshot.data() } as Invoice);
                } else {
                    setInvoice(null);
                }
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching invoice:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [id]);

    return { invoice, loading, error };
}
