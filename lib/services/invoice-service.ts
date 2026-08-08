import {
    collection,
    doc,
    addDoc,
    getDoc,
    runTransaction,
    serverTimestamp,
    Timestamp,
    Firestore,
} from "firebase/firestore";
import type { InvoiceFormData } from "@/lib/schemas";
import type { LineItem } from "@/lib/types";

// ============================================
// Helper: Calculate Invoice Totals
// ============================================

export function calculateInvoiceTotals(
    items: LineItem[],
    discount?: { type: "percentage" | "fixed"; value: number },
    adjustment: number = 0
) {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);

    let discountAmount = 0;
    if (discount) {
        discountAmount = discount.type === "percentage" ? subtotal * (discount.value / 100) : discount.value;
    }

    const taxableAmount = subtotal - discountAmount;
    const taxTotal = items.reduce((sum, item) => {
        // Guard subtotal === 0: the proration below divides by it, and a NaN here propagates
        // straight into the persisted invoice total.
        if (item.taxRate && subtotal > 0) {
            const itemTaxable = item.amount * (taxableAmount / subtotal);
            return sum + itemTaxable * (item.taxRate / 100);
        }
        return sum;
    }, 0);

    // `adjustment` is a signed manual correction (rounding, goodwill, a late fee). It was
    // collected by both invoice forms and shown in the on-screen total, but never written —
    // and the persisted total was recomputed WITHOUT it, so what the customer was billed
    // silently differed from what the creator saw by exactly this amount. It is now part of
    // the one shared calculation, so screen and database cannot drift again.
    const total = taxableAmount + taxTotal + (adjustment || 0);

    return { subtotal, taxTotal, total };
}

// ============================================
// Helper: Generate Invoice Number (Atomic)
// ============================================

interface InvoiceNumberSettings {
    prefix: string;
    padding: number;
}

export async function generateInvoiceNumber(
    db: Firestore,
    orgId: string,
    settings?: InvoiceNumberSettings
): Promise<{ number: number; formatted: string }> {
    const counterRef = doc(db, "organizations", orgId, "counters", "invoices");
    const settingsRef = doc(db, "organizations", orgId, "settings", "general");
    const prefix = settings?.prefix || "INV-";
    const padding = settings?.padding || 6;

    try {
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
                if (settingsData?.invoiceNextNumber) {
                    configuredNextNumber = parseInt(settingsData.invoiceNextNumber, 10) || 1;
                }
            }

            const nextNumber = Math.max(currentCounter + 1, configuredNextNumber);

            transaction.set(counterRef, { currentNumber: nextNumber }, { merge: true });

            return nextNumber;
        });

        const paddedNumber = String(result).padStart(padding, "0");

        return {
            number: result,
            formatted: `${prefix}${paddedNumber}`,
        };
    } catch (error) {
        console.error("Error generating invoice number:", error);
        const fallbackNum = Date.now();
        return {
            number: fallbackNum,
            formatted: `${prefix}${fallbackNum}`,
        };
    }
}

// ============================================
// Create Invoice Service
// ============================================

export interface CreateInvoiceOptions {
    uid: string;
    orgId: string;
}

export async function createInvoiceService(
    db: Firestore,
    data: InvoiceFormData,
    user: CreateInvoiceOptions
): Promise<string> {
    if (!user.orgId) throw new Error("No organization");

    // Get organization settings for invoice numbering
    const settingsRef = doc(db, "organizations", user.orgId, "settings", "general");
    const settingsSnap = await getDoc(settingsRef);
    const orgSettings = settingsSnap.exists() ? settingsSnap.data() : {};

    // Get customer name
    const customerDoc = await getDoc(doc(db, "customers", data.customerId));
    const customerName = customerDoc.exists() ? customerDoc.data().company : "Unknown Customer";

    // Generate invoice number using org settings
    const invoiceNumberResult = await generateInvoiceNumber(db, user.orgId, {
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
        orgId: user.orgId,
        currency: data.currency || "USD",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
    });

    return docRef.id;
}
