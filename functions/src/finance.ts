
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

// Accounting Types
interface JournalEntryLine {
    accountId: string;
    accountName: string;
    debit: number;
    credit: number;
    description: string;
    entityType?: "customer" | "vendor";
    entityId?: string;
}

interface JournalEntry {
    orgId: string;
    date: admin.firestore.Timestamp;
    description: string;
    referenceId: string;
    referenceType: "invoice" | "payment" | "expense";
    totalAmount: number;
    status: "draft" | "posted";
    lines: JournalEntryLine[];
    currency: string;
    fxRate: number;
    createdAt: admin.firestore.FieldValue;
    createdBy: string;
}


// Helper to find account by code (simple scan or assumed index)
async function findAccountByCode(t: admin.firestore.Transaction, orgId: string, code: string): Promise<{ id: string, name: string } | null> {
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

            // 6. Update Invoice
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

            // 7. Journal Entry (Cash/Bank vs AR) — accounts were read in step 4.

            if (assetAccount && arAccount) {
                const jeRef = db.collection("journal_entries").doc();
                const jeData: JournalEntry = {
                    orgId,
                    date: admin.firestore.Timestamp.fromDate(new Date(date)),
                    description: `Payment for #${invoice?.numberFormatted || invoice?.number || "INV"}`,
                    referenceId: paymentRef.id,
                    referenceType: "payment",
                    totalAmount: amount,
                    status: "posted",
                    currency: invoice?.currency || "USD",
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
                            description: `Payment applied to #${invoice?.numberFormatted || invoice?.number}`,
                            entityType: "customer",
                            entityId: invoice?.customerId
                        }
                    ]
                };
                t.set(jeRef, jeData);
            }
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
                status: "sent",
                isFinalized: true,
                finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
                finalizedBy: context.auth?.uid
            });

            // AUTO-ACCOUNTING: Create Journal Entry (AR vs Income)
            const orgId = invoice?.orgId;
            if (orgId) {
                const [arAccount, incomeAccount] = await Promise.all([
                    findAccountByCode(t, orgId, "1200"), // AR
                    findAccountByCode(t, orgId, "4000")  // Sales Income
                ]);

                if (arAccount && incomeAccount) {
                    const jeRef = db.collection("journal_entries").doc();
                    const jeData: JournalEntry = {
                        orgId,
                        date: admin.firestore.Timestamp.now(),
                        description: `Invoice #${invoice?.numberFormatted || invoice?.number || "INV"} Sent`,
                        referenceId: invoiceId,
                        referenceType: "invoice",
                        totalAmount: invoice?.total || 0,
                        status: "posted",
                        currency: invoice?.currency || "USD",
                        fxRate: 1.0,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        createdBy: context.auth?.uid || "system",
                        lines: [
                            {
                                accountId: arAccount.id,
                                accountName: arAccount.name,
                                debit: invoice?.total || 0,
                                credit: 0,
                                description: `Invoice #${invoice?.numberFormatted || invoice?.number || "INV"}`,
                                entityType: "customer",
                                entityId: invoice?.customerId
                            },
                            {
                                accountId: incomeAccount.id,
                                accountName: incomeAccount.name,
                                debit: 0,
                                credit: invoice?.total || 0,
                                description: `Revenue from #${invoice?.numberFormatted || invoice?.number || "INV"}`
                            }
                        ]
                    };
                    t.set(jeRef, jeData);
                }
            }
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
