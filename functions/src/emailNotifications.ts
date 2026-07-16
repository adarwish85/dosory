import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Resend } from "resend";
import {
    getInvoiceSentEmail,
    getContractCreatedEmail,
    InvoiceEmailData,
    ContractEmailData
} from "./emailTemplates";

// Initialize Resend with API key from environment
// Lazy init: constructing `new Resend(undefined)` at module scope throws "Missing API key",
// which broke `firebase deploy` discovery (it executes the module to enumerate exports). The
// key is read at first send instead — it is present in the prod functions runtime config.
let _resend: Resend | null = null;
const getResend = (): Resend => (_resend ??= new Resend(functions.config().resend?.api_key || process.env.RESEND_API_KEY));

// Default from email - update this to your verified domain
const FROM_EMAIL = functions.config().email?.from || "notifications@yourdomain.com";

// Helper to get organization name
async function getOrgName(orgId: string): Promise<string> {
    try {
        const orgDoc = await admin.firestore().collection("organizations").doc(orgId).get();
        return orgDoc.data()?.name || "Your Business";
    } catch {
        return "Your Business";
    }
}

// Helper to get customer email
async function getCustomerEmail(customerId: string): Promise<{ email: string; name: string } | null> {
    try {
        const customerDoc = await admin.firestore().collection("customers").doc(customerId).get();
        const data = customerDoc.data();
        if (data?.email) {
            return { email: data.email, name: data.name || data.company || "Customer" };
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Send email when invoice status changes to "sent"
 */
export const onInvoiceSent = functions.firestore
    .document("invoices/{invoiceId}")
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();

        // Only trigger when status changes to "sent"
        if (before.status === "sent" || after.status !== "sent") {
            return null;
        }

        console.log(`Invoice ${context.params.invoiceId} sent, sending email...`);

        const customer = await getCustomerEmail(after.customerId);
        if (!customer) {
            console.log("No customer email found, skipping");
            return null;
        }

        const orgName = await getOrgName(after.orgId);

        const emailData: InvoiceEmailData = {
            to: customer.email,
            customerName: customer.name,
            orgName,
            invoiceNumber: after.number || context.params.invoiceId,
            amount: after.total || 0,
            currency: after.currency || "USD",
            dueDate: after.dueDate?.toDate?.()?.toLocaleDateString() || "N/A",
        };

        const { subject, html } = getInvoiceSentEmail(emailData);

        try {
            await getResend().emails.send({
                from: FROM_EMAIL,
                to: customer.email,
                subject,
                html,
            });
            console.log(`Invoice email sent to ${customer.email}`);

            // Update invoice with email sent timestamp
            await change.after.ref.update({
                emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        } catch (error) {
            console.error("Failed to send invoice email:", error);
        }

        return null;
    });

/**
 * Send email when contract is created
 */
export const onContractCreated = functions.firestore
    .document("contracts/{contractId}")
    .onCreate(async (snap, context) => {
        const contract = snap.data();

        console.log(`Contract ${context.params.contractId} created, sending email...`);

        const customer = await getCustomerEmail(contract.customerId);
        if (!customer) {
            console.log("No customer email found, skipping");
            return null;
        }

        const emailData: ContractEmailData = {
            to: customer.email,
            customerName: customer.name,
            contractNumber: contract.number || context.params.contractId,
            subject: contract.subject || "New Contract",
            startDate: contract.startDate?.toDate?.()?.toLocaleDateString() || "N/A",
            endDate: contract.endDate?.toDate?.()?.toLocaleDateString() || "N/A",
            value: contract.value || 0,
            currency: contract.currency || "USD",
        };

        const { subject, html } = getContractCreatedEmail(emailData);

        try {
            await getResend().emails.send({
                from: FROM_EMAIL,
                to: customer.email,
                subject,
                html,
            });
            console.log(`Contract email sent to ${customer.email}`);

            await snap.ref.update({
                emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        } catch (error) {
            console.error("Failed to send contract email:", error);
        }

        return null;
    });
