// Detailed permission structure with Own/Global distinctions for UI rendering
export const PERMISSION_MODULES = [
    {
        id: "contracts",
        label: "Contracts",
        actions: [
            { id: "view-own", label: "View (Own)" },
            { id: "view-global", label: "View (Global)" },
            { id: "create", label: "Create" },
            { id: "edit", label: "Edit" },
            { id: "delete", label: "Delete" },
            { id: "view-templates", label: "View All Templates" },
        ],
    },
    {
        id: "credit-notes",
        label: "Credit Notes",
        actions: [
            { id: "view-own", label: "View (Own)" },
            { id: "view-global", label: "View (Global)" },
            { id: "create", label: "Create" },
            { id: "edit", label: "Edit" },
            { id: "delete", label: "Delete" },
        ],
    },
    {
        id: "customers",
        label: "Customers",
        actions: [
            { id: "view-own", label: "View (Own)" },
            { id: "view-global", label: "View (Global)" },
            { id: "create", label: "Create" },
            { id: "edit", label: "Edit" },
            { id: "delete", label: "Delete" },
        ],
    },
    {
        id: "estimates",
        label: "Estimates",
        actions: [
            { id: "view-own", label: "View (Own)" },
            { id: "view-global", label: "View (Global)" },
            { id: "create", label: "Create" },
            { id: "edit", label: "Edit" },
            { id: "delete", label: "Delete" },
        ],
    },
    {
        id: "estimate-request",
        label: "Estimate Request",
        actions: [
            { id: "view-own", label: "View (Own)" },
            { id: "view-global", label: "View (Global)" },
            { id: "create", label: "Create" },
            { id: "edit", label: "Edit" },
            { id: "delete", label: "Delete" },
        ],
    },
    {
        id: "expenses",
        label: "Expenses",
        actions: [
            { id: "view-own", label: "View (Own)" },
            { id: "view-global", label: "View (Global)" },
            { id: "create", label: "Create" },
            { id: "edit", label: "Edit" },
            { id: "delete", label: "Delete" },
        ],
    },
    {
        id: "invoices",
        label: "Invoices",
        actions: [
            { id: "view-own", label: "View (Own)" },
            { id: "view-global", label: "View (Global)" },
            { id: "create", label: "Create" },
            { id: "edit", label: "Edit" },
            { id: "delete", label: "Delete" },
        ],
    },
    {
        id: "knowledge-base",
        label: "Knowledge Base",
        actions: [
            { id: "view-global", label: "View (Global)" },
            { id: "create", label: "Create" },
            { id: "edit", label: "Edit" },
            { id: "delete", label: "Delete" },
        ],
    },
    {
        id: "leads",
        label: "Leads",
        actions: [
            { id: "view-global", label: "View (Global)" },
            { id: "delete", label: "Delete" },
        ],
    },
    {
        id: "payments",
        label: "Payments",
        actions: [
            { id: "view-own", label: "View (Own)" },
            { id: "view-global", label: "View (Global)" },
            { id: "create", label: "Create" },
            { id: "edit", label: "Edit" },
            { id: "delete", label: "Delete" },
        ],
    },
    {
        id: "projects",
        label: "Projects",
        actions: [
            { id: "view-own", label: "View (Own)" },
            { id: "view-global", label: "View (Global)" },
            { id: "create", label: "Create" },
            { id: "edit", label: "Edit" },
            { id: "delete", label: "Delete" },
            { id: "create-timesheets", label: "Create Timesheets" },
            { id: "edit-milestones", label: "Edit Milestones" },
            { id: "delete-milestones", label: "Delete Milestones" },
        ],
    },
    {
        id: "reports",
        label: "Reports",
        actions: [
            { id: "view-global", label: "View (Global)" },
            { id: "view-timesheets-report", label: "View Timesheets Report" },
        ],
    },
    {
        id: "settings",
        label: "Settings",
        actions: [
            { id: "view-global", label: "View (Global)" },
            { id: "edit", label: "Edit" },
        ],
    },
    {
        id: "staff",
        label: "Staff",
        actions: [
            { id: "view-global", label: "View (Global)" },
            { id: "create", label: "Create" },
            { id: "edit", label: "Edit" },
            { id: "delete", label: "Delete" },
        ],
    },
    {
        id: "staff-roles",
        label: "Staff Roles",
        actions: [
            { id: "view-global", label: "View (Global)" },
            { id: "create", label: "Create" },
            { id: "edit", label: "Edit" },
            { id: "delete", label: "Delete" },
        ],
    },
    {
        id: "tasks",
        label: "Tasks",
        actions: [
            { id: "view-own", label: "View (Own)" },
            { id: "view-global", label: "View (Global)" },
            { id: "create", label: "Create" },
            { id: "edit", label: "Edit" },
            { id: "delete", label: "Delete" },
            { id: "edit-timesheets-global", label: "Edit Timesheets (Global)" },
            { id: "edit-own-timesheets", label: "Edit Own Timesheets" },
            { id: "delete-timesheets-global", label: "Delete Timesheets (Global)" },
            { id: "delete-own-timesheets", label: "Delete Own Timesheets" },
        ],
    },
    {
        id: "tickets",
        label: "Support Tickets",
        actions: [
            { id: "view-own", label: "View (Assigned)" },
            { id: "view-global", label: "View (Global)" },
            { id: "create", label: "Create" },
            { id: "edit", label: "Edit Properties" },
            { id: "reply", label: "Reply" },
            { id: "delete", label: "Delete" },
            { id: "close", label: "Close" },
            { id: "assign", label: "Assign" },
        ],
    },
    {
        id: "task-checklist-templates",
        label: "Task Checklist Templates",
        actions: [
            { id: "create", label: "Create" },
            { id: "delete", label: "Delete" },
        ],
    },
] as const;

/**
 * Canonical Permission type derived from PERMISSION_MODULES.
 *
 * Each permission is `${module.id}-${action.id}` — dash-separated, scope-aware
 * (e.g. "customers-view-own", "customers-view-global", "tickets-reply"). This
 * matches the string format that role-form.tsx persists to staff.permissions[]
 * in Firestore and that hasPermission() reads back via Array.includes().
 *
 * Use this type for can() arguments to catch wrong-format strings at compile time.
 */
export type Permission = {
    [M in (typeof PERMISSION_MODULES)[number] as M["id"]]: `${M["id"]}-${M["actions"][number]["id"]}`;
}[(typeof PERMISSION_MODULES)[number]["id"]];
