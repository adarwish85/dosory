// Business Logic Validators

interface ValidationResult {
    valid: boolean;
    error?: string;
}

// Invoice status transitions
const validInvoiceTransitions: Record<string, string[]> = {
    draft: ["sent", "cancelled"],
    sent: ["partial", "paid", "overdue", "cancelled"],
    partial: ["paid", "overdue"],
    overdue: ["partial", "paid"],
    paid: [],
    cancelled: [],
};

export function validateInvoiceStatusTransition(from: string, to: string): ValidationResult {
    const allowed = validInvoiceTransitions[from] || [];
    if (allowed.includes(to)) {
        return { valid: true };
    }
    return { valid: false, error: `Cannot transition from '${from}' to '${to}'` };
}

// Payment validation
interface Invoice {
    amountDue: number;
    amountPaid: number;
    total: number;
}

export function validatePaymentAmount(invoice: Invoice, amount: number): ValidationResult {
    if (amount <= 0) {
        return { valid: false, error: "Payment amount must be positive" };
    }

    const balanceDue = invoice.amountDue;
    if (amount > balanceDue) {
        return { valid: false, error: `Payment amount exceeds balance due (${balanceDue})` };
    }

    return { valid: true };
}

// Estimate expiry check
export function isEstimateExpired(expiryDate: Date | null): boolean {
    if (!expiryDate) return false;

    const now = new Date();
    return expiryDate < now;
}

// Estimate conversion validation
interface Estimate {
    status: string;
    convertedToInvoiceId: string | null;
    expiryDate: Date;
}

export function canConvertEstimate(estimate: Estimate): ValidationResult {
    if (estimate.convertedToInvoiceId) {
        return { valid: false, error: "Estimate already converted to invoice" };
    }

    if (estimate.status !== "accepted") {
        return { valid: false, error: "Only accepted estimates can be converted" };
    }

    return { valid: true };
}

// Lead conversion validation
interface Lead {
    status: string;
    convertedToCustomerId: string | null;
}

export function canConvertLead(lead: Lead): ValidationResult {
    if (lead.convertedToCustomerId) {
        return { valid: false, error: "Lead already converted to customer" };
    }

    // Allow conversion from any status except lost
    if (lead.status === "lost") {
        return { valid: false, error: "Cannot convert lost leads" };
    }

    return { valid: true };
}

// Contract validation
export function isContractActive(startDate: Date, endDate: Date): boolean {
    const now = new Date();
    return now >= startDate && now <= endDate;
}

// Multi-tenancy validation
export function validateOrgAccess(userOrgId: string, resourceOrgId: string): ValidationResult {
    if (!userOrgId) {
        return { valid: false, error: "User organization required" };
    }

    if (userOrgId !== resourceOrgId) {
        return { valid: false, error: "Access denied - organization mismatch" };
    }

    return { valid: true };
}
