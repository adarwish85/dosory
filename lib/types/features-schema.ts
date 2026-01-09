/**
 * Module Features Schema Registry
 * 
 * Central registry defining all available features per module.
 * Used by:
 * - Plan editor UI to render feature toggles/fields
 * - Entitlement resolution to validate and merge features
 */

export type FeatureType = "boolean" | "number" | "string" | "select";

export interface FeatureDefinition {
    key: string;
    label: string;
    description: string;
    type: FeatureType;
    defaultValue: any;
    options?: string[];  // For "select" type
    min?: number;        // For "number" type
    max?: number;        // For "number" type
}

export interface ModuleFeatureSchema {
    moduleKey: string;
    moduleName: string;
    features: FeatureDefinition[];
}

/**
 * Registry of all module features
 * Add new modules and their features here
 */
export const MODULE_FEATURES_SCHEMA: ModuleFeatureSchema[] = [
    {
        moduleKey: "crm",
        moduleName: "CRM",
        features: [
            {
                key: "advancedFilters",
                label: "Advanced Filters",
                description: "Enable advanced filtering in customer lists",
                type: "boolean",
                defaultValue: false
            },
            {
                key: "maxContacts",
                label: "Max Contacts",
                description: "Maximum number of contacts (-1 = unlimited)",
                type: "number",
                defaultValue: 1000,
                min: -1
            },
            {
                key: "customFields",
                label: "Custom Fields",
                description: "Allow custom field creation",
                type: "boolean",
                defaultValue: false
            },
            {
                key: "importExport",
                label: "Import/Export",
                description: "Enable data import and export",
                type: "boolean",
                defaultValue: true
            }
        ]
    },
    {
        moduleKey: "projects",
        moduleName: "Projects",
        features: [
            {
                key: "maxProjects",
                label: "Max Projects",
                description: "Maximum number of projects (-1 = unlimited)",
                type: "number",
                defaultValue: 10,
                min: -1
            },
            {
                key: "ganttView",
                label: "Gantt View",
                description: "Enable Gantt chart view",
                type: "boolean",
                defaultValue: false
            },
            {
                key: "timeTracking",
                label: "Time Tracking",
                description: "Enable time tracking on tasks",
                type: "boolean",
                defaultValue: false
            },
            {
                key: "automations",
                label: "Automations",
                description: "Enable workflow automations",
                type: "boolean",
                defaultValue: false
            }
        ]
    },
    {
        moduleKey: "support",
        moduleName: "Support",
        features: [
            {
                key: "ticketLimit",
                label: "Monthly Ticket Limit",
                description: "Max tickets per month (-1 = unlimited)",
                type: "number",
                defaultValue: 100,
                min: -1
            },
            {
                key: "slaManagement",
                label: "SLA Management",
                description: "Enable SLA policies and tracking",
                type: "boolean",
                defaultValue: false
            },
            {
                key: "customerPortal",
                label: "Customer Portal",
                description: "Enable customer self-service portal",
                type: "boolean",
                defaultValue: false
            },
            {
                key: "knowledgeBase",
                label: "Knowledge Base",
                description: "Enable knowledge base articles",
                type: "boolean",
                defaultValue: true
            }
        ]
    },
    {
        moduleKey: "invoicing",
        moduleName: "Invoicing",
        features: [
            {
                key: "maxInvoices",
                label: "Monthly Invoice Limit",
                description: "Max invoices per month (-1 = unlimited)",
                type: "number",
                defaultValue: 50,
                min: -1
            },
            {
                key: "recurringInvoices",
                label: "Recurring Invoices",
                description: "Enable recurring invoice schedules",
                type: "boolean",
                defaultValue: false
            },
            {
                key: "multiCurrency",
                label: "Multi-Currency",
                description: "Support multiple currencies",
                type: "boolean",
                defaultValue: false
            },
            {
                key: "paymentGateways",
                label: "Payment Gateways",
                description: "Number of payment gateways allowed",
                type: "number",
                defaultValue: 1,
                min: 1
            }
        ]
    },
    {
        moduleKey: "reports",
        moduleName: "Reports",
        features: [
            {
                key: "advancedReports",
                label: "Advanced Reports",
                description: "Access to advanced analytics reports",
                type: "boolean",
                defaultValue: false
            },
            {
                key: "exportFormats",
                label: "Export Formats",
                description: "Available export formats",
                type: "select",
                defaultValue: "pdf",
                options: ["pdf", "pdf,csv", "pdf,csv,xlsx"]
            },
            {
                key: "scheduledReports",
                label: "Scheduled Reports",
                description: "Enable scheduled report delivery",
                type: "boolean",
                defaultValue: false
            },
            {
                key: "customDashboards",
                label: "Custom Dashboards",
                description: "Create custom dashboard layouts",
                type: "boolean",
                defaultValue: false
            }
        ]
    },
    {
        moduleKey: "api-access",
        moduleName: "API Access",
        features: [
            {
                key: "enabled",
                label: "API Enabled",
                description: "Enable REST API access",
                type: "boolean",
                defaultValue: false
            },
            {
                key: "rateLimit",
                label: "Rate Limit",
                description: "API requests per minute",
                type: "number",
                defaultValue: 60,
                min: 10
            },
            {
                key: "webhooks",
                label: "Webhooks",
                description: "Enable webhook integrations",
                type: "boolean",
                defaultValue: false
            },
            {
                key: "maxApiKeys",
                label: "Max API Keys",
                description: "Number of API keys allowed",
                type: "number",
                defaultValue: 2,
                min: 1
            }
        ]
    }
];

/**
 * Get feature schema for a specific module
 */
export function getModuleFeatureSchema(moduleKey: string): ModuleFeatureSchema | undefined {
    return MODULE_FEATURES_SCHEMA.find(m => m.moduleKey === moduleKey);
}

/**
 * Get default feature values for a module
 */
export function getDefaultFeatures(moduleKey: string): Record<string, any> {
    const schema = getModuleFeatureSchema(moduleKey);
    if (!schema) return {};

    const defaults: Record<string, any> = {};
    for (const feature of schema.features) {
        defaults[feature.key] = feature.defaultValue;
    }
    return defaults;
}

/**
 * Get all module keys available
 */
export function getAllModuleKeys(): string[] {
    return MODULE_FEATURES_SCHEMA.map(m => m.moduleKey);
}
