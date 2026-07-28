"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onContractCreated = exports.onInvoiceSent = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const resend_1 = require("resend");
const emailTemplates_1 = require("./emailTemplates");
// Initialize Resend with API key from environment
// Lazy init: constructing `new Resend(undefined)` at module scope throws "Missing API key",
// which broke `firebase deploy` discovery (it executes the module to enumerate exports). The
// key is read at first send instead — it is present in the prod functions runtime config.
let _resend = null;
const getResend = () => { var _a; return (_resend !== null && _resend !== void 0 ? _resend : (_resend = new resend_1.Resend(((_a = functions.config().resend) === null || _a === void 0 ? void 0 : _a.api_key) || process.env.RESEND_API_KEY))); };
// Default from email - update this to your verified domain
const getFromEmail = () => { var _a; return ((_a = functions.config().email) === null || _a === void 0 ? void 0 : _a.from) || "notifications@yourdomain.com"; };
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
        await getResend().emails.send({
            from: getFromEmail(),
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
        await getResend().emails.send({
            from: getFromEmail(),
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