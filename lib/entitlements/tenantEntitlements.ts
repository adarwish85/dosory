import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { BillingService } from "@/lib/services/billing-service";
import {
    ComputedEntitlements,
    LimitCheck,
    ModuleAccess
} from "@/lib/types/billing";

const SUBSCRIPTIONS_COLL = "subscriptions";

export class TenantEntitlements {
    /**
     * Core entitlement resolution function
     * 
     * 1. Loads subscription
     * 2. Loads published plan version
     * 3. Loads and applies addon effects
     * 4. Computes final entitlements
     * 5. Writes snapshot to subscription
     * 6. Returns final entitlements
     */
    static async resolveTenantEntitlements(tenantId: string): Promise<ComputedEntitlements | null> {
        // 1. Get subscription
        const subscription = await BillingService.getSubscription(tenantId);
        if (!subscription) {
            console.warn(`No subscription found for tenant ${tenantId}`);
            return null;
        }

        // 2. Get the plan
        const plan = await BillingService.getPublishedPlan(
            subscription.planId,
            subscription.planVersion
        );

        if (!plan) {
            console.error(`Published plan ${subscription.planId} v${subscription.planVersion} not found`);
            return null;
        }

        // 3. Start with base plan entitlements
        const limits = { ...plan.limits };
        const enabledModules = new Set(plan.entitlements.modules);
        const featuresByModule: Record<string, Record<string, any>> =
            JSON.parse(JSON.stringify(plan.entitlements.featuresByModule || {}));

        // 4. Apply addon effects
        for (const subAddon of subscription.addons) {
            const addon = await BillingService.getAddon(subAddon.addonId);
            if (!addon || addon.status !== "active") continue;

            const quantity = subAddon.quantity || 1;

            // Add users
            if (addon.effect.addUsers && limits.maxUsers !== -1) {
                limits.maxUsers += addon.effect.addUsers * quantity;
            }

            // Add storage
            if (addon.effect.addStorageGB && limits.storageGB !== -1) {
                limits.storageGB += addon.effect.addStorageGB * quantity;
            }

            // Enable modules
            if (addon.effect.enableModules) {
                for (const moduleKey of addon.effect.enableModules) {
                    enabledModules.add(moduleKey);
                }
            }

            // Enable/override features
            if (addon.effect.enableFeaturesByModule) {
                for (const [moduleKey, features] of Object.entries(addon.effect.enableFeaturesByModule)) {
                    if (!featuresByModule[moduleKey]) {
                        featuresByModule[moduleKey] = {};
                    }
                    for (const [featureKey, value] of Object.entries(features)) {
                        // For numeric features, take the higher value
                        const currentValue = featuresByModule[moduleKey][featureKey];
                        if (typeof value === "number" && typeof currentValue === "number") {
                            featuresByModule[moduleKey][featureKey] = Math.max(currentValue, value);
                        } else {
                            // For boolean/string features, addon overrides
                            featuresByModule[moduleKey][featureKey] = value;
                        }
                    }
                }
            }
        }

        // 5. Build computed entitlements
        const computed: ComputedEntitlements = {
            limits,
            enabledModules: Array.from(enabledModules),
            featuresByModule,
            computedAt: FieldValue.serverTimestamp() as any
        };

        // 6. Write snapshot to subscription
        try {
            await adminDb.collection(SUBSCRIPTIONS_COLL).doc(tenantId).update({
                computedEntitlements: computed,
                updatedAt: FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error(`Failed to update entitlements snapshot for ${tenantId}:`, error);
        }

        return computed;
    }

    /**
     * Check if a tenant can access a specific module
     */
    static async canAccessModule(tenantId: string, moduleKey: string): Promise<ModuleAccess> {
        const subscription = await BillingService.getSubscription(tenantId);

        if (!subscription) {
            return { hasAccess: false, reason: "No active subscription" };
        }

        // Status checks
        if (subscription.status === "canceled" || subscription.status === "suspended") {
            return { hasAccess: false, reason: `Subscription is ${subscription.status}` };
        }

        // For "past_due", we might allow read-only, but usually module access is binary.
        // Assuming strict for now unless read-only logic is handled higher up.
        // If "past_due", let's allow access for now but enforcement points will block writes.

        let entitlements = subscription.computedEntitlements;

        // If no snapshot or it's very old, recompute? (Optional optimization)
        if (!entitlements) {
            // Entitlements not calculated yet, try to resolve
            entitlements = await this.resolveTenantEntitlements(tenantId) as ComputedEntitlements;
            if (!entitlements) {
                return { hasAccess: false, reason: "Failed to resolve entitlements" };
            }
        }

        if (!entitlements.enabledModules.includes(moduleKey)) {
            return { hasAccess: false, reason: "MODULE_NOT_IN_PLAN" }; // Using UPPERCASE as per requirements hint
        }

        return { hasAccess: true };
    }

    /**
     * Get a specific feature value for a tenant's module
     */
    static async getFeature(
        tenantId: string,
        moduleKey: string,
        featureKey: string
    ): Promise<any> {
        const subscription = await BillingService.getSubscription(tenantId);
        if (!subscription) return undefined;

        let entitlements = subscription.computedEntitlements;
        if (!entitlements) {
            entitlements = await this.resolveTenantEntitlements(tenantId) as ComputedEntitlements;
        }
        if (!entitlements) return undefined;

        const moduleFeatures = entitlements.featuresByModule[moduleKey];
        if (!moduleFeatures) return undefined;

        return moduleFeatures[featureKey];
    }

    /**
     * Check a limit (maxUsers or storageGB)
     * Returns current usage, allowed limit, and whether exceeded
     */
    static async checkLimit(
        tenantId: string,
        limitType: "maxUsers" | "storageGB"
    ): Promise<LimitCheck> {
        const subscription = await BillingService.getSubscription(tenantId);
        const usage = await BillingService.getTenantUsage(tenantId);

        if (!subscription) {
            return { allowed: 0, current: 0, exceeded: true, remaining: 0 };
        }

        let entitlements = subscription.computedEntitlements;
        if (!entitlements) {
            entitlements = await this.resolveTenantEntitlements(tenantId) as ComputedEntitlements;
        }

        if (!entitlements) {
            // Default to strict if fails
            return { allowed: 0, current: 0, exceeded: true, remaining: 0 };
        }

        const limits = entitlements.limits;
        const allowed = limits[limitType];

        let current = 0;
        if (limitType === "maxUsers") {
            current = usage?.usersCount || 0;
        } else if (limitType === "storageGB") {
            current = usage?.storageUsedGB || 0;
        }

        // -1 means unlimited
        if (allowed === -1) {
            return { allowed: -1, current, exceeded: false, remaining: -1 };
        }

        const exceeded = current >= allowed;
        const remaining = Math.max(0, allowed - current);

        return { allowed, current, exceeded, remaining };
    }

    /**
     * Ensure tenant has write access (not suspended, canceled, or past_due)
     */
    static async ensureWriteAccess(tenantId: string): Promise<void> {
        const subscription = await BillingService.getSubscription(tenantId);
        if (!subscription) {
            throw new Error("No subscription found");
        }

        const status = subscription.status;
        if (status === "canceled" || status === "suspended" || status === "past_due") {
            throw new Error(`ACTION_BLOCKED: Subscription is ${status}`);
        }
    }

    /**
     * Enforce a limit before allowing an action
     * Throws an error if limit would be exceeded
     */
    static async enforceLimit(
        tenantId: string,
        limitType: "maxUsers" | "storageGB",
        increment: number = 1
    ): Promise<void> {
        // First ensure they have write access
        await this.ensureWriteAccess(tenantId);

        const check = await this.checkLimit(tenantId, limitType);

        if (check.allowed === -1) {
            // Unlimited
            return;
        }

        if (check.current + increment > check.allowed) {
            const limitName = limitType === "maxUsers" ? "users" : "storage";
            // Throwing a standardized error object or message could be better, 
            // but message works for now to be caught by API handlers.
            throw new Error(
                `LIMIT_EXCEEDED: ${limitType}`
            );
        }
    }
}
