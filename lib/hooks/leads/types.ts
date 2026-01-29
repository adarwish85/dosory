import type { Lead } from "@/lib/types";

export interface LeadStats {
    total: number;
    totalValue: number;
    starred: number;
    qualified: number;
}

export interface ConvertLeadOptions {
    company?: string;
    email?: string;
    createContact?: boolean;
    createProjectFromDeal?: boolean;
    createInvoiceFromEstimate?: boolean;
    selectedEstimateId?: string;
}
