// Barrel export for all Firestore hooks

// Customers & Contacts
export { useCustomers, useCustomer, useContacts } from "./use-customers";

// Leads
export { useLeads, useLead } from "./use-leads";

// Invoices
export { useInvoices, useInvoice } from "./use-invoices";

// Projects & Tasks
export { useProjects, useProject, useTasks, useTask } from "./use-projects";
export { useTaskLists } from "./use-task-lists";
export { useMilestones, useTimesheets, useProjectDiscussions, useProjectFiles } from "./use-project-data";

// Expenses & Contracts
export { useExpenses, useExpenseCategories } from "./use-expenses";
export { useContracts, useContract } from "./use-contracts";

// Support & Knowledge Base
export { useTickets, useTicketReplies, useDepartments, useKnowledgeBase } from "./use-support";

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

// Currency Formatting
export { useCurrency } from "./use-currency";

// Project Management Enhancements
export { useTaskComments } from "./use-task-comments";
export { calculateProjectHealthStatus } from "./use-projects";

// HR Module
export { useDepartments as useHRDepartments, useJobTitles, useLeaveTypes, getDefaultLeaveTypes } from "./use-hr-settings";
export { useEmployees, useEmployee, useCurrentEmployee, useTeamMembers } from "./use-employees";
export { useAttendance, useWorkSchedules } from "./use-attendance";
export { useLeaveRequests, useLeaveBalances, useTeamLeaveCalendar } from "./use-leaves";
export { usePayrollInputs, usePayrollSummary } from "./use-payroll";
export { usePerformanceNotes, ratingLabels, ratingColors, flagLabels, flagColors } from "./use-performance";
export { useEmployeeDocuments } from "./use-employee-documents";
