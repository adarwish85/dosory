/**
 * One-off backfill: give existing `reminders` the `emailSent` flag that checkReminders needs.
 *
 * WHY: functions/src/reminders.ts queries `.where("sendEmail","==",true).where("emailSent","==",false)`.
 * Firestore's `==` filter EXCLUDES documents that lack the field, and reminders created before the
 * flag existed have no `emailSent` — so checkReminders matched ZERO of them and never sent. This
 * backfills the field so due reminders become eligible, WITHOUT unleashing a burst of ancient sends.
 *
 * RULE (only for docs where sendEmail == true AND emailSent is missing):
 *   - date >= now-30d          → emailSent: false   (eligible to send on the next run)
 *   - date <  now-30d, or no date → emailSent: true (marked consumed; never retro-sends)
 *
 * Docs that already have `emailSent` (true or false) are left untouched. Scope: `reminders` only.
 * Affected docs are exported to backups/reminder-emailsent-backfill-<timestamp>.json before writing.
 *
 * Run (dry-run):   npx tsx scripts/backfill-reminder-emailsent.ts
 * Execute:         npx tsx scripts/backfill-reminder-emailsent.ts --execute
 */
import * as fs from "fs";
import * as path from "path";
import { admin, db, app } from "./_admin";

const EXECUTE = process.argv.includes("--execute");
const EXPECTED_PROJECT = "goalo-6a269";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function msOf(ts: unknown): number | null {
    if (ts && typeof (ts as { toMillis?: () => number }).toMillis === "function") {
        return (ts as { toMillis: () => number }).toMillis();
    }
    return null;
}

async function main() {
    const projectId =
        (app.options as { projectId?: string }).projectId ||
        (app.options.credential as unknown as { projectId?: string })?.projectId ||
        process.env.GOOGLE_CLOUD_PROJECT;
    if (projectId && projectId !== EXPECTED_PROJECT) {
        throw new Error(`Refusing to run: connected to project "${projectId}", expected "${EXPECTED_PROJECT}".`);
    }
    console.log(`Project: ${projectId || "(from service-account key)"} · mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}\n`);

    const cutoff = Date.now() - THIRTY_DAYS_MS;
    const snap = await db.collection("reminders").where("sendEmail", "==", true).get();
    console.log(`Read ${snap.size} reminders with sendEmail==true.\n`);

    const plan: { id: string; value: boolean; reason: string; data: FirebaseFirestore.DocumentData }[] = [];
    for (const d of snap.docs) {
        const data = d.data();
        if (data.emailSent !== undefined && data.emailSent !== null) continue; // already flagged

        const dateMs = msOf(data.date);
        let value: boolean;
        let reason: string;
        if (dateMs === null) {
            value = true;
            reason = "no date → consumed";
        } else if (dateMs >= cutoff) {
            value = false;
            reason = "recent (>= now-30d) → eligible";
        } else {
            value = true;
            reason = "old (< now-30d) → consumed";
        }
        plan.push({ id: d.id, value, reason, data });
    }

    const eligible = plan.filter((p) => p.value === false).length;
    const consumed = plan.filter((p) => p.value === true).length;

    console.log("=== BACKFILL PLAN (missing emailSent only) ===");
    for (const p of plan.slice(0, 50)) {
        console.log(`  ${p.id}  emailSent=${p.value}  (${p.reason})`);
    }
    if (plan.length > 50) console.log(`  … and ${plan.length - 50} more`);
    console.log(
        `\nTo backfill: ${plan.length}  ·  → eligible-to-send (false): ${eligible}  ·  → consumed (true): ${consumed}`
    );

    if (!EXECUTE) {
        console.log("\nDRY-RUN only. Re-run with --execute to apply.");
        return;
    }
    if (plan.length === 0) {
        console.log("\nNothing to execute.");
        return;
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupsDir = path.join(process.cwd(), "backups");
    fs.mkdirSync(backupsDir, { recursive: true });
    const backupPath = path.join(backupsDir, `reminder-emailsent-backfill-${stamp}.json`);
    fs.writeFileSync(
        backupPath,
        JSON.stringify(
            plan.map((p) => ({ id: p.id, newEmailSent: p.value, reason: p.reason, before: p.data })),
            null,
            2
        )
    );
    console.log(`\nBacked up ${plan.length} docs → ${path.relative(process.cwd(), backupPath)}`);

    // Batched writes (Firestore hard limit 500 ops/batch).
    let written = 0;
    for (let i = 0; i < plan.length; i += 400) {
        const batch = db.batch();
        for (const p of plan.slice(i, i + 400)) {
            batch.update(db.collection("reminders").doc(p.id), {
                emailSent: p.value,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        await batch.commit();
        written += Math.min(400, plan.length - i);
    }
    console.log(`\nEXECUTED: backfilled emailSent on ${written} reminders (${eligible} now eligible to send).`);
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
