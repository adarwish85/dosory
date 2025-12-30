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
export { checkReminders } from "./reminders";
