// Firebase Cloud Functions Entry Point
// Export all scheduled functions

export { subscriptionAutoBilling } from "./subscriptionBilling";
export { contractAutoExpiry, trialExpiryCheck } from "./contractExpiry";

// Export email notification functions
export {
    onInvoiceSent,
    onProposalCreated,
    onProposalStatusChange,
    onContractCreated
} from "./emailNotifications";

// Export onboarding functions
export { sendOnboardingEmails, onUserCreated } from "./onboardingEmails";

// Export task automation
export { onTaskUpdate } from "./tasks";

// Export reminder automation
// Export reminder automation
export { checkReminders } from "./reminders";

// Export finance automation
export { processPayment, finalizeInvoice, voidInvoice } from "./finance";

// Export analytics triggers
export { onInvoiceWrite, dailyAnalyticsSnapshot } from "./analytics";
