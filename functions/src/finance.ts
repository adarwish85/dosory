
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { PaymentModeType, accountCodeFor, classifyByName, classifyFromDoc } from "./payment-modes";

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


/**
 * Drop keys whose value is `undefined`.
 *
 * FIXED 2026-08-09, found by tests/backend/finance.test.ts on its first ever run. Firestore
 * REJECTS `undefined` (the admin SDK is not configured with `ignoreUndefinedProperties`), so
 * a single absent field on the invoice — `number`, `currency`, `customerId` — made the whole
 * transaction throw, and the catch at the bottom reported it as "Payment processing failed."
 * with the real cause only in console.error. Prod has one such invoice today (org `moaz`,
 * no `number`, no `currency`), so this was not hypothetical: that invoice could never be
 * paid or finalized.
 *
 * Stripping (rather than substituting null) keeps the written document byte-identical for
 * every invoice that already worked — an absent field stays absent, so no `!=`/`not-in`
 * query changes meaning (CLAUDE.md Sweep C).
 */
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
    return out as T;
}

/**
 * Find a ledger account by its code, in the ROOT `accounts` collection scoped by orgId.
 *
 * FIXED 2026-08-08. This previously read `organizations/{orgId}/accounts` — a subcollection
 * that is EMPTY in every org in prod (audited: 0 documents across all 14). The entire app —
 * the chart-of-accounts UI, account creation, the expense posting path, and every existing
 * journal line in the database — uses the ROOT `accounts` collection filtered by `orgId`.
 * So this helper always returned null, and because both callers below are written as
 * `if (accountA && accountB) { post }` with no else, processPayment and finalizeInvoice
 * silently recorded NO journal entry for any tenant. Same silent-skip shape as the expense
 * path, one layer down. See CLAUDE.md Sweep E.
 */
async function findAccountByCode(t: admin.firestore.Transaction, orgId: string, code: string): Promise<{ id: string, name: string } | null> {
    const q = db.collection("accounts")
        .where("orgId", "==", orgId)
        .where("code", "==", code)
        .limit(1);
    const snap = await t.get(q);
    if (!snap.empty) {
        const doc = snap.docs[0];
        return { id: doc.id, name: doc.data().name };
    }
    functions.logger.error("[accounting] account not found — journal entry will be SKIPPED", { orgId, code });
    return null;
}

/**
 * Resolve a payment mode to its ledger treatment.
 *
 * The tenant's own `paymentModes` document wins; the display name is only a fallback, because
 * a tenant can rename a mode at any time and the old code matched the name alone (see
 * ./payment-modes for the full defect note). This is a READ, so every caller must invoke it in
 * the reads phase of its transaction, before any write.
 */
