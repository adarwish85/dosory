// Import utilities for CSV/Excel parsing and data validation

import Papa from "papaparse";

export interface ImportFieldConfig {
    field: string;
    label: string;
    required: boolean;
    type: "string" | "number" | "email" | "date" | "boolean";
    transform?: (value: string) => any;
}

export interface ModuleConfig {
    name: string;
    collection: string;
    fields: ImportFieldConfig[];
}

// Module configurations for each importable entity
export const MODULE_CONFIGS: Record<string, ModuleConfig> = {
    customers: {
        name: "Customers",
        collection: "customers",
        fields: [
            { field: "company", label: "Company Name", required: true, type: "string" },
            { field: "vatNumber", label: "VAT Number", required: false, type: "string" },
            { field: "phone", label: "Phone", required: false, type: "string" },
            { field: "email", label: "Email", required: false, type: "email" },
            { field: "website", label: "Website", required: false, type: "string" },
            { field: "address", label: "Address", required: false, type: "string" },
            { field: "city", label: "City", required: false, type: "string" },
            { field: "state", label: "State", required: false, type: "string" },
            { field: "zipCode", label: "Zip Code", required: false, type: "string" },
            { field: "country", label: "Country", required: false, type: "string" },
            { field: "currency", label: "Currency", required: false, type: "string" },
        ],
    },
    leads: {
        name: "Leads",
        collection: "leads",
        fields: [
            { field: "name", label: "Name", required: true, type: "string" },
            { field: "company", label: "Company", required: false, type: "string" },
            { field: "email", label: "Email", required: false, type: "email" },
            { field: "phone", label: "Phone", required: false, type: "string" },
            { field: "source", label: "Source", required: false, type: "string" },
            { field: "status", label: "Status", required: false, type: "string" },
            { field: "value", label: "Value", required: false, type: "number" },
            { field: "address", label: "Address", required: false, type: "string" },
            { field: "city", label: "City", required: false, type: "string" },
            { field: "country", label: "Country", required: false, type: "string" },
        ],
    },
    contacts: {
        name: "Contacts",
        collection: "contacts",
        fields: [
            { field: "firstName", label: "First Name", required: true, type: "string" },
            { field: "lastName", label: "Last Name", required: true, type: "string" },
            { field: "email", label: "Email", required: true, type: "email" },
            { field: "phone", label: "Phone", required: false, type: "string" },
            { field: "position", label: "Position/Title", required: false, type: "string" },
            { field: "customerId", label: "Customer ID", required: false, type: "string" },
        ],
    },
    products: {
        name: "Products/Services",
        collection: "products",
        fields: [
            { field: "name", label: "Name", required: true, type: "string" },
            { field: "description", label: "Description", required: false, type: "string" },
            { field: "rate", label: "Rate/Price", required: true, type: "number" },
            { field: "unit", label: "Unit", required: false, type: "string" },
        ],
    },
};

export interface ParsedData {
    headers: string[];
    rows: Record<string, string>[];
    totalRows: number;
}

export interface ColumnMapping {
    sourceColumn: string;
    targetField: string;
}

export interface ValidationError {
    row: number;
    field: string;
    message: string;
}

export interface ImportResult {
    success: number;
    failed: number;
    errors: ValidationError[];
}

// Parse CSV file
export function parseCSV(file: File): Promise<ParsedData> {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const headers = results.meta.fields || [];
                const rows = results.data as Record<string, string>[];
                resolve({
                    headers,
                    rows,
                    totalRows: rows.length,
                });
            },
            error: (error) => {
                reject(error);
            },
        });
    });
}

// Auto-detect column mappings based on header names
export function autoDetectMappings(
    headers: string[],
    moduleConfig: ModuleConfig
): ColumnMapping[] {
    const mappings: ColumnMapping[] = [];

    for (const field of moduleConfig.fields) {
        // Try exact match first
        let matchedHeader = headers.find(
            (h) => h.toLowerCase() === field.field.toLowerCase()
        );

        // Try label match
        if (!matchedHeader) {
            matchedHeader = headers.find(
                (h) => h.toLowerCase() === field.label.toLowerCase()
            );
        }

        // Try partial match
        if (!matchedHeader) {
            matchedHeader = headers.find(
                (h) =>
                    h.toLowerCase().includes(field.field.toLowerCase()) ||
                    field.field.toLowerCase().includes(h.toLowerCase())
            );
        }

        if (matchedHeader) {
            mappings.push({
                sourceColumn: matchedHeader,
                targetField: field.field,
            });
        }
    }

    return mappings;
}

// Validate a single row of data
export function validateRow(
    row: Record<string, any>,
    moduleConfig: ModuleConfig
): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const field of moduleConfig.fields) {
        const value = row[field.field];

        // Check required fields
        if (field.required && (!value || value.trim() === "")) {
            errors.push({
                row: 0, // Will be set by caller
                field: field.field,
                message: `${field.label} is required`,
            });
            continue;
        }

        // Skip validation for empty optional fields
        if (!value || value.trim() === "") continue;

        // Type-specific validation
        switch (field.type) {
            case "email":
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    errors.push({
                        row: 0,
                        field: field.field,
                        message: `Invalid email format for ${field.label}`,
                    });
                }
                break;
            case "number":
                if (isNaN(parseFloat(value))) {
                    errors.push({
                        row: 0,
                        field: field.field,
                        message: `${field.label} must be a number`,
                    });
                }
                break;
        }
    }

    return errors;
}

// Transform row data based on mappings
export function transformRow(
    sourceRow: Record<string, string>,
    mappings: ColumnMapping[],
    moduleConfig: ModuleConfig
): Record<string, any> {
    const result: Record<string, any> = {};

    for (const mapping of mappings) {
        const field = moduleConfig.fields.find((f) => f.field === mapping.targetField);
        let value = sourceRow[mapping.sourceColumn];

        if (field && value !== undefined && value !== null) {
            // Apply type transformations
            switch (field.type) {
                case "number":
                    result[mapping.targetField] = parseFloat(value) || 0;
                    break;
                case "boolean":
                    result[mapping.targetField] =
                        value.toLowerCase() === "true" ||
                        value.toLowerCase() === "yes" ||
                        value === "1";
                    break;
                default:
                    result[mapping.targetField] = value.trim();
            }
        }
    }

    return result;
}

// Generate sample CSV template for a module
export function generateTemplate(moduleConfig: ModuleConfig): string {
    const headers = moduleConfig.fields.map((f) => f.label);
    const sampleRow = moduleConfig.fields.map((f) => {
        switch (f.type) {
            case "email":
                return "example@email.com";
            case "number":
                return "100";
            default:
                return f.required ? "Sample Value" : "";
        }
    });

    return [headers.join(","), sampleRow.join(",")].join("\n");
}

// Download template as CSV file
export function downloadTemplate(moduleConfig: ModuleConfig): void {
    const csv = generateTemplate(moduleConfig);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${moduleConfig.name.toLowerCase()}_import_template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
