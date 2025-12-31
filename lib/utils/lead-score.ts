// Lead Score Calculation Utility
// Shared across all lead views for consistent scoring

import type { Lead } from "@/lib/types";

interface LeadScoreBreakdown {
    label: string;
    earned: boolean;
    points: number;
}

/**
 * Calculate the effective deal value from a lead
 * Prefers products sum if available, falls back to deal.value, then lead.value
 */
export function calculateDealValue(lead: Lead): number {
    // First check if deal has products with amounts
    if (lead.deal?.products && lead.deal.products.length > 0) {
        return lead.deal.products.reduce((sum: number, p: { amount?: number }) => sum + (p.amount || 0), 0);
    }
    // Fall back to deal.value
    if (lead.deal?.value) {
        return lead.deal.value;
    }
    // Fall back to lead.value (legacy field)
    return lead.value || 0;
}

/**
 * Calculate lead score (0-100) based on multiple criteria
 * Includes deal value from products, contact info, status, and more
 */
export function calculateLeadScore(lead: Lead): number {
    let score = 0;

    // Has email (+15)
    if (lead.email) score += 15;

    // Has phone (+15)
    if (lead.phone) score += 15;

    // Has company name (+10)
    if (lead.company) score += 10;

    // Source (+10)
    if (lead.source) score += 10;

    // Tags (+5)
    if (lead.tags && lead.tags.length > 0) score += 5;

    // Status progression (+10 for qualified/proposal/negotiation)
    if (["qualified", "proposal", "negotiation"].includes(lead.status || "")) {
        score += 10;
    }

    // Position (+5)
    if (lead.position) score += 5;

    // Website (+5)
    if (lead.website) score += 5;

    // Location (+5 each for country and city)
    if (lead.address?.country) score += 5;
    if (lead.address?.city) score += 5;

    // Deal value scoring (tiered)
    const dealValue = calculateDealValue(lead);
    if (dealValue > 0) score += 15;
    if (dealValue >= 10000) score += 5;
    if (dealValue >= 50000) score += 5;

    return Math.min(score, 100);
}

/**
 * Calculate lead score with detailed breakdown for display
 */
export function calculateLeadScoreWithBreakdown(lead: Lead): {
    score: number;
    breakdown: LeadScoreBreakdown[];
} {
    const breakdown: LeadScoreBreakdown[] = [];
    let score = 0;

    // Has email (+15)
    const hasEmail = !!lead.email;
    breakdown.push({ label: "Has email", earned: hasEmail, points: 15 });
    if (hasEmail) score += 15;

    // Has phone (+15)
    const hasPhone = !!lead.phone;
    breakdown.push({ label: "Has phone", earned: hasPhone, points: 15 });
    if (hasPhone) score += 15;

    // Has company (+10)
    const hasCompany = !!lead.company;
    breakdown.push({ label: "Has company", earned: hasCompany, points: 10 });
    if (hasCompany) score += 10;

    // Source (+10)
    const hasSource = !!lead.source;
    breakdown.push({ label: "Has source", earned: hasSource, points: 10 });
    if (hasSource) score += 10;

    // Status progression (+10)
    const hasStatus = ["qualified", "proposal", "negotiation"].includes(lead.status || "");
    breakdown.push({ label: "Status qualified+", earned: hasStatus, points: 10 });
    if (hasStatus) score += 10;

    // Deal value (tiered: base 15, +5 for 10k, +5 for 50k)
    const dealValue = calculateDealValue(lead);
    const hasDealValue = dealValue > 0;
    const dealPoints = hasDealValue ? 15 + (dealValue >= 10000 ? 5 : 0) + (dealValue >= 50000 ? 5 : 0) : 0;
    breakdown.push({
        label: `Deal value ($${dealValue.toLocaleString()})`,
        earned: hasDealValue,
        points: dealPoints,
    });
    score += dealPoints;

    // Tags (+5)
    const hasTags = lead.tags && lead.tags.length > 0;
    breakdown.push({ label: "Has tags", earned: !!hasTags, points: 5 });
    if (hasTags) score += 5;

    return { score: Math.min(score, 100), breakdown };
}

/**
 * Get score badge color class based on score value
 */
export function getScoreColor(score: number): string {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-blue-100 text-blue-800";
    if (score >= 40) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-600";
}

/**
 * Get score description based on score value
 */
export function getScoreDescription(score: number): string {
    if (score >= 80) return "Hot Lead - Ready for conversion";
    if (score >= 60) return "Warm Lead - Good potential";
    if (score >= 40) return "Developing - Needs nurturing";
    return "Cold Lead - More info needed";
}
