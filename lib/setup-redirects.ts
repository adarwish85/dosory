// Setup Menu URL Redirects
// Provides backward compatibility for old bookmarked URLs after menu refactor

export const SETUP_REDIRECTS: Record<string, string> = {
    // Top-level menu items
    "/dashboard/setup/staff": "/dashboard/setup/team-roles/staff",
    "/dashboard/setup/roles": "/dashboard/setup/team-roles/roles-permissions",
    "/dashboard/setup/customers": "/dashboard/setup/customers-config",
    "/dashboard/setup/support": "/dashboard/setup/operations/support-config",
    "/dashboard/setup/leads": "/dashboard/setup/sales-crm/leads-config",
    "/dashboard/setup/estimate-request": "/dashboard/setup/sales-crm/estimate-requests",
    "/dashboard/setup/contracts": "/dashboard/setup/templates-docs/contract-templates",
    "/dashboard/setup/email-templates": "/dashboard/setup/templates-docs/email-templates",
    "/dashboard/setup/custom-fields": "/dashboard/setup/customization/custom-fields",
    "/dashboard/setup/menu-setup": "/dashboard/setup/customization/menu-setup",
    "/dashboard/setup/modules": "/dashboard/setup/customization/feature-toggles",
    "/dashboard/setup/help": "/dashboard/setup/help-support",

    // Customers submenu
    "/dashboard/setup/customers/groups": "/dashboard/setup/customers-config/types-segments",

    // Support submenu
    "/dashboard/setup/support/departments": "/dashboard/setup/team-roles/departments",
    "/dashboard/setup/support/services": "/dashboard/setup/operations/support-config/services",
    "/dashboard/setup/support/ticket-priority": "/dashboard/setup/operations/support-config/priorities",
    "/dashboard/setup/support/ticket-statuses": "/dashboard/setup/operations/support-config/statuses",
    "/dashboard/setup/support/predefined-replies": "/dashboard/setup/operations/support-config/predefined-replies",
    "/dashboard/setup/support/spam-filters": "/dashboard/setup/operations/support-config/spam-filters",

    // Leads submenu
    "/dashboard/setup/leads/sources": "/dashboard/setup/sales-crm/leads-config/sources",
    "/dashboard/setup/leads/statuses": "/dashboard/setup/sales-crm/leads-config/statuses",
    "/dashboard/setup/leads/web-to-lead": "/dashboard/setup/sales-crm/leads-config/web-to-lead",
    "/dashboard/setup/leads/email-integration": "/dashboard/setup/integrations/email-providers",

    // Estimate Request submenu
    "/dashboard/setup/estimate-request/forms": "/dashboard/setup/sales-crm/estimate-requests/forms",
    "/dashboard/setup/estimate-request/statuses": "/dashboard/setup/sales-crm/estimate-requests/statuses",

    // Finance submenu
    "/dashboard/setup/finance": "/dashboard/setup/finance-billing",
    "/dashboard/setup/finance/chart-of-accounts": "/dashboard/setup/finance-billing/chart-of-accounts",
    "/dashboard/setup/finance/tax-rates": "/dashboard/setup/finance-billing/taxes-vat",
    "/dashboard/setup/finance/payment-modes": "/dashboard/setup/finance-billing/payment-modes",
    "/dashboard/setup/finance/currencies": "/dashboard/setup/finance-billing/currencies",
    "/dashboard/setup/finance/expenses-categories": "/dashboard/setup/finance-billing/expense-categories",
    "/dashboard/setup/finance/audit-log": "/dashboard/setup/finance-billing/audit-log",
    "/dashboard/setup/finance/closing": "/dashboard/setup/finance-billing/period-closing",

    // Contracts submenu
    "/dashboard/setup/contracts/contract-types": "/dashboard/setup/templates-docs/contract-templates/types",

    // Menu Setup submenu
    "/dashboard/setup/menu-setup/main-menu": "/dashboard/setup/customization/menu-setup/main-menu",
    "/dashboard/setup/menu-setup/setup-menu": "/dashboard/setup/customization/menu-setup/setup-menu",

    // Settings page splits (CRITICAL - monolith breakdown)
    "/dashboard/setup/settings": "/dashboard/setup/organization/company-info", // Default redirect to Company Info
};

/**
 * Helper function to check if a path needs redirection
 * @param pathname - Current pathname
 * @returns Redirect URL or null if no redirect needed
 */
export function getSetupRedirect(pathname: string): string | null {
    return SETUP_REDIRECTS[pathname] || null;
}

/**
 * Settings page tab-specific redirects
 * These handle deep-linked tabs from the old monolithic settings page
 */
export const SETTINGS_TAB_REDIRECTS: Record<string, string> = {
    general: "/dashboard/setup/organization/company-info",
    companyinfo: "/dashboard/setup/organization/company-info",
    localization: "/dashboard/setup/organization/localization",
    "email-setup": "/dashboard/setup/integrations/email-providers",
    branding: "/dashboard/setup/organization/branding",
    "file-storage": "/dashboard/setup/organization/file-storage",
    "finance-general": "/dashboard/setup/finance-billing/general",
    finance: "/dashboard/setup/finance-billing/general",
    invoice: "/dashboard/setup/finance-billing/invoices",
    invoices: "/dashboard/setup/finance-billing/invoices",
    estimate: "/dashboard/setup/sales-crm/estimates",
    estimates: "/dashboard/setup/sales-crm/estimates",
    "credit-note": "/dashboard/setup/finance-billing/credit-notes",
    "credit-notes": "/dashboard/setup/finance-billing/credit-notes",
    "payment-gateway": "/dashboard/setup/finance-billing/payment-gateways",
    "payment-gateways": "/dashboard/setup/finance-billing/payment-gateways",
    customers: "/dashboard/setup/customers-config/features",
    "customer-features": "/dashboard/setup/customers-config/features",
    tasks: "/dashboard/setup/operations/tasks-config",
    support: "/dashboard/setup/operations/support-config",
    "support-features": "/dashboard/setup/operations/support-config",
    leads: "/dashboard/setup/sales-crm/leads-config",
    "leads-features": "/dashboard/setup/sales-crm/leads-config",
    openai: "/dashboard/setup/integrations/ai/openai",
    ai: "/dashboard/setup/integrations/ai/openai",
    calendar: "/dashboard/setup/integrations/calendar",
    pdf: "/dashboard/setup/templates-docs/pdf-templates",
    "pdf-templates": "/dashboard/setup/templates-docs/pdf-templates",
    esign: "/dashboard/setup/templates-docs/esign-settings",
    "e-sign": "/dashboard/setup/templates-docs/esign-settings",
};

/**
 * Get redirect for settings page with tab parameter
 * @param tab - Tab parameter from old settings page
 * @returns Redirect URL or default company-info page
 */
export function getSettingsTabRedirect(tab: string | null): string {
    if (!tab) return "/dashboard/setup/organization/company-info";
    const normalized = tab.toLowerCase().replace(/_/g, "-");
    return SETTINGS_TAB_REDIRECTS[normalized] || "/dashboard/setup/organization/company-info";
}
