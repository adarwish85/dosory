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
// Helper to find account by code (simple scan or assumed index)
async function findAccountByCode(t, orgId, code) {
    const accountsRef = db.collection("organizations").doc(orgId).collection("accounts");
    // Note: Transactional query requires an index on 'code' usually. 
    // Fallback: This might be slow if many accounts, but usually CoAs are small < 100.
    const q = accountsRef.where("code", "==", code).limit(1);
    const snap = await t.get(q);
    if (!snap.empty) {
        const doc = snap.docs[0];
        return { id: doc.id, name: doc.data().name };
    }
    return null;
}
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
            // 4. AUTO-ACCOUNTING LOOKUPS — must run BEFORE any t.set/t.update below:
            // Firestore transactions require ALL reads before ANY write. These t.get()s
            // used to sit after the payment/invoice writes (step 6), which made the whole
            // transaction throw "reads before writes" and 500'd EVERY payment in prod
            // (found live 2026-07-28 exercising /dashboard/payments/new).
            const isBank = ["bank_transfer", "cheque", "card"].includes(paymentMode.toLowerCase());
            const assetCode = isBank ? "1010" : "1000"; // Bank or Cash
            const [assetAccount, arAccount] = await Promise.all([
                findAccountByCode(t, orgId, assetCode),
                findAccountByCode(t, orgId, "1200") // Accounts Receivable
            ]);
            // 5. Create Payment Record (Reference Subcollection or Root Collection with strict rules)
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
            // 6. Update Invoice
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
            // 7. Journal Entry (Cash/Bank vs AR) — accounts were read in step 4.
            if (assetAccount && arAccount) {
                const jeRef = db.collection("journal_entries").doc();
                const jeData = {
                    orgId,
                    date: admin.firestore.Timestamp.fromDate(new Date(date)),
                    description: `Payment for #${(invoice === null || invoice === void 0 ? void 0 : invoice.numberFormatted) || (invoice === null || invoice === void 0 ? void 0 : invoice.number) || "INV"}`,
                    referenceId: paymentRef.id,
                    referenceType: "payment",
                    totalAmount: amount,
                    status: "posted",
                    currency: (invoice === null || invoice === void 0 ? void 0 : invoice.currency) || "USD",
                    fxRate: 1.0,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    createdBy: userId,
                    lines: [
                        {
                            accountId: assetAccount.id,
                            accountName: assetAccount.name,
                            debit: amount,
                            credit: 0,
                            description: `Payment received via ${paymentMode}`
                        },
                        {
                            accountId: arAccount.id,
                            accountName: arAccount.name,
                            debit: 0,
                            credit: amount,
                            description: `Payment applied to #${(invoice === null || invoice === void 0 ? void 0 : invoice.numberFormatted) || (invoice === null || invoice === void 0 ? void 0 : invoice.number)}`,
                            entityType: "customer",
                            entityId: invoice === null || invoice === void 0 ? void 0 : invoice.customerId
                        }
                    ]
                };
                t.set(jeRef, jeData);
            }
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
            var _a, _b;
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
                status: "sent",
                isFinalized: true,
                finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
                finalizedBy: (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid
            });
            // AUTO-ACCOUNTING: Create Journal Entry (AR vs Income)
            const orgId = invoice === null || invoice === void 0 ? void 0 : invoice.orgId;
            if (orgId) {
                const [arAccount, incomeAccount] = await Promise.all([
                    findAccountByCode(t, orgId, "1200"), // AR
                    findAccountByCode(t, orgId, "4000") // Sales Income
                ]);
                if (arAccount && incomeAccount) {
                    const jeRef = db.collection("journal_entries").doc();
                    const jeData = {
                        orgId,
                        date: admin.firestore.Timestamp.now(),
                        description: `Invoice #${(invoice === null || invoice === void 0 ? void 0 : invoice.numberFormatted) || (invoice === null || invoice === void 0 ? void 0 : invoice.number) || "INV"} Sent`,
                        referenceId: invoiceId,
                        referenceType: "invoice",
                        totalAmount: (invoice === null || invoice === void 0 ? void 0 : invoice.total) || 0,
                        status: "posted",
                        currency: (invoice === null || invoice === void 0 ? void 0 : invoice.currency) || "USD",
                        fxRate: 1.0,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        createdBy: ((_b = context.auth) === null || _b === void 0 ? void 0 : _b.uid) || "system",
                        lines: [
                            {
                                accountId: arAccount.id,
                                accountName: arAccount.name,
                                debit: (invoice === null || invoice === void 0 ? void 0 : invoice.total) || 0,
                                credit: 0,
                                description: `Invoice #${(invoice === null || invoice === void 0 ? void 0 : invoice.numberFormatted) || (invoice === null || invoice === void 0 ? void 0 : invoice.number) || "INV"}`,
                                entityType: "customer",
                                entityId: invoice === null || invoice === void 0 ? void 0 : invoice.customerId
                            },
                            {
                                accountId: incomeAccount.id,
                                accountName: incomeAccount.name,
                                debit: 0,
                                credit: (invoice === null || invoice === void 0 ? void 0 : invoice.total) || 0,
                                description: `Revenue from #${(invoice === null || invoice === void 0 ? void 0 : invoice.numberFormatted) || (invoice === null || invoice === void 0 ? void 0 : invoice.number) || "INV"}`
                            }
                        ]
                    };
                    t.set(jeRef, jeData);
                }
            }
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