// New hierarchical setup menu structure
// This replaces the flat menu in setup-sidebar.tsx

import {
    Building2,
    Users,
    UserCog,
    TrendingUp,
    DollarSign,
    Cog,
    FileText,
    Palette,
    Plug,
    HelpCircle,
    type LucideIcon,
} from "lucide-react";

export interface SetupMenuItem {
    id: string;
    label: string;
    href?: string; // If undefined, this is a category (not clickable)
    icon?: LucideIcon;
    children?: SetupMenuItem[];
    badge?: string; // Optional badge (e.g., "New", "Beta")
}

export const SETUP_MENU_STRUCTURE: SetupMenuItem[] = [
    {
        id: "organization",
        label: "Organization",
        icon: Building2,
        children: [
            {
                id: "company-info",
                label: "Company Information",
                href: "/dashboard/setup/organization/company-info",
            },
            {
                id: "branding",
                label: "Branding",
                href: "/dashboard/setup/organization/branding",
            },
            {
                id: "localization",
                label: "Localization",
                href: "/dashboard/setup/organization/localization",
            },
            {
                id: "business-calendar",
                label: "Business Calendar",
                href: "/dashboard/setup/organization/business-calendar",
            },
            {
                id: "file-storage",
                label: "File & Storage Settings",
                href: "/dashboard/setup/organization/file-storage",
            },
        ],
    },
    {
        id: "team-roles",
        label: "Team & Roles",
        icon: Users,
        children: [
            {
                id: "staff",
                label: "Staff",
                href: "/dashboard/setup/team-roles/staff",
            },
            {
                id: "roles-permissions",
                label: "Roles & Permissions",
                href: "/dashboard/setup/team-roles/roles-permissions",
            },
            {
                id: "departments",
                label: "Teams / Departments",
                href: "/dashboard/setup/team-roles/departments",
            },
            {
                id: "approval-rules",
                label: "Approval Rules",
                href: "/dashboard/setup/team-roles/approval-rules",
                badge: "Soon",
            },
        ],
    },
    {
        id: "customers-config",
        label: "Customers Configuration",
        icon: UserCog,
        children: [
            {
                id: "types-segments",
                label: "Customer Types / Segments",
                href: "/dashboard/setup/customers-config/types-segments",
            },
            {
                id: "default-statuses",
                label: "Default Statuses",
                href: "/dashboard/setup/customers-config/default-statuses",
            },
            {
                id: "features",
                label: "Customer Features",
                href: "/dashboard/setup/customers-config/features",
            },
            {
                id: "custom-fields",
                label: "Customer Custom Fields",
                href: "/dashboard/setup/customers-config/custom-fields",
            },
        ],
    },
    {
        id: "sales-crm",
        label: "Sales & CRM",
        icon: TrendingUp,
        children: [
            {
                id: "leads-config",
                label: "Leads Configuration",
                href: "/dashboard/setup/sales-crm/leads-config",
                children: [
                    {
                        id: "leads-general",
                        label: "General Settings",
                        href: "/dashboard/setup/sales-crm/leads-config",
                    },
                    {
                        id: "leads-sources",
                        label: "Lead Sources",
                        href: "/dashboard/setup/sales-crm/leads-config/sources",
                    },
                    {
                        id: "leads-statuses",
                        label: "Lead Statuses",
                        href: "/dashboard/setup/sales-crm/leads-config/statuses",
                    },
                    {
                        id: "leads-web-to-lead",
                        label: "Web to Lead",
                        href: "/dashboard/setup/sales-crm/leads-config/web-to-lead",
                    },
                ],
            },
            {
                id: "pipelines-stages",
                label: "Pipelines & Stages",
                href: "/dashboard/setup/sales-crm/pipelines-stages",
            },
            {
                id: "estimate-requests",
                label: "Estimate Requests",
                href: "/dashboard/setup/sales-crm/estimate-requests",
                children: [
                    {
                        id: "estimate-req-forms",
                        label: "Forms",
                        href: "/dashboard/setup/sales-crm/estimate-requests/forms",
                    },
                    {
                        id: "estimate-req-statuses",
                        label: "Statuses",
                        href: "/dashboard/setup/sales-crm/estimate-requests/statuses",
                    },
                ],
            },
            {
                id: "estimates",
                label: "Estimates",
                href: "/dashboard/setup/sales-crm/estimates",
            },
            {
                id: "crm-toggles",
                label: "CRM Feature Toggles",
                href: "/dashboard/setup/sales-crm/feature-toggles",
            },
        ],
    },
    {
        id: "finance-billing",
        label: "Finance & Billing",
        icon: DollarSign,
        children: [
            {
                id: "finance-general",
                label: "Finance General",
                href: "/dashboard/setup/finance-billing/general",
            },
            {
                id: "invoices",
                label: "Invoices",
                href: "/dashboard/setup/finance-billing/invoices",
            },
            {
                id: "credit-notes",
                label: "Credit Notes",
                href: "/dashboard/setup/finance-billing/credit-notes",
            },
            {
                id: "taxes-vat",
                label: "Taxes / VAT",
                href: "/dashboard/setup/finance-billing/taxes-vat",
            },
            {
                id: "payment-gateways",
                label: "Payment Gateways",
                href: "/dashboard/setup/finance-billing/payment-gateways",
            },
            {
                id: "chart-of-accounts",
                label: "Chart of Accounts",
                href: "/dashboard/setup/finance-billing/chart-of-accounts",
            },
            {
                id: "payment-modes",
                label: "Payment Modes",
                href: "/dashboard/setup/finance-billing/payment-modes",
            },
            {
                id: "expense-categories",
                label: "Expense Categories",
                href: "/dashboard/setup/finance-billing/expense-categories",
            },
            {
                id: "currencies",
                label: "Currencies",
                href: "/dashboard/setup/finance-billing/currencies",
            },
            {
                id: "audit-log",
                label: "Audit Log",
                href: "/dashboard/setup/finance-billing/audit-log",
            },
            {
                id: "period-closing",
                label: "Period Closing",
                href: "/dashboard/setup/finance-billing/period-closing",
            },
        ],
    },
    {
        id: "operations",
        label: "Operations",
        icon: Cog,
        children: [
            {
                id: "tasks-config",
                label: "Tasks Configuration",
                href: "/dashboard/setup/operations/tasks-config",
            },
            {
                id: "projects-config",
                label: "Projects Configuration",
                href: "/dashboard/setup/operations/projects-config",
            },
            {
                id: "support-config",
                label: "Support Configuration",
                href: "/dashboard/setup/operations/support-config",
                children: [
                    {
                        id: "support-general",
                        label: "General Settings",
                        href: "/dashboard/setup/operations/support-config",
                    },
                    {
                        id: "support-departments",
                        label: "Departments",
                        href: "/dashboard/setup/operations/support-config/departments",
                    },
                    {
                        id: "support-services",
                        label: "Services",
                        href: "/dashboard/setup/operations/support-config/services",
                    },
                    {
                        id: "support-priorities",
                        label: "Ticket Priorities",
                        href: "/dashboard/setup/operations/support-config/priorities",
                    },
                    {
                        id: "support-statuses",
                        label: "Ticket Statuses",
                        href: "/dashboard/setup/operations/support-config/statuses",
                    },
                    {
                        id: "support-replies",
                        label: "Predefined Replies",
                        href: "/dashboard/setup/operations/support-config/predefined-replies",
                    },
                    {
                        id: "support-spam",
                        label: "Spam Filters",
                        href: "/dashboard/setup/operations/support-config/spam-filters",
                    },
                ],
            },
            {
                id: "sla-rules",
                label: "SLA Rules",
                href: "/dashboard/setup/operations/sla-rules",
                badge: "Soon",
            },
        ],
    },
    {
        id: "templates-docs",
        label: "Templates & Documents",
        icon: FileText,
        children: [
            {
                id: "email-templates",
                label: "Email Templates",
                href: "/dashboard/setup/templates-docs/email-templates",
            },
            {
                id: "pdf-templates",
                label: "PDF Templates",
                href: "/dashboard/setup/templates-docs/pdf-templates",
            },
            {
                id: "contract-templates",
                label: "Contract Templates",
                href: "/dashboard/setup/templates-docs/contract-templates",
                children: [
                    {
                        id: "contract-types",
                        label: "Contract Types",
                        href: "/dashboard/setup/templates-docs/contract-templates/types",
                    },
                ],
            },
            {
                id: "esign-settings",
                label: "E-Sign Settings",
                href: "/dashboard/setup/templates-docs/esign-settings",
            },
        ],
    },
    {
        id: "customization",
        label: "Customization",
        icon: Palette,
        children: [
            {
                id: "custom-fields-global",
                label: "Custom Fields (Global)",
                href: "/dashboard/setup/customization/custom-fields",
            },
            {
                id: "menu-setup",
                label: "Menu Setup",
                href: "/dashboard/setup/customization/menu-setup",
                children: [
                    {
                        id: "main-menu",
                        label: "Main Menu",
                        href: "/dashboard/setup/customization/menu-setup/main-menu",
                    },
                    {
                        id: "setup-menu",
                        label: "Setup Menu",
                        href: "/dashboard/setup/customization/menu-setup/setup-menu",
                    },
                ],
            },
            {
                id: "feature-toggles",
                label: "Feature Toggles",
                href: "/dashboard/setup/customization/feature-toggles",
            },
            {
                id: "labels-statuses",
                label: "Labels & Statuses",
                href: "/dashboard/setup/customization/labels-statuses",
            },
            {
                id: "module-visibility",
                label: "Module Visibility",
                href: "/dashboard/setup/customization/module-visibility",
            },
        ],
    },
    {
        id: "integrations",
        label: "Integrations",
        icon: Plug,
        children: [
            {
                id: "ai-integrations",
                label: "AI Integrations",
                children: [
                    {
                        id: "openai",
                        label: "OpenAI",
                        href: "/dashboard/setup/integrations/ai/openai",
                    },
                ],
            },
            {
                id: "calendar-integrations",
                label: "Calendar Integrations",
                href: "/dashboard/setup/integrations/calendar",
            },
            {
                id: "email-providers",
                label: "Email Providers",
                href: "/dashboard/setup/integrations/email-providers",
            },
            {
                id: "webhooks",
                label: "Webhooks",
                href: "/dashboard/setup/integrations/webhooks",
                badge: "Soon",
            },
        ],
    },
    {
        id: "help-support",
        label: "Help & Support",
        icon: HelpCircle,
        children: [
            {
                id: "request-support",
                label: "Request Support",
                href: "/dashboard/setup/help-support/request",
            },
            {
                id: "documentation",
                label: "Documentation",
                href: "/dashboard/setup/help-support/docs",
            },
            {
                id: "system-status",
                label: "System Status",
                href: "/dashboard/setup/help-support/status",
            },
            {
                id: "account-plan-info",
                label: "Account & Plan Info",
                href: "/dashboard/setup/help-support/plan-info",
            },
        ],
    },
];
