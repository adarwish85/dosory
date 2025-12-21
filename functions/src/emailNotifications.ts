import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Resend } from "resend";
import {
    getInvoiceSentEmail,
    getProposalCreatedEmail,
    getProposalStatusEmail,
    getContractCreatedEmail,
    InvoiceEmailData,
    ProposalEmailData,
    ContractEmailData
} from "./emailTemplates";

// Initialize Resend with API key from environment
const resend = new Resend(functions.config().resend?.api_key || process.env.RESEND_API_KEY);

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
            await resend.emails.send({
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
 * Send email when proposal is created
 */
export const onProposalCreated = functions.firestore
    .document("proposals/{proposalId}")
    .onCreate(async (snap, context) => {
        const proposal = snap.data();

        console.log(`Proposal ${context.params.proposalId} created, sending email...`);

        const customer = await getCustomerEmail(proposal.customerId);
        if (!customer) {
            console.log("No customer email found, skipping");
            return null;
        }

        const orgName = await getOrgName(proposal.orgId);
        const portalUrl = `${functions.config().app?.url || 'https://yourapp.com'}/portal/${context.params.proposalId}`;

        const emailData: ProposalEmailData = {
            to: customer.email,
            customerName: customer.name,
            orgName,
            proposalNumber: proposal.number || context.params.proposalId,
            subject: proposal.subject || "New Proposal",
            total: proposal.total || 0,
            currency: proposal.currency || "USD",
            validUntil: proposal.openTill?.toDate?.()?.toLocaleDateString() || "N/A",
            viewUrl: portalUrl,
        };

        const { subject, html } = getProposalCreatedEmail(emailData);

        try {
            await resend.emails.send({
                from: FROM_EMAIL,
                to: customer.email,
                subject,
                html,
            });
            console.log(`Proposal email sent to ${customer.email}`);

            await snap.ref.update({
                emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        } catch (error) {
            console.error("Failed to send proposal email:", error);
        }

        return null;
    });

/**
 * Send email when proposal is accepted or declined (notify org admin)
 */
export const onProposalStatusChange = functions.firestore
    .document("proposals/{proposalId}")
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();

        // Only trigger when status changes to accepted or declined
        const statusChanged = before.status !== after.status;
        const isRelevantStatus = after.status === "accepted" || after.status === "declined";

        if (!statusChanged || !isRelevantStatus) {
            return null;
        }

        console.log(`Proposal ${context.params.proposalId} ${after.status}, notifying org...`);

        // Get org admin email
        const orgDoc = await admin.firestore().collection("organizations").doc(after.orgId).get();
        const orgData = orgDoc.data();
        const adminEmail = orgData?.email || orgData?.adminEmail;

        if (!adminEmail) {
            console.log("No org admin email found, skipping");
            return null;
        }

        const customer = await getCustomerEmail(after.customerId);

        const emailData: ProposalEmailData = {
            to: adminEmail,
            customerName: customer?.name || "Customer",
            proposalNumber: after.number || context.params.proposalId,
            subject: after.subject || "Proposal",
            total: after.total || 0,
            currency: after.currency || "USD",
            validUntil: after.openTill?.toDate?.()?.toLocaleDateString() || "N/A",
            viewUrl: "",
            status: after.status,
        };

        const { subject, html } = getProposalStatusEmail(emailData);

        try {
            await resend.emails.send({
                from: FROM_EMAIL,
                to: adminEmail,
                subject,
                html,
            });
            console.log(`Proposal status email sent to ${adminEmail}`);
        } catch (error) {
            console.error("Failed to send proposal status email:", error);
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
            await resend.emails.send({
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
