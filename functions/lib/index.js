"use strict";
// Firebase Cloud Functions Entry Point
// Export all scheduled functions
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailyAnalyticsSnapshot = exports.onInvoiceWrite = exports.voidInvoice = exports.finalizeInvoice = exports.processPayment = exports.checkReminders = exports.onTaskUpdate = exports.onUserCreated = exports.sendOnboardingEmails = exports.onContractCreated = exports.onProposalStatusChange = exports.onProposalCreated = exports.onInvoiceSent = exports.trialExpiryCheck = exports.contractAutoExpiry = exports.subscriptionAutoBilling = void 0;
var subscriptionBilling_1 = require("./subscriptionBilling");
Object.defineProperty(exports, "subscriptionAutoBilling", { enumerable: true, get: function () { return subscriptionBilling_1.subscriptionAutoBilling; } });
var contractExpiry_1 = require("./contractExpiry");
Object.defineProperty(exports, "contractAutoExpiry", { enumerable: true, get: function () { return contractExpiry_1.contractAutoExpiry; } });
Object.defineProperty(exports, "trialExpiryCheck", { enumerable: true, get: function () { return contractExpiry_1.trialExpiryCheck; } });
// Export email notification functions
var emailNotifications_1 = require("./emailNotifications");
Object.defineProperty(exports, "onInvoiceSent", { enumerable: true, get: function () { return emailNotifications_1.onInvoiceSent; } });
Object.defineProperty(exports, "onProposalCreated", { enumerable: true, get: function () { return emailNotifications_1.onProposalCreated; } });
Object.defineProperty(exports, "onProposalStatusChange", { enumerable: true, get: function () { return emailNotifications_1.onProposalStatusChange; } });
Object.defineProperty(exports, "onContractCreated", { enumerable: true, get: function () { return emailNotifications_1.onContractCreated; } });
// Export onboarding functions
var onboardingEmails_1 = require("./onboardingEmails");
Object.defineProperty(exports, "sendOnboardingEmails", { enumerable: true, get: function () { return onboardingEmails_1.sendOnboardingEmails; } });
Object.defineProperty(exports, "onUserCreated", { enumerable: true, get: function () { return onboardingEmails_1.onUserCreated; } });
// Export task automation
var tasks_1 = require("./tasks");
Object.defineProperty(exports, "onTaskUpdate", { enumerable: true, get: function () { return tasks_1.onTaskUpdate; } });
// Export reminder automation
// Export reminder automation
var reminders_1 = require("./reminders");
Object.defineProperty(exports, "checkReminders", { enumerable: true, get: function () { return reminders_1.checkReminders; } });
// Export finance automation
var finance_1 = require("./finance");
Object.defineProperty(exports, "processPayment", { enumerable: true, get: function () { return finance_1.processPayment; } });
Object.defineProperty(exports, "finalizeInvoice", { enumerable: true, get: function () { return finance_1.finalizeInvoice; } });
Object.defineProperty(exports, "voidInvoice", { enumerable: true, get: function () { return finance_1.voidInvoice; } });
// Export analytics triggers
var analytics_1 = require("./analytics");
Object.defineProperty(exports, "onInvoiceWrite", { enumerable: true, get: function () { return analytics_1.onInvoiceWrite; } });
Object.defineProperty(exports, "dailyAnalyticsSnapshot", { enumerable: true, get: function () { return analytics_1.dailyAnalyticsSnapshot; } });
//# sourceMappingURL=index.js.map