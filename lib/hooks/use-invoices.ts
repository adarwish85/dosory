// Firestore data hooks for Invoices
// Real-time listeners with CRUD operations

"use client";

import { useState, useEffect } from "react";
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
    limit,
    startAfter,
    getCountFromServer,
} from "firebase/firestore";

// ============================================
// FIX BLE-001: Invoice Status Transition Map
// ============================================

const ALLOWED_STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
    draft: ["sent", "cancelled", "void"],
    sent: ["viewed", "partial", "paid", "overdue", "cancelled", "void"],
    viewed: ["partial", "paid", "overdue", "cancelled", "void"],
    partial: ["paid", "overdue", "cancelled"],
    paid: [], // Terminal state - no transitions allowed
    overdue: ["partial", "paid", "cancelled"],
    cancelled: [], // Terminal state
    void: [], // Terminal state
};

function validateStatusTransition(currentStatus: InvoiceStatus, newStatus: InvoiceStatus): boolean {
    const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[currentStatus];
    return allowedTransitions.includes(newStatus);
}

function getStatusTransitionError(currentStatus: InvoiceStatus, newStatus: InvoiceStatus): string {
    return `Cannot transition invoice from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${ALLOWED_STATUS_TRANSITIONS[currentStatus].join(", ") || "none"}`;
}

// ============================================
// Helper: Generate Invoice Number (Atomic)
// ============================================

interface InvoiceNumberSettings {
    prefix: string;
    padding: number;
}

async function generateInvoiceNumber(
    orgId: string,
    settings?: InvoiceNumberSettings
): Promise<{ number: number; formatted: string }> {
    // Use Firestore transaction for atomic increment
    const { runTransaction } = await import("firebase/firestore");

    const counterRef = doc(db, "organizations", orgId, "counters", "invoices");
    const settingsRef = doc(db, "organizations", orgId, "settings", "general");
    const prefix = settings?.prefix || "INV-";
    const padding = settings?.padding || 6;

    try {
        // Try to atomically increment using transaction
        const result = await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            const settingsDoc = await transaction.get(settingsRef);

            let currentCounter = 0;
            if (counterDoc.exists()) {
                currentCounter = counterDoc.data().currentNumber || 0;
            }

            let configuredNextNumber = 1;
            if (settingsDoc.exists()) {
                const settingsData = settingsDoc.data();
                // Parse invoiceNextNumber - it could be a string like "000050"
                if (settingsData?.invoiceNextNumber) {
                    configuredNextNumber = parseInt(settingsData.invoiceNextNumber, 10) || 1;
                }
            }

            // The next number should be at least (current + 1), but can jump ahead
            // if configuredNextNumber is higher (e.g. user manually set it to 50)
            const nextNumber = Math.max(currentCounter + 1, configuredNextNumber);

            transaction.set(counterRef, { currentNumber: nextNumber }, { merge: true });

            return nextNumber;
        });

        // Format with padding
        const paddedNumber = String(result).padStart(padding, "0");

        return {
            number: result,
            formatted: `${prefix}${paddedNumber}`,
        };
    } catch (error) {
        console.error("Error generating invoice number:", error);
        // Fallback to timestamp-based if transaction fails
        const fallbackNum = Date.now();
        return {
            number: fallbackNum,
            formatted: `${prefix}${fallbackNum}`,
        };
    }
}

// ============================================
// Helper: Calculate Invoice Totals
// ============================================

function calculateInvoiceTotals(items: LineItem[], discount?: { type: "percentage" | "fixed"; value: number }) {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);

    let discountAmount = 0;
    if (discount) {
        discountAmount = discount.type === "percentage" ? subtotal * (discount.value / 100) : discount.value;
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
    limit?: number;
    page?: number;
}

