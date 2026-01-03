import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
    Plan, PlanInput, PlanStatus,
    Addon, AddonInput, AddonStatus,
    Subscription, SubscriptionInput, SubscriptionStatus,
    TenantUsage, UsageExceeded
} from "@/lib/types/billing";
import { AuditService } from "@/lib/services/audit-service";

// Collection names
const PLANS_COLL = "plans";
const ADDONS_COLL = "addons";
const SUBSCRIPTIONS_COLL = "subscriptions";
const TENANT_USAGE_COLL = "tenant_usage";

// Helper to generate slug from name
function generateSlug(name: string): string {
    return "plan_" + name.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
}

function generateAddonSlug(name: string): string {
    return "addon_" + name.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
}

export class BillingService {
    // ========================================
    // PLANS
    // ========================================

    static async getPlans(filters?: { status?: PlanStatus; q?: string }): Promise<Plan[]> {
        let query = adminDb.collection(PLANS_COLL).orderBy("ui.sortOrder", "asc");

        if (filters?.status) {
            query = query.where("status", "==", filters.status);
        }

        const snap = await query.get();
        let plans = snap.docs.map(d => ({ id: d.id, ...d.data() } as Plan));

        if (filters?.q) {
            const search = filters.q.toLowerCase();
            plans = plans.filter(p =>
                p.name.toLowerCase().includes(search) ||
                p.description?.toLowerCase().includes(search)
            );
        }

        return plans;
    }