async function resolvePaymentModeType(
    t: admin.firestore.Transaction,
    orgId: string,
    rawMode: string
): Promise<PaymentModeType> {
    try {
        const snap = await t.get(
            db.collection("paymentModes").where("orgId", "==", orgId).where("name", "==", rawMode).limit(1)
        );
        if (!snap.empty) {
            const fromDoc = classifyFromDoc(snap.docs[0].data() as { type?: unknown; slug?: unknown });
            if (fromDoc !== "unknown") return fromDoc;
        }
    } catch (error) {
        // A lookup failure must not block the payment; fall through to the name.
        functions.logger.error("[accounting] paymentModes lookup failed; falling back to the name", {
            orgId,
            rawMode,
            error: String(error)
        });
    }
    return classifyByName(rawMode);
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

            // A DRAFT invoice has no receivable yet: finalizeInvoice is the only path that
            // DEBITS Accounts Receivable. Taking a payment first credits AR with no matching
            // debit, so the receivable goes negative and the books stop reconciling (measured
            // at -100 on 2026-08-09). Reject, and say what to do about it.
            //
            // Deliberately keyed on `status`, NOT on `isFinalized`: that flag is only written
            // by finalizeInvoice, which itself failed for every tenant until 2026-08-08, so
            // most legitimately-sent prod invoices do not carry it. Requiring it would block
            // payment on real invoices.
            if (invoice?.status === "draft") {
                throw new functions.https.HttpsError(
                    "failed-precondition",
                    "This invoice is still a draft. Finalize it before recording a payment."
                );
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
            const paymentModeType = await resolvePaymentModeType(t, orgId, paymentMode);
            if (paymentModeType === "unknown") {
                // Posts to Cash exactly as before, but says so — an unrecognised mode silently
                // becoming a cash sale is how every bank transfer ended up in Cash.
                functions.logger.error("[accounting] unrecognised payment mode — posting to Cash", {
                    orgId,
                    invoiceId,
                    paymentMode
                });
            }
            const assetCode = accountCodeFor(paymentModeType);
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
                // The resolved treatment, stored alongside the raw mode so a later audit can
                // tell which account a payment SHOULD have hit without re-deriving it.
                paymentModeType,
                date: admin.firestore.Timestamp.fromDate(new Date(date)),
                note: note || "",
                createdBy: userId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            t.set(paymentRef, stripUndefined(paymentData));

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
                            // An invoice with no customer has no entity to attribute the line
                            // to; omit the pair rather than writing `entityId: undefined`,
                            // which Firestore rejects outright.
                            ...(invoice?.customerId
                                ? { entityType: "customer" as const, entityId: invoice.customerId }
                                : {})
                        }
                    ]
                };
                t.set(jeRef, jeData);
            } else {
                functions.logger.error(
                    "[accounting] payment recorded WITHOUT a journal entry — chart of accounts incomplete",
                    { orgId, paymentId: paymentRef.id, missingAsset: !assetAccount, missingAR: !arAccount }
                );
            }
        });

        return { success: true, message: "Payment processed successfully." };
    } catch (error) {
        // Re-throw valid HTTPS errors, wrap others
        if (error instanceof functions.https.HttpsError) throw error;
        // functions.logger (not console.error) so the cause is queryable in Cloud Logging with
        // ERROR severity. The undefined-field crash below lived here invisibly for months —
        // every payment on an invoice missing `number` or `currency` 500'd, and the only
        // record was an unstructured console line. Same lesson as finalizeInvoice.
        functions.logger.error("[accounting] processPayment failed", {
            invoiceId,
            amount,
            paymentMode,
            error: String(error)
        });
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

            // ALL READS FIRST. A Firestore transaction rejects any read issued after a write,
            // and findAccountByCode below performs a query — so resolving the accounts AFTER
            // t.update() made every finalizeInvoice call fail with a 500, which the catch at
            // the bottom then reported as a generic "Could not finalize invoice." This is the
            // same reads-after-writes defect already fixed in processPayment (see "accounts
            // were read in step 4" there); this callable never got the same treatment.
            const orgId = invoice?.orgId;
            const [arAccount, incomeAccount] = orgId
                ? await Promise.all([
                      findAccountByCode(t, orgId, "1200"), // AR
                      findAccountByCode(t, orgId, "4000")  // Sales Income
                  ])
                : [null, null];

            // ---- writes begin here ----
            // Logic to assign permanent number could go here (e.g. atomic counter)
            // For now, we assume the draft number becomes final or we mark it 'sent/open'

            t.update(invoiceRef, {
                status: "sent",
                isFinalized: true,
                finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
                finalizedBy: context.auth?.uid
            });

            // AUTO-ACCOUNTING: Create Journal Entry (AR vs Income)
            if (orgId) {
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
                                // Same undefined-rejection guard as processPayment: an invoice
                                // with no customerId used to make this whole transaction throw,
                                // surfaced as an opaque "Could not finalize invoice."
                                ...(invoice?.customerId
                                    ? { entityType: "customer" as const, entityId: invoice.customerId }
                                    : {})
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
                } else {
                    functions.logger.error(
                        "[accounting] invoice finalized WITHOUT a journal entry — chart of accounts incomplete",
                        { orgId, invoiceId, missingAR: !arAccount, missingIncome: !incomeAccount }
                    );
                }
            }
        });
        return { success: true };
    } catch (error) {
        if (error instanceof functions.https.HttpsError) throw error;
        // Log the real cause. This catch used to swallow it entirely and return a generic
        // message, so a transaction-ordering violation surfaced to the UI as an opaque 500
        // with nothing in the logs to act on.
        functions.logger.error("[accounting] finalizeInvoice failed", { invoiceId, error: String(error) });
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
            // ---- ALL READS FIRST (Firestore rejects a read issued after any write) ----
            const invoiceDoc = await t.get(invoiceRef);
            if (!invoiceDoc.exists) throw new functions.https.HttpsError("not-found", "Invoice not found.");

            const invoice = invoiceDoc.data();
            if (invoice?.status === "paid") {
                throw new functions.https.HttpsError("failed-precondition", "Cannot void a paid invoice. Refund first.");
            }

            // FIXED 2026-08-09. Voiding used to zero `amountDue` and stop there, so the AR
            // debit that finalizeInvoice posted stayed on the books forever: the aging report
            // showed nothing (amountDue is 0) while the balance sheet still carried the
            // receivable. Measured at +250 on a finalize→void pair.
            //
            // The reversal is the mirror of the finalize entry — CREDIT Accounts Receivable,
            // DEBIT Sales Income — and is linked to the original entry so the pair can be read
            // as one story. Deterministic id: voiding twice cannot double-reverse.
            const orgId = invoice?.orgId;
            const originalSnap = orgId
                ? await t.get(
                      db
                          .collection("journal_entries")
                          .where("orgId", "==", orgId)
                          .where("referenceType", "==", "invoice")
                          .where("referenceId", "==", invoiceId)
                          .limit(1)
                  )
                : null;
            const original = originalSnap && !originalSnap.empty ? originalSnap.docs[0] : null;

            const [arAccount, incomeAccount] = orgId && original
                ? await Promise.all([
                      findAccountByCode(t, orgId, "1200"), // AR
                      findAccountByCode(t, orgId, "4000")  // Sales Income
                  ])
                : [null, null];

            // ---- writes begin here ----
            t.update(invoiceRef, {
                status: "void",
                voidReason: reason || "Voided by user",
                voidedAt: admin.firestore.FieldValue.serverTimestamp(),
                voidedBy: context.auth?.uid,
                amountDue: 0 // Clear due amount so it doesn't show in aging reports
            });

            if (!original) {
                // Nothing was ever posted for this invoice (never finalized, or the chart was
                // incomplete at the time) — there is no receivable to reverse. Not an error.
                functions.logger.info("[accounting] void: no invoice journal entry to reverse", {
                    orgId,
                    invoiceId
                });
                return;
            }

            if (!arAccount || !incomeAccount) {
                functions.logger.error(
                    "[accounting] invoice voided WITHOUT reversing its journal entry — chart of accounts incomplete",
                    { orgId, invoiceId, missingAR: !arAccount, missingIncome: !incomeAccount }
                );
                return;
            }

            const amount = Number(original.data().totalAmount) || 0;
            const label = invoice?.numberFormatted || invoice?.number || "INV";
            const reversalRef = db.collection("journal_entries").doc(`je-void-${invoiceId}`);
            const reversal: JournalEntry & { reversesEntryId: string } = {
                orgId,
                date: admin.firestore.Timestamp.now(),
                description: `Void of Invoice #${label}`,
                referenceId: invoiceId,
                referenceType: "invoice",
                reversesEntryId: original.id,
                totalAmount: amount,
                status: "posted",
                currency: original.data().currency || invoice?.currency || "USD",
                fxRate: 1.0,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: context.auth?.uid || "system",
                lines: [
                    {
                        accountId: incomeAccount.id,
                        accountName: incomeAccount.name,
                        debit: amount,
                        credit: 0,
                        description: `Reversal of revenue from #${label}`
                    },
                    {
                        accountId: arAccount.id,
                        accountName: arAccount.name,
                        debit: 0,
                        credit: amount,
                        description: `Reversal of receivable for #${label}`,
                        ...(invoice?.customerId
                            ? { entityType: "customer" as const, entityId: invoice.customerId }
                            : {})
                    }
                ]
            };
            t.set(reversalRef, reversal);
        });
        return { success: true };
    } catch (error) {
        if (error instanceof functions.https.HttpsError) throw error;
        functions.logger.error("[accounting] voidInvoice failed", { invoiceId, error: String(error) });
        throw new functions.https.HttpsError("internal", "Could not void invoice.");
    }
});
