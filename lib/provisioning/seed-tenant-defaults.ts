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
    //
    // CONCURRENCY (R1, 2026-07-28 review): the empty-check is not transactional, and two
    // provision calls CAN overlap (signup retry racing a still-running handler; two dashboard
    // tabs healing at once). Deterministic org-scoped doc IDs make overlapping writers
    // converge on the SAME docs (last write wins, identical content) instead of minting
    // duplicates via auto-IDs. Existing tenants keep their auto-ID docs — the empty-check
    // still skips seeded tenants, so IDs only apply to fresh seeding.
    const seedIfEmpty = async (coll: string, docs: Array<{ __seedId: string } & Record<string, unknown>>) => {
        const existing = await adminDb.collection(coll).where("orgId", "==", orgId).limit(1).get();
        if (!existing.empty) return;
        const batch = adminDb.batch();
        for (const { __seedId, ...d } of docs) {
            batch.set(adminDb.collection(coll).doc(`${orgId}__${__seedId}`), { ...d, ...stamp() });
        }
        await batch.commit();
    };

    await seedIfEmpty("currencies", [
        {
            __seedId: "cur-usd",
            code: "USD",
            name: "US Dollar",
            symbol: "$",
            placement: "before",
            decimalSeparator: ".",
            thousandsSeparator: ",",
            isDefault: true,
        },
    ]);

    await seedIfEmpty("taxes", [{ __seedId: "tax-none", name: "No Tax", rate: 0, isDefault: true }]);

    await seedIfEmpty("paymentModes", [
        { __seedId: "pm-bank-transfer", name: "Bank Transfer", showOnInvoice: true, isActive: true },
        { __seedId: "pm-cash", name: "Cash", showOnInvoice: true, isActive: true },
    ]);

    // FAMILY D (#8): expense categories were never seeded, so the REQUIRED Category select on
    // /dashboard/expenses/new had zero options for every tenant — expenses could not be created
    // at all. Same deterministic-ID pattern as the other seeds (concurrency-safe).
    await seedIfEmpty("expenseCategories", [
        { __seedId: "exp-general", name: "General", description: "Uncategorized business expenses" },
        { __seedId: "exp-travel", name: "Travel", description: "Flights, transport, accommodation" },
        { __seedId: "exp-office", name: "Office Supplies", description: "Stationery, equipment, consumables" },
        { __seedId: "exp-software", name: "Software & Subscriptions", description: "SaaS tools and licences" },
        { __seedId: "exp-marketing", name: "Marketing", description: "Advertising and promotion" },
        { __seedId: "exp-utilities", name: "Utilities", description: "Internet, phone, electricity" },
    ]);

    // §7 decision 5 (2026-08-09): `departments` and `job_titles` are BOTH required to create
    // an employee — the HR employee form's selects are sourced from them — and neither was in
    // the seed set nor backfilled, so no tenant could add its first employee. Same Sweep D
    // class as expenseCategories, same deterministic-ID fix.
    // Field names mirror what useHRDepartments/useJobTitles actually write and query:
    // both use `name` (each hook does orderBy("name")), carry status:"active", and
    // departments carry employeeCount. A seed shaped differently would sort or filter out.
    await seedIfEmpty("departments", [
        {
            __seedId: "dept-general",
            name: "General",
            description: "Default department",
            status: "active",
            employeeCount: 0,
        },
        {
            __seedId: "dept-engineering",
            name: "Engineering",
            description: "Product and engineering",
            status: "active",
            employeeCount: 0,
        },
        {
            __seedId: "dept-sales",
            name: "Sales",
            description: "Sales and business development",
            status: "active",
            employeeCount: 0,
        },
        {
            __seedId: "dept-support",
            name: "Support",
            description: "Customer support",
            status: "active",
            employeeCount: 0,
        },
        {
            __seedId: "dept-operations",
            name: "Operations",
            description: "Operations and admin",
            status: "active",
            employeeCount: 0,
        },
    ]);

    await seedIfEmpty("job_titles", [
        { __seedId: "jt-manager", name: "Manager", description: "Team or department manager", status: "active" },
        { __seedId: "jt-team-lead", name: "Team Lead", description: "Leads a working group", status: "active" },
        { __seedId: "jt-specialist", name: "Specialist", description: "Individual contributor", status: "active" },
        { __seedId: "jt-associate", name: "Associate", description: "Junior individual contributor", status: "active" },
    ]);

    await seedIfEmpty("emailTemplates", [
        {
            __seedId: "tpl-invoice-email",
            name: "Invoice Email",
            slug: "invoice-email",
            type: "invoice",
            subject: "Invoice {invoice_number} from {company_name}",
            content: "<p>Dear {client_name}, please find your invoice attached.</p>",
            isActive: true,
        },
        {
            __seedId: "tpl-estimate-email",
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