    static async getPlan(id: string): Promise<Plan | null> {
        const doc = await adminDb.collection(PLANS_COLL).doc(id).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() } as Plan;
    }

    static async getPublishedPlan(id: string, version?: number): Promise<Plan | null> {
        if (version) {
            // Get specific version
            const query = await adminDb.collection(PLANS_COLL)
                .where("id", "==", id)
                .where("versioning.version", "==", version)
                .where("status", "==", "published")
                .limit(1)
                .get();
            if (query.empty) return null;
            return { id: query.docs[0].id, ...query.docs[0].data() } as Plan;
        }

        // Get latest published version
        const plan = await this.getPlan(id);
        if (!plan || plan.status !== "published") return null;
        return plan;
    }

    static async createPlan(input: PlanInput, actorId: string): Promise<Plan> {
        const id = generateSlug(input.name);

        // Check if plan with this ID already exists
        const existing = await this.getPlan(id);
        if (existing) {
            throw new Error(`Plan with ID ${id} already exists`);
        }

        const now = FieldValue.serverTimestamp();
        const plan: Omit<Plan, "id" | "createdAt" | "updatedAt"> & { createdAt: any; updatedAt: any } = {
            name: input.name,
            description: input.description || "",
            status: "draft",
            isFree: input.isFree ?? false,
            currency: input.currency || "USD",
            billing: {
                monthlyPrice: input.billing?.monthlyPrice ?? 0,
                annualPrice: input.billing?.annualPrice ?? 0,
                annualDiscountPercent: input.billing?.annualDiscountPercent
            },
            trial: {
                enabled: input.trial?.enabled ?? false,
                days: input.trial?.days ?? 14,
                eligibility: input.trial?.eligibility ?? "new_customers_only"
            },
            limits: {
                maxUsers: input.limits?.maxUsers ?? 5,
                storageGB: input.limits?.storageGB ?? 10
            },
            entitlements: {
                modules: input.entitlements?.modules ?? [],
                featuresByModule: input.entitlements?.featuresByModule ?? {}
            },
            ui: {
                badge: input.ui?.badge,
                sortOrder: input.ui?.sortOrder ?? 0
            },
            versioning: {
                version: 1,
                parentPlanId: undefined,
                publishedAt: null
            },
            createdAt: now,
            updatedAt: now
        };

        await adminDb.collection(PLANS_COLL).doc(id).set(plan);

        await AuditService.log({
            action: "create_plan",
            targetType: "plan",
            targetId: id,
            actorId,
            payload: { plan: { id, ...plan } }
        });

        return { id, ...plan } as unknown as Plan;
    }

    static async updatePlan(id: string, input: Partial<PlanInput>, actorId: string): Promise<void> {
        const existing = await this.getPlan(id);
        if (!existing) {
            throw new Error(`Plan ${id} not found`);
        }

        // If plan is published, only allow certain updates (or require version bump)
        if (existing.status === "published") {
            throw new Error("Cannot modify published plan. Create a new version instead.");
        }

        const updates: Record<string, any> = {
            updatedAt: FieldValue.serverTimestamp()
        };

        if (input.name !== undefined) updates.name = input.name;
        if (input.description !== undefined) updates.description = input.description;
        if (input.isFree !== undefined) updates.isFree = input.isFree;
        if (input.currency !== undefined) updates.currency = input.currency;
        if (input.billing) {
            updates.billing = { ...existing.billing, ...input.billing };
        }
        if (input.trial) {
            updates.trial = { ...existing.trial, ...input.trial };
        }
        if (input.limits) {
            updates.limits = { ...existing.limits, ...input.limits };
        }
        if (input.entitlements) {
            updates.entitlements = { ...existing.entitlements, ...input.entitlements };
        }
        if (input.ui) {
            updates.ui = { ...existing.ui, ...input.ui };
        }

        await adminDb.collection(PLANS_COLL).doc(id).update(updates);

        await AuditService.log({
            action: "update_plan",
            targetType: "plan",
            targetId: id,
            actorId,
            payload: { before: existing, updates }
        });
    }

    static async duplicatePlanAsVersion(id: string, actorId: string): Promise<Plan> {
        const existing = await this.getPlan(id);
        if (!existing) {
            throw new Error(`Plan ${id} not found`);
        }

        const newVersion = existing.versioning.version + 1;
        const newId = `${id}_v${newVersion}`;
        const now = FieldValue.serverTimestamp();

        const newPlan = {
            ...existing,
            status: "draft" as PlanStatus,
            versioning: {
                version: newVersion,
                parentPlanId: id,
                publishedAt: null
            },
            createdAt: now,
            updatedAt: now
        };

        // Remove id from the object before saving
        const { id: _, ...planData } = newPlan;

        await adminDb.collection(PLANS_COLL).doc(newId).set(planData);

        await AuditService.log({
            action: "duplicate_plan_version",
            targetType: "plan",
            targetId: newId,
            actorId,
            payload: { parentPlanId: id, newVersion }
        });

        return { id: newId, ...planData } as unknown as Plan;
    }

    static async publishPlan(id: string, actorId: string): Promise<void> {
        const existing = await this.getPlan(id);
        if (!existing) {
            throw new Error(`Plan ${id} not found`);
        }

        if (existing.status === "published") {
            throw new Error("Plan is already published");
        }

        if (existing.status === "archived") {
            throw new Error("Cannot publish archived plan");
        }

        await adminDb.collection(PLANS_COLL).doc(id).update({
            status: "published",
            "versioning.publishedAt": FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });

        await AuditService.log({
            action: "publish_plan",
            targetType: "plan",
            targetId: id,
            actorId,
            payload: { previousStatus: existing.status }
        });
    }

    static async archivePlan(id: string, actorId: string): Promise<void> {
        const existing = await this.getPlan(id);
        if (!existing) {
            throw new Error(`Plan ${id} not found`);
        }

        // Check if any active subscriptions use this plan
        const activeSubscriptions = await adminDb.collection(SUBSCRIPTIONS_COLL)
            .where("planId", "==", id)
            .where("status", "in", ["trialing", "active"])
            .limit(1)
            .get();

        if (!activeSubscriptions.empty) {
            throw new Error("Cannot archive plan with active subscriptions");
        }

        await adminDb.collection(PLANS_COLL).doc(id).update({
            status: "archived",
            updatedAt: FieldValue.serverTimestamp()
        });

        await AuditService.log({
            action: "archive_plan",
            targetType: "plan",
            targetId: id,
            actorId,
            payload: { previousStatus: existing.status }
        });
    }

    // ========================================
    // ADDONS
    // ========================================

    static async getAddons(filters?: { status?: AddonStatus }): Promise<Addon[]> {
        let query = adminDb.collection(ADDONS_COLL).orderBy("sortOrder", "asc");

        if (filters?.status) {
            query = query.where("status", "==", filters.status);
        }

        const snap = await query.get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Addon));
    }

    static async getAddon(id: string): Promise<Addon | null> {
        const doc = await adminDb.collection(ADDONS_COLL).doc(id).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() } as Addon;
    }

    static async createAddon(input: AddonInput, actorId: string): Promise<Addon> {
        const id = generateAddonSlug(input.name);

        const existing = await this.getAddon(id);
        if (existing) {
            throw new Error(`Addon with ID ${id} already exists`);
        }

        const now = FieldValue.serverTimestamp();
        const addon = {
            name: input.name,
            description: input.description || "",
            status: input.status || "active" as AddonStatus,
            type: input.type,
            pricing: {
                monthlyPrice: input.pricing?.monthlyPrice ?? 0,
                annualPrice: input.pricing?.annualPrice ?? 0,
                currency: input.pricing?.currency || "USD"
            },
            effect: {
                addUsers: input.effect?.addUsers,
                addStorageGB: input.effect?.addStorageGB,
                enableModules: input.effect?.enableModules ?? [],
                enableFeaturesByModule: input.effect?.enableFeaturesByModule ?? {}
            },
            constraints: {
                requiresPlanIds: input.constraints?.requiresPlanIds ?? [],
                incompatibleAddonIds: input.constraints?.incompatibleAddonIds ?? []
            },
            sortOrder: input.sortOrder ?? 0,
            createdAt: now,
            updatedAt: now
        };

        await adminDb.collection(ADDONS_COLL).doc(id).set(addon);

        await AuditService.log({
            action: "create_addon",
            targetType: "settings",
            targetId: id,
            actorId,
            payload: { addon: { id, ...addon } }
        });

        return { id, ...addon } as unknown as Addon;
    }

    static async updateAddon(id: string, input: Partial<AddonInput>, actorId: string): Promise<void> {
        const existing = await this.getAddon(id);
        if (!existing) {
            throw new Error(`Addon ${id} not found`);
        }

        const updates: Record<string, any> = {
            updatedAt: FieldValue.serverTimestamp()
        };

        if (input.name !== undefined) updates.name = input.name;
        if (input.description !== undefined) updates.description = input.description;
        if (input.status !== undefined) updates.status = input.status;
        if (input.type !== undefined) updates.type = input.type;
        if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;
        if (input.pricing) {
            updates.pricing = { ...existing.pricing, ...input.pricing };
        }
        if (input.effect) {
            updates.effect = { ...existing.effect, ...input.effect };
        }
        if (input.constraints) {
            updates.constraints = { ...existing.constraints, ...input.constraints };
        }

        await adminDb.collection(ADDONS_COLL).doc(id).update(updates);

        await AuditService.log({
            action: "update_addon",
            targetType: "settings",
            targetId: id,
            actorId,
            payload: { before: existing, updates }
        });
    }

    static async deactivateAddon(id: string, actorId: string): Promise<void> {
        const existing = await this.getAddon(id);
        if (!existing) {
            throw new Error(`Addon ${id} not found`);
        }

        await adminDb.collection(ADDONS_COLL).doc(id).update({
            status: "inactive",
            updatedAt: FieldValue.serverTimestamp()
        });

        await AuditService.log({
            action: "deactivate_addon",
            targetType: "settings",
            targetId: id,
            actorId,
            payload: { previousStatus: existing.status }
        });
    }

    // ========================================
    // SUBSCRIPTIONS
    // ========================================

    static async getSubscriptions(filters?: {
        status?: SubscriptionStatus;
        planId?: string;
        q?: string;
    }): Promise<Subscription[]> {
        let query: FirebaseFirestore.Query = adminDb.collection(SUBSCRIPTIONS_COLL);

        if (filters?.status) {
            query = query.where("status", "==", filters.status);
        }

        if (filters?.planId) {
            query = query.where("planId", "==", filters.planId);
        }

        const snap = await query.get();
        return snap.docs.map(d => ({ tenantId: d.id, ...d.data() } as Subscription));
    }

    static async getSubscription(tenantId: string): Promise<Subscription | null> {
        const doc = await adminDb.collection(SUBSCRIPTIONS_COLL).doc(tenantId).get();
        if (!doc.exists) return null;
        return { tenantId: doc.id, ...doc.data() } as Subscription;
    }

    static async createOrUpdateSubscription(
        tenantId: string,
        input: SubscriptionInput,
        actorId: string
    ): Promise<Subscription> {
        const plan = await this.getPublishedPlan(input.planId);
        if (!plan) {
            throw new Error(`Published plan ${input.planId} not found`);
        }

        const existing = await this.getSubscription(tenantId);
        const now = FieldValue.serverTimestamp();

        if (existing) {
            // Update existing subscription
            const updates: Record<string, any> = {
                planId: input.planId,
                planVersion: plan.versioning.version,
                updatedAt: now
            };

            if (input.billingCycle) updates.billingCycle = input.billingCycle;
            if (input.status) updates.status = input.status;

            await adminDb.collection(SUBSCRIPTIONS_COLL).doc(tenantId).update(updates);

            await AuditService.log({
                action: "update_subscription",
                targetType: "tenant",
                targetId: tenantId,
                actorId,
                payload: { before: existing, updates }
            });

            return { ...existing, ...updates } as Subscription;
        } else {
            // Create new subscription
            const periodEnd = new Date();
            if (input.billingCycle === "annual") {
                periodEnd.setFullYear(periodEnd.getFullYear() + 1);
            } else {
                periodEnd.setMonth(periodEnd.getMonth() + 1);
            }

            const subscription = {
                planId: input.planId,
                planVersion: plan.versioning.version,
                status: input.status || "active" as SubscriptionStatus,
                billingCycle: input.billingCycle || "monthly",
                startedAt: now,
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
                trialEndsAt: null,
                addons: [],
                computedEntitlements: {
                    limits: plan.limits,
                    enabledModules: plan.entitlements.modules,
                    featuresByModule: plan.entitlements.featuresByModule,
                    computedAt: now
                },
                createdAt: now,
                updatedAt: now
            };

            await adminDb.collection(SUBSCRIPTIONS_COLL).doc(tenantId).set(subscription);

            await AuditService.log({
                action: "create_subscription",
                targetType: "tenant",
                targetId: tenantId,
                actorId,
                payload: { subscription: { tenantId, ...subscription } }
            });

            return { tenantId, ...subscription } as unknown as Subscription;
        }
    }

    static async startTrial(tenantId: string, days: number, actorId: string): Promise<void> {
        const subscription = await this.getSubscription(tenantId);
        if (!subscription) {
            throw new Error(`Subscription for tenant ${tenantId} not found`);
        }

        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + days);

        await adminDb.collection(SUBSCRIPTIONS_COLL).doc(tenantId).update({
            status: "trialing",
            trialEndsAt,
            updatedAt: FieldValue.serverTimestamp()
        });

        await AuditService.log({
            action: "start_trial",
            targetType: "tenant",
            targetId: tenantId,
            actorId,
            payload: { days, trialEndsAt }
        });
    }

    static async addAddonToSubscription(
        tenantId: string,
        addonId: string,
        quantity: number = 1,
        actorId: string
    ): Promise<void> {
        const subscription = await this.getSubscription(tenantId);
        if (!subscription) {
            throw new Error(`Subscription for tenant ${tenantId} not found`);
        }

        const addon = await this.getAddon(addonId);
        if (!addon || addon.status !== "active") {
            throw new Error(`Active addon ${addonId} not found`);
        }

        // Check constraints
        if (addon.constraints.requiresPlanIds?.length) {
            if (!addon.constraints.requiresPlanIds.includes(subscription.planId)) {
                throw new Error(`Addon requires one of these plans: ${addon.constraints.requiresPlanIds.join(", ")}`);
            }
        }

        // Check incompatibility
        const existingAddonIds = subscription.addons.map(a => a.addonId);
        for (const incompatible of addon.constraints.incompatibleAddonIds || []) {
            if (existingAddonIds.includes(incompatible)) {
                throw new Error(`Addon is incompatible with addon ${incompatible}`);
            }
        }

        const newAddon = {
            addonId,
            quantity,
            addedAt: FieldValue.serverTimestamp()
        };

        await adminDb.collection(SUBSCRIPTIONS_COLL).doc(tenantId).update({
            addons: FieldValue.arrayUnion(newAddon),
            updatedAt: FieldValue.serverTimestamp()
        });

        await AuditService.log({
            action: "add_addon_to_subscription",
            targetType: "tenant",
            targetId: tenantId,
            actorId,
            payload: { addonId, quantity }
        });
    }

    static async removeAddonFromSubscription(
        tenantId: string,
        addonId: string,
        actorId: string
    ): Promise<void> {
        const subscription = await this.getSubscription(tenantId);
        if (!subscription) {
            throw new Error(`Subscription for tenant ${tenantId} not found`);
        }

        const updatedAddons = subscription.addons.filter(a => a.addonId !== addonId);

        await adminDb.collection(SUBSCRIPTIONS_COLL).doc(tenantId).update({
            addons: updatedAddons,
            updatedAt: FieldValue.serverTimestamp()
        });

        await AuditService.log({
            action: "remove_addon_from_subscription",
            targetType: "tenant",
            targetId: tenantId,
            actorId,
            payload: { addonId }
        });
    }

    // ========================================
    // USAGE TRACKING
    // ========================================

    static async getTenantUsage(tenantId: string): Promise<TenantUsage | null> {
        const doc = await adminDb.collection(TENANT_USAGE_COLL).doc(tenantId).get();
        if (!doc.exists) return null;
        return { tenantId: doc.id, ...doc.data() } as TenantUsage;
    }

    static async updateTenantUsage(
        tenantId: string,
        usage: Partial<Pick<TenantUsage, "usersCount" | "storageUsedGB">>
    ): Promise<void> {
        await adminDb.collection(TENANT_USAGE_COLL).doc(tenantId).set({
            ...usage,
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
    }

    static async getTenantsExceedingLimits(): Promise<UsageExceeded[]> {
        const exceeded: UsageExceeded[] = [];

        // Get all subscriptions with their computed limits
        const subscriptions = await this.getSubscriptions({ status: "active" });

        for (const sub of subscriptions) {
            const usage = await this.getTenantUsage(sub.tenantId);
            if (!usage) continue;

            const limits = sub.computedEntitlements?.limits;
            if (!limits) continue;

            const userExceeded = limits.maxUsers !== -1 && usage.usersCount > limits.maxUsers;
            const storageExceeded = limits.storageGB !== -1 && usage.storageUsedGB > limits.storageGB;

            if (userExceeded || storageExceeded) {
                // Get tenant name
                const tenantDoc = await adminDb.collection("organizations").doc(sub.tenantId).get();
                const tenantName = tenantDoc.data()?.name || sub.tenantId;

                const exceededInfo: UsageExceeded = {
                    tenantId: sub.tenantId,
                    tenantName,
                    exceeded: {},
                    severity: "warning"
                };

                if (userExceeded) {
                    exceededInfo.exceeded.users = {
                        limit: limits.maxUsers,
                        current: usage.usersCount
                    };
                    if (usage.usersCount > limits.maxUsers * 1.2) {
                        exceededInfo.severity = "critical";
                    }
                }

                if (storageExceeded) {
                    exceededInfo.exceeded.storage = {
                        limit: limits.storageGB,
                        current: usage.storageUsedGB
                    };
                    if (usage.storageUsedGB > limits.storageGB * 1.2) {
                        exceededInfo.severity = "critical";
                    }
                }

                exceeded.push(exceededInfo);
            }
        }

        // Sort by severity (critical first)
        exceeded.sort((a, b) => {
            if (a.severity === "critical" && b.severity !== "critical") return -1;
            if (a.severity !== "critical" && b.severity === "critical") return 1;
            return 0;
        });

        return exceeded;
    }
}
