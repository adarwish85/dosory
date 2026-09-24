/**
 * Backfill: provision `subscriptions/{orgId}` + default reference data for EXISTING tenants.
 *
 * ┌──────────────────────────────────────────────────────────────────────────────────────┐
 * │  DO NOT RUN WITHOUT AHMED'S EXPLICIT APPROVAL. This WRITES TO PRODUCTION TENANT DATA. │
 * └──────────────────────────────────────────────────────────────────────────────────────┘
 *
 * A bare run is a DRY RUN and writes nothing. Writing requires `--execute`, which is the same
 * shape scripts/audit/audit-payment-je-corrections.ts uses, for the same reason: a script that
 * mutates customer data on an accidental `npx tsx` is a loaded gun in the repo.
 *
 *     npx tsx scripts/backfill-provision.ts              # dry run, reports what it WOULD do
 *     npx tsx scripts/backfill-provision.ts --execute    # writes. Requires approval.
 *
 * WHAT IT FIXES. Tenants created before the provisioning work landed have no
 * `subscriptions/{orgId}` document, so `ensureWriteAccess` rejects every write with "No
 * subscription found" — the tenant can log in and see nothing work. It also seeds the reference
 * collections a tenant needs before it can transact (currencies, taxes, paymentModes,
 * emailTemplates), which is CLAUDE.md Phase 3.1.5. Mirrors lib/provisioning/seed-tenant-defaults.ts.
 *
 * IDEMPOTENT. Every write is guarded by an existence check, so a re-run is a no-op. That is a
 * property worth preserving if this is ever edited: the seed helpers check `.empty` before
 * writing, and the subscription is skipped when the document already exists.
 *
 * NOT VERIFIED AGAINST CURRENT PROD. This was written before the Batch A/B work and has not been
 * re-checked against the present data. Run the dry run first and read its output.
 */
import { admin, db } from "./_admin";

const FV = admin.firestore.FieldValue;

/** Writing requires an explicit flag. A bare run reports and changes nothing. */
const EXECUTE = process.argv.includes("--execute");
const TRIAL_DAYS = 14;
const TRIAL_MODULES = ["crm", "projects", "support", "invoicing", "reports", "api-access"];

async function seedSubscription(orgId: string, createdBy: string): Promise<boolean> {
    const ref = db.collection("subscriptions").doc(orgId);
    if ((await ref.get()).exists) return false;
    if (!EXECUTE) return true; // would create

    const now = FV.serverTimestamp();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    await ref.set({
        tenantId: orgId,
        planId: "plan_trial",
        planVersion: 1,
        status: "trialing",
        billingCycle: "monthly",
        startedAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEndsAt,
        addons: [],
        computedEntitlements: {
            limits: { maxUsers: -1, storageGB: -1 },
            enabledModules: TRIAL_MODULES,
            featuresByModule: {},
            computedAt: now,
        },
        createdAt: now,
        updatedAt: now,
        createdBy,
    });
    return true;
}

async function seedDefaults(orgId: string, createdBy: string): Promise<void> {
    const stamp = () => ({ orgId, createdBy, createdAt: FV.serverTimestamp(), updatedAt: FV.serverTimestamp() });

    const seedIfEmpty = async (coll: string, docs: Record<string, unknown>[]) => {
        const existing = await db.collection(coll).where("orgId", "==", orgId).limit(1).get();
        if (!existing.empty) return;
        if (!EXECUTE) {
            console.log(`      would seed ${docs.length} doc(s) into ${coll}`);
            return;
        }
        const batch = db.batch();
        for (const d of docs) batch.set(db.collection(coll).doc(), { ...d, ...stamp() });
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

    if (EXECUTE) {
        await db.doc(`organizations/${orgId}/settings/general`).set({ currency: "USD" }, { merge: true });
    }
}

async function main() {
    console.log(
        EXECUTE
            ? "*** --execute PASSED: this run WILL WRITE to production tenant data. ***\n"
            : "DRY RUN. Nothing will be written. Pass --execute to apply (requires approval).\n"
    );
    const orgs = await db.collection("organizations").get();
    console.log(`Found ${orgs.size} organizations.`);
    let provisioned = 0;
    for (const org of orgs.docs) {
        const orgId = org.id;
        const createdBy = org.data().ownerId || "system";
        const created = await seedSubscription(orgId, createdBy);
        await seedDefaults(orgId, createdBy);
        console.log(
            `  ${orgId}: subscription ${created ? (EXECUTE ? "created" : "WOULD be created") : "already existed"}`
        );
        if (created) provisioned++;
    }
    console.log(
        EXECUTE
            ? `\nDone. ${provisioned} new subscription(s) created; defaults ensured for all ${orgs.size} orgs.`
            : `\nDRY RUN COMPLETE. ${provisioned} subscription(s) WOULD be created across ${orgs.size} orgs. Nothing was written.`
    );
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
