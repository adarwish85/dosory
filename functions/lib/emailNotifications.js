"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.onContractCreated = exports.onProposalStatusChange = exports.onProposalCreated = exports.onInvoiceSent = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const resend_1 = require("resend");
const emailTemplates_1 = require("./emailTemplates");
// Initialize Resend with API key from environment
const resend = new resend_1.Resend(((_a = functions.config().resend) === null || _a === void 0 ? void 0 : _a.api_key) || process.env.RESEND_API_KEY);
// Default from email - update this to your verified domain
const FROM_EMAIL = ((_b = functions.config().email) === null || _b === void 0 ? void 0 : _b.from) || "notifications@yourdomain.com";
// Helper to get organization name
async function getOrgName(orgId) {
    var _a;
    try {
        const orgDoc = await admin.firestore().collection("organizations").doc(orgId).get();
        return ((_a = orgDoc.data()) === null || _a === void 0 ? void 0 : _a.name) || "Your Business";
    }
    catch (_b) {
        return "Your Business";
    }
}
// Helper to get customer email
async function getCustomerEmail(customerId) {
    try {
        const customerDoc = await admin.firestore().collection("customers").doc(customerId).get();
        const data = customerDoc.data();
        if (data === null || data === void 0 ? void 0 : data.email) {
            return { email: data.email, name: data.name || data.company || "Customer" };
        }
        return null;
    }
    catch (_a) {
        return null;
    }
}
/**
 * Send email when invoice status changes to "sent"
 */
exports.onInvoiceSent = functions.firestore
    .document("invoices/{invoiceId}")
    .onUpdate(async (change, context) => {
    var _a, _b, _c;
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
    const emailData = {
        to: customer.email,
        customerName: customer.name,
        orgName,
        invoiceNumber: after.number || context.params.invoiceId,
        amount: after.total || 0,
        currency: after.currency || "USD",
        dueDate: ((_c = (_b = (_a = after.dueDate) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toLocaleDateString()) || "N/A",
    };
    const { subject, html } = (0, emailTemplates_1.getInvoiceSentEmail)(emailData);
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
    }
    catch (error) {
        console.error("Failed to send invoice email:", error);
    }
    return null;
});
/**
 * Send email when proposal is created
 */
exports.onProposalCreated = functions.firestore
    .document("proposals/{proposalId}")
    .onCreate(async (snap, context) => {
    var _a, _b, _c, _d;
    const proposal = snap.data();
    console.log(`Proposal ${context.params.proposalId} created, sending email...`);
    const customer = await getCustomerEmail(proposal.customerId);
    if (!customer) {
        console.log("No customer email found, skipping");
        return null;
    }
    const orgName = await getOrgName(proposal.orgId);
    const portalUrl = `${((_a = functions.config().app) === null || _a === void 0 ? void 0 : _a.url) || 'https://yourapp.com'}/portal/${context.params.proposalId}`;
    const emailData = {
        to: customer.email,
        customerName: customer.name,
        orgName,
        proposalNumber: proposal.number || context.params.proposalId,
        subject: proposal.subject || "New Proposal",
        total: proposal.total || 0,
        currency: proposal.currency || "USD",
        validUntil: ((_d = (_c = (_b = proposal.openTill) === null || _b === void 0 ? void 0 : _b.toDate) === null || _c === void 0 ? void 0 : _c.call(_b)) === null || _d === void 0 ? void 0 : _d.toLocaleDateString()) || "N/A",
        viewUrl: portalUrl,
    };
    const { subject, html } = (0, emailTemplates_1.getProposalCreatedEmail)(emailData);
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
    }
    catch (error) {
        console.error("Failed to send proposal email:", error);
    }
    return null;
});
/**
 * Send email when proposal is accepted or declined (notify org admin)
 */
exports.onProposalStatusChange = functions.firestore
    .document("proposals/{proposalId}")
    .onUpdate(async (change, context) => {
    var _a, _b, _c;
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
    const adminEmail = (orgData === null || orgData === void 0 ? void 0 : orgData.email) || (orgData === null || orgData === void 0 ? void 0 : orgData.adminEmail);
    if (!adminEmail) {
        console.log("No org admin email found, skipping");
        return null;
    }
    const customer = await getCustomerEmail(after.customerId);
    const emailData = {
        to: adminEmail,
        customerName: (customer === null || customer === void 0 ? void 0 : customer.name) || "Customer",
        proposalNumber: after.number || context.params.proposalId,
        subject: after.subject || "Proposal",
        total: after.total || 0,
        currency: after.currency || "USD",
        validUntil: ((_c = (_b = (_a = after.openTill) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toLocaleDateString()) || "N/A",
        viewUrl: "",
        status: after.status,
    };
    const { subject, html } = (0, emailTemplates_1.getProposalStatusEmail)(emailData);
    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: adminEmail,
            subject,
            html,
        });
        console.log(`Proposal status email sent to ${adminEmail}`);
    }
    catch (error) {
        console.error("Failed to send proposal status email:", error);
    }
    return null;
});
/**
 * Send email when contract is created
 */
exports.onContractCreated = functions.firestore
    .document("contracts/{contractId}")
    .onCreate(async (snap, context) => {
    var _a, _b, _c, _d, _e, _f;
    const contract = snap.data();
    console.log(`Contract ${context.params.contractId} created, sending email...`);
    const customer = await getCustomerEmail(contract.customerId);
    if (!customer) {
        console.log("No customer email found, skipping");
        return null;
    }
    const emailData = {
        to: customer.email,
        customerName: customer.name,
        contractNumber: contract.number || context.params.contractId,
        subject: contract.subject || "New Contract",
        startDate: ((_c = (_b = (_a = contract.startDate) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toLocaleDateString()) || "N/A",
        endDate: ((_f = (_e = (_d = contract.endDate) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) === null || _f === void 0 ? void 0 : _f.toLocaleDateString()) || "N/A",
        value: contract.value || 0,
        currency: contract.currency || "USD",
    };
    const { subject, html } = (0, emailTemplates_1.getContractCreatedEmail)(emailData);
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
    }
    catch (error) {
        console.error("Failed to send contract email:", error);
    }
    return null;
});
//# sourceMappingURL=emailNotifications.js.map