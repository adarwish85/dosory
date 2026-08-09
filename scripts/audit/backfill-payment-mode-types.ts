/**
 * Backfill `slug` + `type` onto every existing tenant's `paymentModes` documents.
 *
 * WHY: functions/src/finance.ts now classifies a payment by the MODE DOCUMENT first and by the
 * display name only as a fallback (see functions/src/payment-modes.ts). New tenants get the
 * fields from lib/provisioning/seed-tenant-defaults.ts; existing tenants have neither, so
 * without this they stay on the fragile name-matching path — and a tenant who renames a mode
 * silently reclassifies every future payment.
 *
 *   npx tsx scripts/audit/backfill-payment-mode-types.ts             # dry-run table
 *   npx tsx scripts/audit/backfill-payment-mode-types.ts --execute
 *
 * Safety properties:
 *   - ADDITIVE only: writes `slug`/`type` and nothing else, never touches `name`;
 *   - skips any document that already carries a `type` (idempotent, re-run is a no-op);
 *   - a mode whose name cannot be classified with confidence is LISTED, not guessed;
 *   - writes a backup of every document it will touch before executing.
 */
import * as fs from "fs";
import * as path from "path";
import { db } from "../_admin";
import { classifyByName, normalizeModeKey } from "../../functions/src/payment-modes";

const EXECUTE = process.argv.includes("--execute");

async function main() {
    const snap = await db.collection("paymentModes").get();

    const planned: { id: string; orgId: string; name: string; slug: string; type: string }[] = [];
    const skipped: { id: string; orgId: string; name: string; reason: string }[] = [];

    for (const doc of snap.docs) {
        const x = doc.data();
        const name = String(x.name ?? "");
        if (x.type === "bank" || x.type === "cash") {
            skipped.push({ id: doc.id, orgId: x.orgId, name, reason: `already type=${x.type}` });
            continue;
        }
        const type = classifyByName(name);
        if (type === "unknown") {
            skipped.push({ id: doc.id, orgId: x.orgId, name, reason: "NAME NOT CLASSIFIABLE — needs a human" });
            continue;
        }
        planned.push({ id: doc.id, orgId: x.orgId, name, slug: normalizeModeKey(name), type });
    }

    console.log("=".repeat(92));
    console.log(`PAYMENT MODES — ${snap.size} documents · mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}`);
    console.log("=".repeat(92));
    console.log("org".padEnd(28) + "name".padEnd(22) + "slug".padEnd(18) + "type");
    for (const p of planned) {
        console.log(p.orgId.padEnd(28) + p.name.padEnd(22) + p.slug.padEnd(18) + p.type);
    }
    if (skipped.length) {
        console.log("\nSKIPPED");
        for (const s of skipped) console.log(`  ${s.orgId.padEnd(28)} ${s.name.padEnd(22)} ${s.reason}`);
    }
    console.log(`\nwould write: ${planned.length} · skipped: ${skipped.length}`);

    const unclassifiable = skipped.filter((s) => s.reason.startsWith("NAME NOT"));
    if (unclassifiable.length) {
        console.log(
            `\n!! ${unclassifiable.length} mode(s) cannot be classified from the name. They keep the ` +
                "name-fallback path and will post to Cash with paymentModeType='unknown' (logged). " +
                "Set `type` on those documents by hand."
        );
    }

    if (!EXECUTE) {
        console.log("\nDRY-RUN ONLY. Nothing was written.");
        return;
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fs.mkdirSync("backups", { recursive: true });
    const backup = path.join("backups", `payment-modes-before-${stamp}.json`);
    fs.writeFileSync(
        backup,
        JSON.stringify(
            snap.docs.filter((d) => planned.some((p) => p.id === d.id)).map((d) => ({ id: d.id, ...d.data() })),
            null,
            2
        )
    );
    console.log(`backup written to ${backup}`);

    let written = 0;
    for (const p of planned) {
        await db.collection("paymentModes").doc(p.id).set({ slug: p.slug, type: p.type }, { merge: true });
        written++;
    }
    console.log(`EXECUTED: updated ${written} payment modes.`);
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
