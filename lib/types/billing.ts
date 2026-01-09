import { Timestamp } from "firebase/firestore";

// ============================================
// PLANS
// ============================================

export type PlanStatus = "draft" | "published" | "archived";
export type TrialEligibility = "new_customers_only" | "all";

export interface PlanBilling {
    monthlyPrice: number;      // In cents (e.g., 4900 = $49.00)
    annualPrice: number;       // In cents
    annualDiscountPercent?: number;
}

export interface PlanTrial {
    enabled: boolean;
    days: number;
    eligibility: TrialEligibility;
}

export interface PlanLimits {
    maxUsers: number;          // -1 = unlimited
    storageGB: number;         // -1 = unlimited
    // Future: additionalCaps?: Record<string, number>;
}

export interface PlanEntitlements {
    modules: string[];         // Array of moduleKeys enabled
    featuresByModule: Record<string, Record<string, any>>;
}

export interface PlanUI {
    badge?: string;            // e.g., "Most Popular", "Best Value"
    sortOrder: number;
}

export interface PlanVersioning {
    version: number;
    parentPlanId?: string;     // If cloned from prior version
    publishedAt?: Timestamp | null;
}

export interface Plan {
    id: string;                // Deterministic slug: plan_starter, plan_pro
    name: string;
    description: string;
    status: PlanStatus;
    isFree: boolean;
    currency: string;          // ISO currency code (USD, EUR, etc.)
    billing: PlanBilling;
    trial: PlanTrial;
    limits: PlanLimits;
    entitlements: PlanEntitlements;
    ui: PlanUI;
    versioning: PlanVersioning;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// Input type for creating/updating plans
export interface PlanInput {
    name: string;
    description?: string;
    status?: PlanStatus;
    isFree?: boolean;
    currency?: string;
    billing?: Partial<PlanBilling>;
    trial?: Partial<PlanTrial>;
    limits?: Partial<PlanLimits>;
    entitlements?: Partial<PlanEntitlements>;
    ui?: Partial<PlanUI>;
}

// ============================================
// ADDONS
// ============================================

export type AddonStatus = "active" | "inactive";
export type AddonType = "extra_users" | "extra_storage" | "feature_pack" | "module_pack";

export interface AddonPricing {
    monthlyPrice: number;
    annualPrice: number;
    currency: string;
}

export interface AddonEffect {
    addUsers?: number;
    addStorageGB?: number;
    enableModules?: string[];
    enableFeaturesByModule?: Record<string, Record<string, any>>;
}

export interface AddonConstraints {
    requiresPlanIds?: string[];
    incompatibleAddonIds?: string[];
}

export interface Addon {
    id: string;
    name: string;
    description: string;
    status: AddonStatus;
    type: AddonType;
    pricing: AddonPricing;
    effect: AddonEffect;
    constraints: AddonConstraints;
    sortOrder: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface AddonInput {
    name: string;
    description?: string;
    status?: AddonStatus;
    type: AddonType;
    pricing?: Partial<AddonPricing>;
    effect?: Partial<AddonEffect>;
    constraints?: Partial<AddonConstraints>;
    sortOrder?: number;
}

// ============================================
// SUBSCRIPTIONS
// ============================================

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "suspended" | "canceled";
export type BillingCycle = "monthly" | "annual";

export interface SubscriptionAddon {
    addonId: string;
    quantity?: number;
    addedAt: Timestamp;
}

export interface ComputedEntitlements {
    limits: {
        maxUsers: number;
        storageGB: number;
    };
    enabledModules: string[];
    featuresByModule: Record<string, Record<string, any>>;
    computedAt: Timestamp;
}

export interface Subscription {
    tenantId: string;
    planId: string;
    planVersion: number;
    status: SubscriptionStatus;
    billingCycle: BillingCycle;
    startedAt: Timestamp;
    currentPeriodStart: Timestamp;
    currentPeriodEnd: Timestamp;
    trialEndsAt?: Timestamp | null;
    addons: SubscriptionAddon[];
    computedEntitlements: ComputedEntitlements;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface SubscriptionInput {
    planId: string;
    billingCycle?: BillingCycle;
    status?: SubscriptionStatus;
}

// ============================================
// USAGE TRACKING
// ============================================

export interface TenantUsage {
    tenantId: string;
    usersCount: number;
    storageUsedGB: number;
    updatedAt: Timestamp;
}

export interface UsageExceeded {
    tenantId: string;
    tenantName: string;
    exceeded: {
        users?: { limit: number; current: number };
        storage?: { limit: number; current: number };
    };
    severity: "warning" | "critical";  // warning = 80-100%, critical = >100%
}

// ============================================
// ENTITLEMENT CHECK RESULTS
// ============================================

export interface LimitCheck {
    allowed: number;
    current: number;
    exceeded: boolean;
    remaining: number;
}

export interface ModuleAccess {
    hasAccess: boolean;
    reason?: string;
}
