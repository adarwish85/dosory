/**
 * Resolve the two amount-collisions found by the expense backfill dry-run by LINKING each
 * pre-existing journal entry to the expense it evidently belongs to — i.e. setting the
 * `referenceId` it was missing — instead of posting a second entry for the same money.
 *
 * Backs up both journal_entries documents in full before touching them.
 * Idempotent: an entry that already carries the right referenceId is skipped.
 * Sets ONLY `referenceId` (+ an audit marker). No amounts, lines, dates or accounts change.
 *
 *   npx tsx scripts/audit/link-colliding-expense-jes.ts            # dry-run
 *   npx tsx scripts/audit/link-colliding-expense-jes.ts --execute
 */
import * as fs from "fs";
import * as path from "path";
import { db, admin } from "../_admin";

const EXECUTE = process.argv.includes("--execute");

/** Collisions confirmed by the 2026-08-08 dry-run (org wasiladev). */
const LINKS = [
    { jeId: "rgtDZoRRhyXB0sxDmbVB", expenseId: "DcSm4Ry3IGnpEDermouH", amount: 3200 },
    { jeId: "ItrTKMh8VURDjmsLWpM0", expenseId: "hpEpoo8inGc3S7vybtUr", amount: 1500 },
];

async function main() {
    console.log(`mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}\n`);
    const backups: Record<string, unknown> = {};
    const plan: string[] = [];

    for (const l of LINKS) {
        const jeRef = db.collection("journal_entries").doc(l.jeId);
        const [je, exp] = await Promise.all([jeRef.get(), db.collection("expenses").doc(l.expenseId).get()]);
        if (!je.exists) {
            console.log(`  SKIP ${l.jeId}: journal entry not found`);
            continue;
        }
        if (!exp.exists) {
            console.log(`  SKIP ${l.jeId}: expense ${l.expenseId} not found`);
            continue;
        }

        const j = je.data()!;
        const e = exp.data()!;
        backups[l.jeId] = j;

        // Safety: refuse unless the amounts still match and it is still unlinked.
        const amountsMatch =
            Math.abs(Number(j.totalAmount) - Number(e.amount)) < 0.005 &&
            Math.abs(Number(j.totalAmount) - l.amount) < 0.005;
        if (j.referenceId === l.expenseId) {
            console.log(`  ALREADY LINKED ${l.jeId} -> ${l.expenseId}`);
            continue;
        }
        if (j.referenceId) {
            console.log(`  REFUSE ${l.jeId}: already has referenceId=${j.referenceId}`);
            continue;
        }
        if (!amountsMatch) {
            console.log(`  REFUSE ${l.jeId}: amount mismatch je=${j.totalAmount} exp=${e.amount} expected=${l.amount}`);
            continue;
        }

        plan.push(
            `  LINK  JE ${l.jeId} "${j.description}" (${j.totalAmount}) -> expense ${l.expenseId} "${e.payee || e.description}" (${e.amount})`
        );
        if (EXECUTE) {
            await jeRef.update({
                referenceId: l.expenseId,
                referenceType: "expense",
                linkedBy: "link-colliding-expense-jes",
                linkedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    }

    plan.forEach((s) => console.log(s));
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fs.mkdirSync("backups", { recursive: true });
    const out = path.join("backups", `je-link-backup-${stamp}.json`);
    fs.writeFileSync(
        out,
        JSON.stringify({ generatedAt: stamp, executed: EXECUTE, links: LINKS, before: backups }, null, 2)
    );
    console.log(`\nbackup of the affected journal entries -> ${out}`);
    console.log(EXECUTE ? `EXECUTED: ${plan.length} link(s) applied.` : "DRY-RUN only, nothing written.");
}
main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
