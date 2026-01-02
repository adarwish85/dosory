// Central Permission Registry
// All modules must register their permissions here.

import { PermissionDefinition, RBACAction, RBACScope, RBACModuleRegistry } from "./types";

export const PERMISSIONS_REGISTRY: PermissionDefinition[] = [];

/**
 * Register a module's permissions to the central registry.
 * This should be called at the app root or module initialization.
 */
export function registerModulePermissions(registry: RBACModuleRegistry) {
    registry.permissions.forEach((p) => {
        // Prevent duplicate registration
        if (!PERMISSIONS_REGISTRY.some((existing) => existing.code === p.code)) {
            PERMISSIONS_REGISTRY.push(p);
        }
    });
}

/**
 * Helper to generate standardized permission codes
 */
export function definePermission(
    module: string,
    resource: string,
    action: RBACAction,
    scope: RBACScope,
    description: string
): PermissionDefinition {
    return {
        code: `${module}.${resource}.${action}.${scope}`,
        module,
        resource,
        action,
        scope,
        description,
    };
}

// ----------------------------------------------------------------------
// STANDARD PERMISSIONS SEED
// ----------------------------------------------------------------------

// 1. Finance Module
export const FINANCE_PERMISSIONS = {
    INVOICE_CREATE: definePermission("finance", "invoice", "create", "global", "Create new invoices"),
    INVOICE_READ_OWN: definePermission("finance", "invoice", "read", "own", "View own invoices"),
    INVOICE_READ_GLOBAL: definePermission("finance", "invoice", "read", "global", "View all invoices"),
    INVOICE_UPDATE: definePermission("finance", "invoice", "update", "global", "Edit invoices"),
    INVOICE_DELETE: definePermission("finance", "invoice", "delete", "global", "Delete invoices"),
    PAYMENT_PROCESS: definePermission("finance", "payment", "create", "global", "Process payments"),
};

// 2. CRM Module
export const CRM_PERMISSIONS = {
    CUSTOMER_CREATE: definePermission("crm", "customer", "create", "global", "Add new customers"),
    CUSTOMER_READ: definePermission("crm", "customer", "read", "global", "View customers"),
    CUSTOMER_UPDATE: definePermission("crm", "customer", "update", "global", "Edit customer details"),
};

// 3. Projects Module
export const PROJECT_PERMISSIONS = {
    PROJECT_CREATE: definePermission("projects", "project", "create", "global", "Create projects"),
    PROJECT_READ_OWN: definePermission("projects", "project", "read", "own", "View assigned projects"),
    PROJECT_READ_GLOBAL: definePermission("projects", "project", "read", "global", "View all projects"),
    TASK_ASSIGN: definePermission("projects", "task", "assign", "global", "Assign tasks to users"),
};

// Initial Registration
registerModulePermissions({ moduleName: "finance", permissions: Object.values(FINANCE_PERMISSIONS) });
registerModulePermissions({ moduleName: "crm", permissions: Object.values(CRM_PERMISSIONS) });
registerModulePermissions({ moduleName: "projects", permissions: Object.values(PROJECT_PERMISSIONS) });
