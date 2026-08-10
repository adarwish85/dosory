// Firebase Cloud Functions Entry Point
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK (must be first!)
admin.initializeApp();

// Export all scheduled functions
export { subscriptionAutoBilling } from "./subscriptionBilling";
export { easykashReconcile } from "./easykashReconcile";
export { contractAutoExpiry, trialExpiryCheck } from "./contractExpiry";

// Export email notification functions
export {
    onInvoiceSent,
    onContractCreated
} from "./emailNotifications";

// Export onboarding functions
export { sendOnboardingEmails, onUserCreated } from "./onboardingEmails";

// Export task automation
export { onTaskUpdate } from "./tasks";

// Export reminder automation
export { checkReminders } from "./reminders";

// Export finance automation
export { processPayment, finalizeInvoice, voidInvoice } from "./finance";

// Export analytics triggers - Pre-aggregated stats
export {
    onInvoiceWrite,
    onPaymentWrite,
    onCustomerWrite,
    onLeadWrite,
    onProjectWrite,
    dailyAnalyticsSnapshot,
    monthlyAnalyticsSummary,
    recalculateAnalytics
} from "./analytics";

// Export leads automation
export { bulkDeleteLeads } from "./leads";
