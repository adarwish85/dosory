// Barrel export for all Firestore hooks

// Customers & Contacts
export { useCustomers, useCustomer, useContacts } from "./use-customers";

// Leads
export { useLeads, useLead } from "./use-leads";

// Invoices
export { useInvoices, useInvoice } from "./use-invoices";

// Projects & Tasks
export { useProjects, useProject, useTasks, useTask } from "./use-projects";

// Expenses & Contracts
export {
    useExpenses,
    useExpenseCategories,
    useContracts,
} from "./use-expenses";

// Support & Knowledge Base
export {
    useTickets,
    useTicketReplies,
    useDepartments,
    useKnowledgeBase,
} from "./use-support";

// Staff, Roles & Settings
export {
    useStaff,
    useRoles,
    useTaxes,
    useCurrencies,
    usePaymentModes,
    useCustomFields,
    useEmailTemplates,
    useOrganization,
} from "./use-settings";

// Sales (Estimates)
export { useEstimates } from "./use-sales";

// Organization Settings
export { useOrganizationSettings, useOrganizationSettings as useSettings } from "./use-organization-settings";
