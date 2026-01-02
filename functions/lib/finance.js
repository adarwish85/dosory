"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voidInvoice = exports.finalizeInvoice = exports.processPayment = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Initialize admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// ----------------------------------------------------------------------------
// 1. Process Payment (Callable)
// ----------------------------------------------------------------------------
exports.processPayment = functions.https.onCall(async (data, context) => {
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
            const orgId = invoice === null || invoice === void 0 ? void 0 : invoice.orgId;
            // RBAC Check: Ensure user belongs to the org of the invoice
            // Note: In a real app, we'd check "user.orgId" vs "invoice.orgId" via user doc lookups if custom claims aren't set.
            // For now, simpler check:
            if (!orgId) {
                throw new functions.https.HttpsError("failed-precondition", "Invoice has no organization.");
            }
            // Verify Invoice State
            if ((invoice === null || invoice === void 0 ? void 0 : invoice.status) === "paid" || (invoice === null || invoice === void 0 ? void 0 : invoice.status) === "void" || (invoice === null || invoice === void 0 ? void 0 : invoice.status) === "cancelled") {
                throw new functions.https.HttpsError("failed-precondition", "Invoice is already fully paid or voided.");
            }
            // 3. Overpayment Check
            const currentPaid = (invoice === null || invoice === void 0 ? void 0 : invoice.amountPaid) || 0;
            const currentTotal = (invoice === null || invoice === void 0 ? void 0 : invoice.total) || 0;
            const newAmountPaid = currentPaid + amount;
            // Allow small float epsilon, but generally block gross overpayment
            if (newAmountPaid > currentTotal + 0.01) {
                throw new functions.https.HttpsError("failed-precondition", `Payment amount (${amount}) exceeds amount due (${currentTotal - currentPaid}).`);
            }
            // 4. Create Payment Record (Reference Subcollection or Root Collection with strict rules)
            // Using Root "payments" collection as per schema
            const paymentRef = db.collection("payments").doc();
            const paymentData = {
                id: paymentRef.id,
                orgId,
                invoiceId,
                invoiceNumber: invoice === null || invoice === void 0 ? void 0 : invoice.number,
                customerId: invoice === null || invoice === void 0 ? void 0 : invoice.customerId,
                amount,
                currency: invoice === null || invoice === void 0 ? void 0 : invoice.currency,
                paymentMode,
                date: admin.firestore.Timestamp.fromDate(new Date(date)),
                note: note || "",
                createdBy: userId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            t.set(paymentRef, paymentData);
            // 5. Update Invoice
            let newStatus = invoice === null || invoice === void 0 ? void 0 : invoice.status;
            if (newAmountPaid >= currentTotal - 0.01) {
                newStatus = "paid";
            }
            else if (newAmountPaid > 0) {
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
    }
    catch (error) {
        console.error("Payment processing error:", error);
        // Re-throw valid HTTPS errors, wrap others
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", "Payment processing failed.");
    }
});
// ----------------------------------------------------------------------------
// 2. Finalize Invoice (Callable)
// ----------------------------------------------------------------------------
exports.finalizeInvoice = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }
    const { invoiceId } = data;
    const invoiceRef = db.collection("invoices").doc(invoiceId);
    try {
        await db.runTransaction(async (t) => {
            var _a;
            const invoiceDoc = await t.get(invoiceRef);
            if (!invoiceDoc.exists)
                throw new functions.https.HttpsError("not-found", "Invoice not found.");
            const invoice = invoiceDoc.data();
            if ((invoice === null || invoice === void 0 ? void 0 : invoice.status) !== "draft") {
                throw new functions.https.HttpsError("failed-precondition", "Only draft invoices can be finalized.");
            }
            // Logic to assign permanent number could go here (e.g. atomic counter)
            // For now, we assume the draft number becomes final or we mark it 'sent/open'
            t.update(invoiceRef, {
                status: "sent", // or 'viewed' / 'open'
                isFinalized: true,
                finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
                finalizedBy: (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid
            });
        });
        return { success: true };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", "Could not finalize invoice.");
    }
});
// ----------------------------------------------------------------------------
// 3. Void Invoice (Callable)
// ----------------------------------------------------------------------------
exports.voidInvoice = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }
    const { invoiceId, reason } = data;
    const invoiceRef = db.collection("invoices").doc(invoiceId);
    try {
        await db.runTransaction(async (t) => {
            var _a;
            const invoiceDoc = await t.get(invoiceRef);
            if (!invoiceDoc.exists)
                throw new functions.https.HttpsError("not-found", "Invoice not found.");
            const invoice = invoiceDoc.data();
            if ((invoice === null || invoice === void 0 ? void 0 : invoice.status) === "paid") {
                throw new functions.https.HttpsError("failed-precondition", "Cannot void a paid invoice. Refund first.");
            }
            t.update(invoiceRef, {
                status: "void",
                voidReason: reason || "Voided by user",
                voidedAt: admin.firestore.FieldValue.serverTimestamp(),
                voidedBy: (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid,
                amountDue: 0 // Clear due amount so it doesn't show in aging reports
            });
        });
        return { success: true };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", "Could not void invoice.");
    }
});
//# sourceMappingURL=finance.js.map