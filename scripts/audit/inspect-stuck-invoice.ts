/**
 * READ-ONLY: dump the field SHAPE of every invoice that would hit the undefined-write crash,
 * so the fix can be proved against a faithful clone in the emulator without touching a real
 * client's books.
 *
 *   npx tsx scripts/audit/inspect-stuck-invoice.ts
 *
 * Prints types and presence, plus the literal values of the non-identifying fields the
 * callables actually read. Customer/contact identifiers are shown as a presence flag only.
 */
import * as fs from "fs";
import * as path from "path";
import { db } from "../_admin";

// Exactly what functions/src/finance.ts dereferences on the invoice.
const READ_BY_CALLABLES = [
    "orgId",
    "status",
    "total",
    "amountPaid",
    "amountDue",
    "number",
    "numberFormatted",
    "currency",
    "customerId",
    "isFinalized",
];

const SAFE_TO_PRINT = new Set([
    "orgId",
    "status",
    "total",
    "amountPaid",
    "amountDue",
    "number",
    "numberFormatted",
    "currency",
    "isFinalized",
]);

async function main() {
    const snap = await db.collection("invoices").get();
    const stuck = snap.docs.filter((d) => {
        const x = d.data();
        return x.number === undefined || x.currency === undefined || x.customerId === undefined;
    });

    console.log(`invoices: ${snap.size} · would crash the callables: ${stuck.length}\n`);

    const clones: Record<string, unknown>[] = [];
    for (const d of stuck) {
        const x = d.data();
        console.log("=".repeat(80));
        console.log(`invoice ${d.id}`);
        console.log("=".repeat(80));
        for (const f of READ_BY_CALLABLES) {
            const v = x[f];
            const shown = v === undefined ? "‹ABSENT›" : SAFE_TO_PRINT.has(f) ? JSON.stringify(v) : "‹present›";
            console.log(`  ${f.padEnd(18)} ${shown}`);
        }
        const extra = Object.keys(x).filter((k) => !READ_BY_CALLABLES.includes(k));
        console.log(`  other fields       ${extra.join(", ")}`);

        // Clone carries the SHAPE (which keys exist, and their types) — never the values of
        // identifying fields. Enough to reproduce the crash faithfully in the emulator.
        const clone: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(x)) {
            if (v === undefined) continue;
            if (SAFE_TO_PRINT.has(k)) clone[k] = v;
            else if (typeof v === "string") clone[k] = `redacted_${k}`;
            else if (typeof v === "number" || typeof v === "boolean") clone[k] = v;
            else clone[k] = null; // timestamps / maps / arrays — shape only
        }
        clone.__sourceId = d.id;
        clone.__absentKeys = READ_BY_CALLABLES.filter((f) => x[f] === undefined);
        clones.push(clone);
    }

    fs.mkdirSync("backups", { recursive: true });
    const out = path.join("backups", `stuck-invoice-shapes-${new Date().toISOString().slice(0, 10)}.json`);
    fs.writeFileSync(out, JSON.stringify(clones, null, 2));
    console.log(`\nshapes written to ${out} (identifying values redacted)`);
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
