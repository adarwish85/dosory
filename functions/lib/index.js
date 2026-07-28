"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkDeleteLeads = exports.recalculateAnalytics = exports.monthlyAnalyticsSummary = exports.dailyAnalyticsSnapshot = exports.onProjectWrite = exports.onLeadWrite = exports.onCustomerWrite = exports.onPaymentWrite = exports.onInvoiceWrite = exports.voidInvoice = exports.finalizeInvoice = exports.processPayment = exports.checkReminders = exports.onTaskUpdate = exports.onUserCreated = exports.sendOnboardingEmails = exports.onContractCreated = exports.onInvoiceSent = exports.trialExpiryCheck = exports.contractAutoExpiry = exports.subscriptionAutoBilling = void 0;
// Firebase Cloud Functions Entry Point
const admin = require("firebase-admin");
// Initialize Firebase Admin SDK (must be first!)
admin.initializeApp();
// Export all scheduled functions
var subscriptionBilling_1 = require("./subscriptionBilling");
Object.defineProperty(exports, "subscriptionAutoBilling", { enumerable: true, get: function () { return subscriptionBilling_1.subscriptionAutoBilling; } });
var contractExpiry_1 = require("./contractExpiry");
Object.defineProperty(exports, "contractAutoExpiry", { enumerable: true, get: function () { return contractExpiry_1.contractAutoExpiry; } });
Object.defineProperty(exports, "trialExpiryCheck", { enumerable: true, get: function () { return contractExpiry_1.trialExpiryCheck; } });
// Export email notification functions
var emailNotifications_1 = require("./emailNotifications");
Object.defineProperty(exports, "onInvoiceSent", { enumerable: true, get: function () { return emailNotifications_1.onInvoiceSent; } });
Object.defineProperty(exports, "onContractCreated", { enumerable: true, get: function () { return emailNotifications_1.onContractCreated; } });
// Export onboarding functions
var onboardingEmails_1 = require("./onboardingEmails");
Object.defineProperty(exports, "sendOnboardingEmails", { enumerable: true, get: function () { return onboardingEmails_1.sendOnboardingEmails; } });
Object.defineProperty(exports, "onUserCreated", { enumerable: true, get: function () { return onboardingEmails_1.onUserCreated; } });
// Export task automation
var tasks_1 = require("./tasks");
Object.defineProperty(exports, "onTaskUpdate", { enumerable: true, get: function () { return tasks_1.onTaskUpdate; } });
// Export reminder automation
var reminders_1 = require("./reminders");
Object.defineProperty(exports, "checkReminders", { enumerable: true, get: function () { return reminders_1.checkReminders; } });
// Export finance automation
var finance_1 = require("./finance");
Object.defineProperty(exports, "processPayment", { enumerable: true, get: function () { return finance_1.processPayment; } });
Object.defineProperty(exports, "finalizeInvoice", { enumerable: true, get: function () { return finance_1.finalizeInvoice; } });
Object.defineProperty(exports, "voidInvoice", { enumerable: true, get: function () { return finance_1.voidInvoice; } });
// Export analytics triggers - Pre-aggregated stats
var analytics_1 = require("./analytics");
Object.defineProperty(exports, "onInvoiceWrite", { enumerable: true, get: function () { return analytics_1.onInvoiceWrite; } });
Object.defineProperty(exports, "onPaymentWrite", { enumerable: true, get: function () { return analytics_1.onPaymentWrite; } });
Object.defineProperty(exports, "onCustomerWrite", { enumerable: true, get: function () { return analytics_1.onCustomerWrite; } });
Object.defineProperty(exports, "onLeadWrite", { enumerable: true, get: function () { return analytics_1.onLeadWrite; } });
Object.defineProperty(exports, "onProjectWrite", { enumerable: true, get: function () { return analytics_1.onProjectWrite; } });
Object.defineProperty(exports, "dailyAnalyticsSnapshot", { enumerable: true, get: function () { return analytics_1.dailyAnalyticsSnapshot; } });
Object.defineProperty(exports, "monthlyAnalyticsSummary", { enumerable: true, get: function () { return analytics_1.monthlyAnalyticsSummary; } });
Object.defineProperty(exports, "recalculateAnalytics", { enumerable: true, get: function () { return analytics_1.recalculateAnalytics; } });
// Export leads automation
var leads_1 = require("./leads");
Object.defineProperty(exports, "bulkDeleteLeads", { enumerable: true, get: function () { return leads_1.bulkDeleteLeads; } });
//# sourceMappingURL=index.js.map