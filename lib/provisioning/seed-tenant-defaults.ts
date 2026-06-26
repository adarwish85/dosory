import { adminDb } from "@/lib/firebase-admin";
import admin from "@/lib/firebase-admin";

const FV = admin.firestore.FieldValue;

const TRIAL_DAYS = 14;

// Module keys mirror the SA module catalog (sa-service.seedDefaultModules). A trial
// tenant is granted all of them so the (currently advisory) TenantEntitlements.canAccessModule
// gate never locks them out if it is later enforced. Not load-bearing today: the live
// write gate is ensureWriteAccess (status only) + enforceLimit (maxUsers).
const TRIAL_MODULES = ["crm", "projects", "support", "invoicing", "reports", "api-access"];

/**
 * Server-side tenant provisioning (Admin SDK). Idempotent — safe to re-run and to
 * backfill over existing tenants.
 *
 * A2: writes subscriptions/{orgId} so TenantEntitlements.ensureWriteAccess() passes
 *     (without a doc, every write path 403s "No subscription found").
 * A3: seeds the default settings a tenant needs to transact out of the box
 *     (currencies / taxes / payment-modes / email-templates + default currency).
 */
export async function provisionTenant(orgId: string, createdBy: string): Promise<void> {
    if (!orgId) throw new Error("provisionTenant: orgId is required");
    await seedSubscription(orgId, createdBy);
    await seedDefaults(orgId, createdBy);
}

async function seedSubscription(orgId: string, createdBy: string): Promise<void> {
    const ref = adminDb.collection("subscriptions").doc(orgId);
    if ((await ref.get()).exists) return; // idempotent

    const now = FV.serverTimestamp();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    // Written directly (NOT via BillingService.createOrUpdateSubscription) so it does not
    // require a *published* plan to exist — entitlements are inlined. Shape matches the
    // Subscription type (lib/types/billing.ts) and what ensureWriteAccess / checkLimit read.
    await ref.set({
        tenantId: orgId,
        planId: "plan_trial", // sentinel; entitlements inlined, no published plan needed
        planVersion: 1,
        status: "trialing", // ensureWriteAccess only blocks canceled / suspended / past_due
        billingCycle: "monthly",
        startedAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEndsAt,
        addons: [],
        computedEntitlements: {
            limits: { maxUsers: -1, storageGB: -1 }, // -1 = unlimited
            enabledModules: TRIAL_MODULES,
            featuresByModule: {},
            computedAt: now,
        },
        createdAt: now,
        updatedAt: now,
        createdBy,
    });
    console.log(`[provision] subscription created for ${orgId}`);
}

async function seedDefaults(orgId: string, createdBy: string): Promise<void> {
    const stamp = () => ({
        orgId,
        createdBy,
        createdAt: FV.serverTimestamp(),
        updatedAt: FV.serverTimestamp(),
    });

    // Seed a collection only if this tenant has no doc there yet (idempotent per-collection).
    // Every doc carries the field its hook orderBy()s on (currencies→code, the rest→name),
    // or it would not surface in the snapshot.
    const seedIfEmpty = async (coll: string, docs: Record<string, unknown>[]) => {
        const existing = await adminDb.collection(coll).where("orgId", "==", orgId).limit(1).get();
        if (!existing.empty) return;
        const batch = adminDb.batch();
        for (const d of docs) {
            batch.set(adminDb.collection(coll).doc(), { ...d, ...stamp() });
        }
        await batch.commit();
    };

    await seedIfEmpty("currencies", [
        {
            code: "USD",
            name: "US Dollar",
            symbol: "$",
            placement: "before",
            decimalSeparator: ".",
            thousandsSeparator: ",",
            isDefault: true,
        },
    ]);

    await seedIfEmpty("taxes", [{ name: "No Tax", rate: 0, isDefault: true }]);

    await seedIfEmpty("paymentModes", [
        { name: "Bank Transfer", showOnInvoice: true, isActive: true },
        { name: "Cash", showOnInvoice: true, isActive: true },
    ]);

    await seedIfEmpty("emailTemplates", [
        {
            name: "Invoice Email",
            slug: "invoice-email",
            type: "invoice",
            subject: "Invoice {invoice_number} from {company_name}",
            content: "<p>Dear {client_name}, please find your invoice attached.</p>",
            isActive: true,
        },
        {
            name: "Estimate Email",
            slug: "estimate-email",
            type: "estimate",
            subject: "Estimate {estimate_number}",
            content: "<p>Dear {client_name}, please review your estimate.</p>",
            isActive: true,
        },
    ]);

    // The running app reads the tenant's default currency from this settings doc
    // (use-organization-settings.ts:531 → organizations/{orgId}/settings/general.currency),
    // NOT the org root. Keep it aligned with the isDefault currency above.
    await adminDb.doc(`organizations/${orgId}/settings/general`).set({ currency: "USD" }, { merge: true });
    console.log(`[provision] default settings seeded for ${orgId}`);
}
