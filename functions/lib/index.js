"use strict";
// Firebase Cloud Functions Entry Point
// Export all scheduled functions
Object.defineProperty(exports, "__esModule", { value: true });
exports.onContractCreated = exports.onProposalStatusChange = exports.onProposalCreated = exports.onInvoiceSent = exports.trialExpiryCheck = exports.contractAutoExpiry = exports.subscriptionAutoBilling = void 0;
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
//# sourceMappingURL=index.js.map