export function useInvoices(options: UseInvoicesOptions = {}) {
    const {
        status = "all",
        customerId,
        projectId,
        orderByField = "date",
        orderDirection = "desc",
        limit: pageSize = 50,
        page = 1,
    } = options;
    const { profile } = useUserProfile();
    const { logActivity } = useActivity({ enabled: false });

    // Data State
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Pagination State
    const [totalRecords, setTotalRecords] = useState(0);
    const [cursors, setCursors] = useState<Record<number, unknown>>({});

    // Fetch Total Count
    useEffect(() => {
        if (!profile?.orgId) return;

        const fetchCount = async () => {
            try {
                const constraints: QueryConstraint[] = [where("orgId", "==", profile.orgId)];
                if (status !== "all" && status) {
                    constraints.push(where("status", "==", status));
                }
                if (customerId) constraints.push(where("customerId", "==", customerId));
                if (projectId) constraints.push(where("projectId", "==", projectId));

                const q = query(collection(db, "invoices"), ...constraints);
                const snapshot = await getCountFromServer(q);
                setTotalRecords(snapshot.data().count);
            } catch (err) {
                console.error("Error fetching invoice count:", err);
            }
        };

        fetchCount();
    }, [profile?.orgId, status, customerId, projectId]);

    useEffect(() => {
        if (!profile?.orgId) {
            console.log("useInvoices: No orgId yet, skipping query");

            setLoading(false);
            return;
        }

        console.log("useInvoices: Building query with orgId:", profile.orgId);

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

        constraints.push(orderBy(orderByField, orderDirection || "desc"));

        // Pagination
        if (page > 1 && cursors[page - 1]) {
            constraints.push(startAfter(cursors[page - 1]));
        }

        constraints.push(limit(pageSize));

        const q = query(collection(db, "invoices"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                console.log("useInvoices: Snapshot received", snapshot.size);
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Invoice[];

                // Update cursor
                if (snapshot.docs.length > 0) {
                    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
                    setCursors((prev) => ({ ...prev, [page]: lastDoc }));
                }

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.orgId, status, customerId, projectId, orderByField, orderDirection, pageSize, page]);

    const createInvoice = async (data: InvoiceFormData): Promise<string> => {
        if (!profile?.orgId) throw new Error("No organization");

        // Get organization settings for invoice numbering
        const settingsRef = doc(db, "organizations", profile.orgId, "settings", "general");
        const settingsSnap = await getDoc(settingsRef);
        const orgSettings = settingsSnap.exists() ? settingsSnap.data() : {};

        // Get customer name
        const customerDoc = await getDoc(doc(db, "customers", data.customerId));
        const customerName = customerDoc.exists() ? customerDoc.data().company : "Unknown Customer";

        // Generate invoice number using org settings
        const invoiceNumberResult = await generateInvoiceNumber(profile.orgId, {
            prefix: orgSettings.invoiceNumberPrefix || "INV-",
            padding: orgSettings.numberPadding || 6,
        });

        // Calculate totals
        const { subtotal, taxTotal, total } = calculateInvoiceTotals(data.items, data.discount);

        const docRef = await addDoc(collection(db, "invoices"), {
            ...data,
            number: invoiceNumberResult.number,
            numberFormatted: invoiceNumberResult.formatted,
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

        if (logActivity) {
            await logActivity(
                "invoice_created",
                `Created invoice ${invoiceNumberResult.formatted}`,
                docRef.id,
                "invoice",
                { amount: total }
            );
        }

        return docRef.id;
    };

    const updateInvoice = async (id: string, data: Partial<InvoiceFormData>): Promise<void> => {
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
    };

    const deleteInvoice = async (id: string): Promise<void> => {
        await deleteDoc(doc(db, "invoices", id));
        if (logActivity) {
            await logActivity("invoice_deleted", "Deleted invoice", id, "invoice");
        }
    };

    // FIX BLE-001: Status transition with validation (SERVERLESS V2)
    const updateStatus = async (id: string, newStatus: InvoiceStatus): Promise<void> => {
        const invoiceDoc = await getDoc(doc(db, "invoices", id));
        if (!invoiceDoc.exists()) throw new Error("Invoice not found");

        const invoice = invoiceDoc.data() as Invoice;

        if (!validateStatusTransition(invoice.status, newStatus)) {
            throw new Error(getStatusTransitionError(invoice.status, newStatus));
        }

        // Use Cloud Functions for critical transitions (sent, void)
        const { getFunctions, httpsCallable } = await import("firebase/functions");
        const functions = getFunctions();

        if (newStatus === "sent") {
            const finalizeInvoiceFn = httpsCallable(functions, "finalizeInvoice");
            await finalizeInvoiceFn({ invoiceId: id });

            if (logActivity) {
                await logActivity("invoice_sent", `Sent invoice ${invoice.number}`, id, "invoice");
            }
            return;
        }

        if (newStatus === "void") {
            const voidInvoiceFn = httpsCallable(functions, "voidInvoice");
            await voidInvoiceFn({ invoiceId: id, reason: "Voided via Dashboard" });
            return;
        }

        // For non-critical statuses (viewed, etc), update directly
        const updateData: Record<string, unknown> = {
            status: newStatus,
            updatedAt: serverTimestamp(),
        };

        if (newStatus === "viewed") updateData.viewedAt = serverTimestamp();

        await updateDoc(doc(db, "invoices", id), updateData);

        // Notify creator if paid
        if (newStatus === "paid" && invoice.createdBy && invoice.createdBy !== profile?.uid) {
            createNotification({
                type: "invoice.paid",
                title: "Invoice Paid",
                message: `Invoice #${invoice.numberFormatted || invoice.number} has been marked as paid.`,
                link: `/dashboard/invoices/${id}`,
                orgId: invoice.orgId,
                userId: invoice.createdBy,
                metadata: { invoiceId: id },
            }).catch(console.error);
        }
    };

    // FIX INV-002: Payment with overpayment validation (SERVERLESS V2)
    const recordPayment = async (
        invoiceId: string,
        amount: number,
        paymentMode: string,
        paymentDate?: Date,
        note?: string
    ): Promise<string> => {
        if (!profile?.orgId) throw new Error("No organization");

        // Pre-validation for UX (server also validates)
        const invoiceDoc = await getDoc(doc(db, "invoices", invoiceId));
        if (!invoiceDoc.exists()) throw new Error("Invoice not found");

        const invoice = invoiceDoc.data() as Invoice;

        if (amount > invoice.amountDue) {
            throw new Error(`Payment amount (${amount}) exceeds balance due (${invoice.amountDue})`);
        }

        if (amount <= 0) {
            throw new Error("Payment amount must be greater than zero");
        }

        // Use Cloud Function for secure, atomic payment processing
        const { getFunctions, httpsCallable } = await import("firebase/functions");
        const functions = getFunctions();
        const processPaymentFn = httpsCallable(functions, "processPayment");

        try {
            await processPaymentFn({
                invoiceId,
                amount,
                paymentMode,
                note: note || "",
                date: (paymentDate || new Date()).toISOString(),
            });

            if (logActivity) {
                await logActivity("invoice_paid", `Received payment of ${amount}`, invoiceId, "invoice", {
                    amount,
                    paymentMode,
                });
            }

            // Notify creator if fully paid
            const newPaid = invoice.amountPaid + amount;
            const newDue = invoice.total - newPaid;
            const isPaidNow = newDue <= 0;

            if (isPaidNow && invoice.createdBy && invoice.createdBy !== profile?.uid) {
                createNotification({
                    type: "invoice.paid",
                    title: "Invoice Paid",
                    message: `Invoice #${invoice.numberFormatted || invoice.number} has been fully paid via ${paymentMode}.`,
                    link: `/dashboard/invoices/${invoiceId}`,
                    orgId: invoice.orgId,
                    userId: invoice.createdBy,
                    metadata: { invoiceId },
                }).catch(console.error);
            }

            return "payment_success"; // Cloud Function doesn't return payment ID in current impl
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Payment processing failed";
            console.error("Payment processing failed:", error);
            throw new Error(errorMessage);
        }
    };

    // Convenience functions using updateStatus
    const markAsSent = async (id: string): Promise<void> => {
        await updateStatus(id, "sent");
    };

    const markAsPaid = async (id: string): Promise<void> => {
        const invoiceDoc = await getDoc(doc(db, "invoices", id));
        if (!invoiceDoc.exists()) throw new Error("Invoice not found");

        const invoice = invoiceDoc.data() as Invoice;

        // Record full payment
        await recordPayment(id, invoice.amountDue, "manual");
    };

    // Calculate invoice stats
    interface InvoiceStats {
        total: number;
        totalAmount: number;
        totalPaid: number;
        totalDue: number;
        [key: string]: number | Record<string, number> | undefined; // Allow dynamic status keys and amountsByStatus
        amountsByStatus?: Record<string, number>;
    }

    const invoiceStats = invoices.reduce(
        (acc, inv) => {
            acc[inv.status] = ((acc[inv.status] as number) || 0) + 1;
            acc.total++;
            acc.totalAmount += inv.total;
            acc.totalPaid += inv.amountPaid;
            acc.totalDue += inv.amountDue;
            return acc;
        },
        { total: 0, totalAmount: 0, totalPaid: 0, totalDue: 0 } as InvoiceStats
    );

    // Calculate amounts by status for dashboard
    const amountsByStatus = invoices.reduce(
        (acc, inv) => {
            const amount = inv.total || 0;
            acc[inv.status] = (acc[inv.status] || 0) + amount;
            return acc;
        },
        {} as Record<string, number>
    );

    // Merge stats
    const extendedStats: InvoiceStats = {
        ...invoiceStats,
        amountsByStatus,
    };

    return {
        invoices,
        loading,
        error,
        invoiceStats: extendedStats,
        totalRecords, // Exposed for pagination
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
            // eslint-disable-next-line react-hooks/set-state-in-effect
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
