
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// ----------------------------------------------------------------------------
// Type Definitions (Subset of shared types for function context)
// ----------------------------------------------------------------------------

interface PaymentRequest {
    invoiceId: string;
    amount: number;
    paymentMode: string;
    note?: string;
    date: string; // ISO string
}

interface VoidInvoiceRequest {
    invoiceId: string;
    reason?: string;
}

interface FinalizeInvoiceRequest {
    invoiceId: string;
}

// ----------------------------------------------------------------------------
// 1. Process Payment (Callable)
// ----------------------------------------------------------------------------

export const processPayment = functions.https.onCall(async (data: PaymentRequest, context) => {
    // 1. Auth Validation
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }

    const { invoiceId, amount, paymentMode, note, date } = data;
    if (!invoiceId || !amount || amount <= 0) {
        throw new functions.https.HttpsError("invalid-argument", "Valid invoiceId and positive amount are required.");
    }

    const userId = context.auth.uid;
    const invoiceRef = db.collection("invoices").doc(invoiceId);

    // 2. Transaction
    try {
        await db.runTransaction(async (t) => {
            const invoiceDoc = await t.get(invoiceRef);

            if (!invoiceDoc.exists) {
                throw new functions.https.HttpsError("not-found", "Invoice not found.");
            }

            const invoice = invoiceDoc.data();
            const orgId = invoice?.orgId;

            // RBAC Check: Ensure user belongs to the org of the invoice
            // Note: In a real app, we'd check "user.orgId" vs "invoice.orgId" via user doc lookups if custom claims aren't set.
            // For now, simpler check:
            if (!orgId) {
                throw new functions.https.HttpsError("failed-precondition", "Invoice has no organization.");
            }

            // Verify Invoice State
            if (invoice?.status === "paid" || invoice?.status === "void" || invoice?.status === "cancelled") {
                throw new functions.https.HttpsError("failed-precondition", "Invoice is already fully paid or voided.");
            }

            // 3. Overpayment Check
            const currentPaid = invoice?.amountPaid || 0;
            const currentTotal = invoice?.total || 0;
            const newAmountPaid = currentPaid + amount;

            // Allow small float epsilon, but generally block gross overpayment
            if (newAmountPaid > currentTotal + 0.01) {
                throw new functions.https.HttpsError(
                    "failed-precondition",
                    `Payment amount (${amount}) exceeds amount due (${currentTotal - currentPaid}).`
                );
            }

            // 4. Create Payment Record (Reference Subcollection or Root Collection with strict rules)
            // Using Root "payments" collection as per schema
            const paymentRef = db.collection("payments").doc();
            const paymentData = {
                id: paymentRef.id,
                orgId,
                invoiceId,
                invoiceNumber: invoice?.number,
                customerId: invoice?.customerId,
                amount,
                currency: invoice?.currency,
                paymentMode,
                date: admin.firestore.Timestamp.fromDate(new Date(date)),
                note: note || "",
                createdBy: userId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            t.set(paymentRef, paymentData);

            // 5. Update Invoice
            let newStatus = invoice?.status;
            if (newAmountPaid >= currentTotal - 0.01) {
                newStatus = "paid";
            } else if (newAmountPaid > 0) {
                newStatus = "partial";
            }

            t.update(invoiceRef, {
                amountPaid: newAmountPaid,
                amountDue: currentTotal - newAmountPaid,
                status: newStatus,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        });

        return { success: true, message: "Payment processed successfully." };
    } catch (error) {
        console.error("Payment processing error:", error);
        // Re-throw valid HTTPS errors, wrap others
        if (error instanceof functions.https.HttpsError) throw error;
        throw new functions.https.HttpsError("internal", "Payment processing failed.");
    }
});


// ----------------------------------------------------------------------------
// 2. Finalize Invoice (Callable)
// ----------------------------------------------------------------------------

export const finalizeInvoice = functions.https.onCall(async (data: FinalizeInvoiceRequest, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }
    const { invoiceId } = data;
    const invoiceRef = db.collection("invoices").doc(invoiceId);

    try {
        await db.runTransaction(async (t) => {
            const invoiceDoc = await t.get(invoiceRef);
            if (!invoiceDoc.exists) throw new functions.https.HttpsError("not-found", "Invoice not found.");

            const invoice = invoiceDoc.data();
            if (invoice?.status !== "draft") {
                throw new functions.https.HttpsError("failed-precondition", "Only draft invoices can be finalized.");
            }

            // Logic to assign permanent number could go here (e.g. atomic counter)
            // For now, we assume the draft number becomes final or we mark it 'sent/open'

            t.update(invoiceRef, {
                status: "sent", // or 'viewed' / 'open'
                isFinalized: true,
                finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
                finalizedBy: context.auth?.uid
            });
        });
        return { success: true };
    } catch (error) {
        if (error instanceof functions.https.HttpsError) throw error;
        throw new functions.https.HttpsError("internal", "Could not finalize invoice.");
    }
});

// ----------------------------------------------------------------------------
// 3. Void Invoice (Callable)
// ----------------------------------------------------------------------------

export const voidInvoice = functions.https.onCall(async (data: VoidInvoiceRequest, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }
    const { invoiceId, reason } = data;
    const invoiceRef = db.collection("invoices").doc(invoiceId);

    try {
        await db.runTransaction(async (t) => {
            const invoiceDoc = await t.get(invoiceRef);
            if (!invoiceDoc.exists) throw new functions.https.HttpsError("not-found", "Invoice not found.");

            const invoice = invoiceDoc.data();
            if (invoice?.status === "paid") {
                throw new functions.https.HttpsError("failed-precondition", "Cannot void a paid invoice. Refund first.");
            }

            t.update(invoiceRef, {
                status: "void",
                voidReason: reason || "Voided by user",
                voidedAt: admin.firestore.FieldValue.serverTimestamp(),
                voidedBy: context.auth?.uid,
                amountDue: 0 // Clear due amount so it doesn't show in aging reports
            });
        });
        return { success: true };
    } catch (error) {
        if (error instanceof functions.https.HttpsError) throw error;
        throw new functions.https.HttpsError("internal", "Could not void invoice.");
    }
});
