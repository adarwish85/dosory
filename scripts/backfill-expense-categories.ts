/**
 * Backfill: seed default expense categories for EXISTING orgs that have none.
 *
 * FAMILY D (#8, client QA 2026-07-28): `expenseCategories` was never part of provisioning's
 * seedIfEmpty set, so EVERY tenant — new and old — had zero categories. The Category select on
 * /dashboard/expenses/new is required, so with no options no expense could ever be created.
 * Provisioning now seeds them for new tenants (lib/provisioning/seed-tenant-defaults.ts);
 * this script covers everyone who already exists.
 *
 * ADDITIVE ONLY — never deletes or modifies an existing category. An org with ≥1 category is
 * skipped entirely (same rule as seedIfEmpty), so a tenant's own taxonomy is never touched.
 * Doc IDs are deterministic (`{orgId}__exp-general`) so a re-run converges instead of duplicating.
 *
 * Run (dry-run, prints the table, writes nothing):
 *   npx tsx scripts/backfill-expense-categories.ts
 * Execute:
 *   npx tsx scripts/backfill-expense-categories.ts --execute
 */
import * as fs from "fs";
import * as path from "path";
import { admin, db, app } from "./_admin";

const EXECUTE = process.argv.includes("--execute");
const EXPECTED_PROJECT = "goalo-6a269";

// Keep in lockstep with lib/provisioning/seed-tenant-defaults.ts.
const DEFAULT_CATEGORIES = [
    { seedId: "exp-general", name: "General", description: "Uncategorized business expenses" },
    { seedId: "exp-travel", name: "Travel", description: "Flights, transport, accommodation" },
    { seedId: "exp-office", name: "Office Supplies", description: "Stationery, equipment, consumables" },
    { seedId: "exp-software", name: "Software & Subscriptions", description: "SaaS tools and licences" },
    { seedId: "exp-marketing", name: "Marketing", description: "Advertising and promotion" },
    { seedId: "exp-utilities", name: "Utilities", description: "Internet, phone, electricity" },
];

async function main() {
    const projectId =
        (app.options as { projectId?: string }).projectId ||
        (app.options.credential as unknown as { projectId?: string })?.projectId;
    if (projectId && projectId !== EXPECTED_PROJECT) {
        throw new Error(`Refusing to run: connected to project "${projectId}", expected "${EXPECTED_PROJECT}".`);
    }
    console.log(`Project: ${projectId} · mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}\n`);

    const orgsSnap = await db.collection("organizations").get();
    console.log(`Read ${orgsSnap.size} organizations.\n`);

    const plan: { orgId: string; name: string; existing: number }[] = [];
    const skipped: { orgId: string; existing: number }[] = [];

    for (const org of orgsSnap.docs) {
        const existing = await db.collection("expenseCategories").where("orgId", "==", org.id).limit(1).get();
        if (!existing.empty) {
            const count = (await db.collection("expenseCategories").where("orgId", "==", org.id).get()).size;
            skipped.push({ orgId: org.id, existing: count });
            continue;
        }
        plan.push({ orgId: org.id, name: org.data().name || "(unnamed)", existing: 0 });
    }

    console.log("=== BACKFILL PLAN (orgs with ZERO expense categories) ===");
    for (const p of plan) console.log(`  SEED ${DEFAULT_CATEGORIES.length} categories → ${p.orgId}  (${p.name})`);
    if (plan.length === 0) console.log("  (none — every org already has categories)");
    console.log(`\nTo seed: ${plan.length} org(s) · already-has-categories (untouched): ${skipped.length}`);
    for (const s of skipped)
        console.log(`  SKIP ${s.orgId} — ${s.existing} existing categor${s.existing === 1 ? "y" : "ies"}`);

    if (!EXECUTE) {
        console.log("\nDRY-RUN only. Re-run with --execute to apply.");
        return;
    }
    if (plan.length === 0) {
        console.log("\nNothing to execute.");
        return;
    }

    // Backup: record exactly which orgs were touched and with what (nothing is overwritten,
    // but keep the audit trail consistent with the other one-off scripts).
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fs.mkdirSync("backups", { recursive: true });
    const backupPath = path.join("backups", `expense-categories-backfill-${stamp}.json`);
    fs.writeFileSync(
        backupPath,
        JSON.stringify({ seededOrgs: plan, categories: DEFAULT_CATEGORIES, skipped }, null, 2)
    );
    console.log(`\nAudit trail → ${path.relative(process.cwd(), backupPath)}`);

    const FV = admin.firestore.FieldValue;
    let seeded = 0;
    for (const p of plan) {
        const batch = db.batch();
        for (const c of DEFAULT_CATEGORIES) {
            batch.set(db.collection("expenseCategories").doc(`${p.orgId}__${c.seedId}`), {
                orgId: p.orgId,
                name: c.name,
                description: c.description,
                createdBy: "backfill-script",
                createdAt: FV.serverTimestamp(),
                updatedAt: FV.serverTimestamp(),
            });
        }
        await batch.commit();
        seeded++;
        console.log(`  seeded ${p.orgId}`);
    }
    console.log(`\nEXECUTED: seeded ${DEFAULT_CATEGORIES.length} categories into ${seeded} org(s).`);
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e.message || e);
        process.exit(1);
    });
