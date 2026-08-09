/**
 * Backfill `departments` + `job_titles` for orgs that have none.
 *
 * §7 decision 5. Both are required to create an employee (the HR employee form sources its
 * selects from them) and neither was in the provisioning seed set, so no existing tenant
 * could add its first employee. seed-tenant-defaults.ts now covers NEW tenants; this covers
 * everyone who already exists.
 *
 * ADDITIVE ONLY. An org with >=1 document in a collection is skipped entirely, so a tenant's
 * own taxonomy is never touched. Deterministic ids (`{orgId}__{seedId}`) mirror the
 * provisioning seed exactly, so a re-run converges instead of duplicating.
 *
 *   npx tsx scripts/audit/backfill-hr-reference-data.ts             # dry-run table
 *   npx tsx scripts/audit/backfill-hr-reference-data.ts --execute
 */
import * as fs from "fs";
import * as path from "path";
import { admin, db } from "../_admin";

const EXECUTE = process.argv.includes("--execute");

const DEPARTMENTS = [
    { seedId: "dept-general", name: "General", description: "Default department" },
    { seedId: "dept-engineering", name: "Engineering", description: "Product and engineering" },
    { seedId: "dept-sales", name: "Sales", description: "Sales and business development" },
    { seedId: "dept-support", name: "Support", description: "Customer support" },
    { seedId: "dept-operations", name: "Operations", description: "Operations and admin" },
];
const JOB_TITLES = [
    { seedId: "jt-manager", name: "Manager", description: "Team or department manager" },
    { seedId: "jt-team-lead", name: "Team Lead", description: "Leads a working group" },
    { seedId: "jt-specialist", name: "Specialist", description: "Individual contributor" },
    { seedId: "jt-associate", name: "Associate", description: "Junior individual contributor" },
];

async function main() {
    const projectId = (admin.app().options.credential as { projectId?: string })?.projectId;
    if (projectId && projectId !== "goalo-6a269") throw new Error(`wrong project: ${projectId}`);
    console.log(`project: ${projectId} · mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}\n`);

    const orgs = await db.collection("organizations").get();
    const plan: { orgId: string; name: string; needsDepts: boolean; needsTitles: boolean }[] = [];

    for (const o of orgs.docs) {
        const [d, j] = await Promise.all([
            db.collection("departments").where("orgId", "==", o.id).limit(1).get(),
            db.collection("job_titles").where("orgId", "==", o.id).limit(1).get(),
        ]);
        const needsDepts = d.empty;
        const needsTitles = j.empty;
        if (needsDepts || needsTitles) {
            plan.push({ orgId: o.id, name: o.data().name || "(unnamed)", needsDepts, needsTitles });
        }
    }

    console.log("=".repeat(84));
    console.log("BACKFILL PLAN".padEnd(30) + "departments".padEnd(16) + "job_titles");
    console.log("=".repeat(84));
    for (const p of plan) {
        console.log(
            `${p.orgId.padEnd(28)}  ${(p.needsDepts ? `SEED ${DEPARTMENTS.length}` : "skip (has some)").padEnd(15)}` +
                `${p.needsTitles ? `SEED ${JOB_TITLES.length}` : "skip (has some)"}   (${p.name})`
        );
    }
    if (!plan.length) console.log("  (nothing to do — every org already has both)");
    console.log(`\norgs total: ${orgs.size} · needing a backfill: ${plan.length}`);

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fs.mkdirSync("backups", { recursive: true });
    const out = path.join("backups", `hr-reference-backfill-${stamp}.json`);
    fs.writeFileSync(out, JSON.stringify({ generatedAt: stamp, plan, DEPARTMENTS, JOB_TITLES }, null, 2));
    console.log(`plan -> ${out}`);

    if (!EXECUTE) {
        console.log("\nDRY-RUN only. Re-run with --execute to apply.");
        return;
    }

    const FV = admin.firestore.FieldValue;
    let dW = 0,
        jW = 0;
    for (const p of plan) {
        const batch = db.batch();
        if (p.needsDepts) {
            for (const d of DEPARTMENTS) {
                batch.set(db.collection("departments").doc(`${p.orgId}__${d.seedId}`), {
                    name: d.name,
                    description: d.description,
                    status: "active",
                    employeeCount: 0,
                    orgId: p.orgId,
                    createdBy: "backfill-script",
                    createdAt: FV.serverTimestamp(),
                    updatedAt: FV.serverTimestamp(),
                });
                dW++;
            }
        }
        if (p.needsTitles) {
            for (const j of JOB_TITLES) {
                batch.set(db.collection("job_titles").doc(`${p.orgId}__${j.seedId}`), {
                    name: j.name,
                    description: j.description,
                    status: "active",
                    orgId: p.orgId,
                    createdBy: "backfill-script",
                    createdAt: FV.serverTimestamp(),
                    updatedAt: FV.serverTimestamp(),
                });
                jW++;
            }
        }
        await batch.commit();
        console.log(`  seeded ${p.orgId}`);
    }
    console.log(`\nEXECUTED: ${dW} departments + ${jW} job titles across ${plan.length} org(s).`);
}
main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
