import { LeadStatus } from "@/lib/types";

export const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
    { value: "new", label: "New" },
    { value: "contacted", label: "Attempted to Contact" },
    { value: "qualified", label: "SQL" },
    { value: "proposal", label: "Offer Sent" },
    { value: "negotiation", label: "Negotiation" },
    { value: "won", label: "Partner" },
    { value: "lost", label: "Closed: Lost" },
    { value: "junk", label: "Junk" },
];

export const LEAD_SOURCES = [
    "WebSite",
    "Referral",
    "Social Media",
    "Cold Call",
    "Email Campaign",
    "Other"
] as const;

export const STATUS_COLORS: Record<LeadStatus, { bg: string; text: string; border: string }> = {
    new: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
    contacted: { bg: "bg-green-50", text: "text-green-600", border: "border-green-100" },
    qualified: { bg: "bg-sky-50", text: "text-sky-600", border: "border-sky-100" },
    proposal: { bg: "bg-yellow-50", text: "text-yellow-600", border: "border-yellow-100" },
    negotiation: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-100" },
    won: { bg: "bg-green-50", text: "text-green-600", border: "border-green-100" },
    lost: { bg: "bg-red-50", text: "text-red-600", border: "border-red-100" },
    junk: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
};

// ============================================
// Customer & Contact Constants
// ============================================

export const CUSTOMER_STATUSES = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "archived", label: "Archived" },
] as const;

export const CUSTOMER_GROUPS = [
    { value: "vip", label: "VIP" },
    { value: "enterprise", label: "Enterprise" },
    { value: "startup", label: "Startup" },
] as const;

export const CURRENCIES = [
    { value: "USD", label: "USD - US Dollar" },
    { value: "EUR", label: "EUR - Euro" },
    { value: "GBP", label: "GBP - British Pound" },
    { value: "AED", label: "AED - UAE Dirham" },
    { value: "SAR", label: "SAR - Saudi Riyal" },
] as const;

export const LANGUAGES = [
    { value: "en", label: "English" },
    { value: "ar", label: "Arabic" },
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
] as const;

export const COUNTRIES = [
    { value: "AE", label: "United Arab Emirates" },
    { value: "SA", label: "Saudi Arabia" },
    { value: "US", label: "United States" },
    { value: "UK", label: "United Kingdom" },
    { value: "EG", label: "Egypt" },
] as const;
