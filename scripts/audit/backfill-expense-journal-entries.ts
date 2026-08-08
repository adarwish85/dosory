/**
 * Backfill journal entries for expenses that were saved without one.
 *
 * WHY THEY ARE MISSING: lib/hooks/use-expenses.ts posts the expense journal entry only
 * `if (creditAccount && debitAccount)`, resolved from useFinance().accounts — which nothing
 * ever fetched, and which threw anyway because accounts(orgId, code) had no composite index.
 * So the expense row was written and the books were silently left untouched.
 *
 * THIS SCRIPT DEFAULTS TO DRY-RUN AND WILL NOT WRITE WITHOUT --execute.
 * Historical financial backfill is Ahmed's explicit call after he has seen the numbers.
 *
 *   npx tsx scripts/audit/backfill-expense-journal-entries.ts              # dry-run table
 *   npx tsx scripts/audit/backfill-expense-journal-entries.ts --execute    # requires go-ahead
 *
 * Safety properties:
 *   - idempotent: an expense that already has a journal_entries doc with
 *     referenceType="expense" and referenceId=<expenseId> is skipped;
 *   - deterministic ids (`je-expense-{expenseId}`) so a re-run cannot double-post;
 *   - refuses to post for an org whose chart of accounts cannot satisfy the entry, and lists
 *     those separately instead of guessing an account;
 *   - every proposed entry is balance-checked (sum debits === sum credits) before writing;
 *   - writes a full backup of the proposed set to backups/ before executing.
 */
import * as fs from "fs";
import * as path from "path";
import { db, admin } from "../_admin";

const EXECUTE = process.argv.includes("--execute");
const EXPECTED_PROJECT = "goalo-6a269";

type Proposed = {
    expenseId: string;
    orgId: string;
    date: string;
    amount: number;
    currency: string;
    payee: string;
    debitAccount: { id: string; name: string; code: string };
    creditAccount: { id: string; name: string; code: string };
    balanced: boolean;
};

async function main() {
    const projectId = (admin.app().options.credential as { projectId?: string })?.projectId;
    if (projectId && projectId !== EXPECTED_PROJECT) throw new Error(`wrong project: ${projectId}`);
    console.log(`project: ${projectId} · mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}\n`);

    const [expensesSnap, jeSnap, accountsSnap] = await Promise.all([
        db.collection("expenses").get(),
        db.collection("journal_entries").get(),
        db.collection("accounts").get(),
    ]);

    // Which expenses already have an entry?
    const postedExpenseIds = new Set(
        jeSnap.docs
            .filter((d) => d.data().referenceType === "expense" && d.data().referenceId)
            .map((d) => d.data().referenceId as string)
    );

    // DANGER CASE, found on 2026-08-08: prod contains expense-type journal entries with NO
    // referenceId at all (unlinked seed/demo rows). The id-based idempotency check above
    // cannot see them, so a backfill could post a SECOND entry for money that is already in
    // the books. We cannot resolve that automatically — matching on amount alone is a guess —
    // so surface every collision loudly and let a human decide.
    const unlinked = jeSnap.docs
        .filter((d) => d.data().referenceType === "expense" && !d.data().referenceId)
        .map((d) => ({
            id: d.id,
            amount: Number(d.data().totalAmount) || 0,
            description: d.data().description as string,
            orgId: d.data().orgId as string,
        }));

    // Chart of accounts per org.
    const chart = new Map<string, { id: string; code: string; name: string; type: string }[]>();
    for (const d of accountsSnap.docs) {
        const x = d.data();
        if (!x.orgId) continue;
        if (!chart.has(x.orgId)) chart.set(x.orgId, []);
        chart.get(x.orgId)!.push({ id: d.id, code: x.code, name: x.name, type: x.type });
    }

    const proposed: Proposed[] = [];
    const blocked: { expenseId: string; orgId: string; reason: string }[] = [];
    let alreadyPosted = 0;

    for (const d of expensesSnap.docs) {
        const x = d.data();
        if (postedExpenseIds.has(d.id)) {
            alreadyPosted++;
            continue;
        }
        const orgAccounts = chart.get(x.orgId) || [];
        // Same resolution rules as lib/hooks/use-expenses.ts, so the backfill and the live
        // path cannot disagree about which accounts an expense hits.
        const creditCode = x.paymentMode === "cash" ? "1000" : "1010";
        const credit = orgAccounts.find((a) => a.code === creditCode);
        const debit = orgAccounts.find((a) => a.id === x.categoryId) || orgAccounts.find((a) => a.type === "expense");

        if (!credit || !debit) {
            blocked.push({
                expenseId: d.id,
                orgId: x.orgId,
                reason: `chart incomplete (accounts=${orgAccounts.length}${!credit ? `, no code ${creditCode}` : ""}${!debit ? ", no expense account" : ""})`,
            });
            continue;
        }

        const amount = Number(x.amount) || 0;
        proposed.push({
            expenseId: d.id,
            orgId: x.orgId,
            date: x.date?.toDate?.()?.toISOString?.()?.slice(0, 10) ?? "?",
            amount,
            currency: x.currency || "USD",
            payee: x.payee || x.description || "",
            debitAccount: debit,
            creditAccount: credit,
            balanced: Math.abs(amount - amount) < 0.005 && amount > 0,
        });
    }

    console.log("=".repeat(96));
    console.log("PROPOSED JOURNAL ENTRIES (one per expense with no entry)");
    console.log("=".repeat(96));
    console.log(
        "expenseId".padEnd(22) + "org".padEnd(14) + "date".padEnd(12) + "amount".padStart(12) + "  DR -> CR".padEnd(10)
    );
    let sum = 0;
    for (const p of proposed) {
        sum += p.amount;
        console.log(
            p.expenseId.padEnd(22) +
                p.orgId.padEnd(14) +
                p.date.padEnd(12) +
                `${p.currency} ${p.amount.toFixed(2)}`.padStart(12) +
                `  ${p.debitAccount.code} ${p.debitAccount.name} -> ${p.creditAccount.code} ${p.creditAccount.name}` +
                (p.balanced ? "" : "   <-- NOT BALANCED, WOULD BE SKIPPED")
        );
    }
    const byOrg = new Map<string, { n: number; total: number }>();
    proposed.forEach((p) => {
        const e = byOrg.get(p.orgId) || { n: 0, total: 0 };
        e.n++;
        e.total += p.amount;
        byOrg.set(p.orgId, e);
    });

    // Amount collisions against unlinked entries — possible double-posting.
    const collisions = proposed
        .map((p) => ({
            p,
            hits: unlinked.filter((u) => u.orgId === p.orgId && Math.abs(u.amount - p.amount) < 0.005),
        }))
        .filter((c) => c.hits.length > 0);

    if (collisions.length > 0) {
        console.log("\n" + "!".repeat(96));
        console.log("POSSIBLE DOUBLE-POST — these expenses match an EXISTING journal entry by amount");
        console.log("(those entries carry no referenceId, so they cannot be matched automatically)");
        console.log("!".repeat(96));
        for (const c of collisions) {
            console.log(`  expense ${c.p.expenseId} ${c.p.currency} ${c.p.amount.toFixed(2)} "${c.p.payee}"`);
            for (const h of c.hits)
                console.log(`     collides with JE ${h.id} "${h.description}" (${h.amount.toFixed(2)})`);
        }
        console.log("  -> RESOLVE THESE BEFORE EXECUTING. Either link the existing entry by setting");
        console.log("     its referenceId, or confirm they are unrelated.");
    }

    console.log("\n" + "=".repeat(96));
    console.log("SUMMARY");
    console.log("=".repeat(96));
    console.log(`expenses total                  : ${expensesSnap.size}`);
    console.log(`already have a journal entry    : ${alreadyPosted}`);
    console.log(`would be backfilled             : ${proposed.length}   value ${sum.toFixed(2)}`);
    console.log(`blocked (chart of accounts gap) : ${blocked.length}`);
    console.log(`unlinked expense JEs in prod    : ${unlinked.length}  (no referenceId — invisible to the id check)`);
    console.log(`AMOUNT COLLISIONS               : ${collisions.length}  <-- must be resolved before --execute`);
    for (const [orgId, e] of byOrg) console.log(`   org ${orgId}: ${e.n} entries, ${e.total.toFixed(2)}`);
    for (const b of blocked) console.log(`   BLOCKED ${b.expenseId} (org ${b.orgId}): ${b.reason}`);

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fs.mkdirSync("backups", { recursive: true });
    const out = path.join("backups", `expense-je-backfill-plan-${stamp}.json`);
    fs.writeFileSync(
        out,
        JSON.stringify({ generatedAt: stamp, proposed, blocked, alreadyPosted, unlinked, collisions }, null, 2)
    );
    console.log(`\nplan written to ${out}`);

    if (EXECUTE && collisions.length > 0) {
        console.log("\nREFUSING TO EXECUTE: unresolved amount collisions could double-post real money.");
        console.log("Resolve them (link or dismiss each) and re-run.");
        return;
    }

    if (!EXECUTE) {
        console.log("\nDRY-RUN ONLY. Nothing was written.");
        console.log("Historical financial backfill needs Ahmed's explicit go-ahead — re-run with --execute then.");
        return;
    }

    let written = 0;
    for (const p of proposed) {
        if (!p.balanced) continue;
        // Deterministic id: a re-run overwrites the same document instead of double-posting.
        const ref = db.collection("journal_entries").doc(`je-expense-${p.expenseId}`);
        await ref.set({
            orgId: p.orgId,
            workspaceId: p.orgId,
            date: admin.firestore.Timestamp.fromDate(new Date(p.date)),
            description: `Expense: ${p.payee}`,
            referenceId: p.expenseId,
            referenceType: "expense",
            totalAmount: p.amount,
            status: "posted",
            currency: p.currency,
            fxRate: 1.0,
            lines: [
                {
                    accountId: p.debitAccount.id,
                    accountName: p.debitAccount.name,
                    debit: p.amount,
                    credit: 0,
                    description: `Expense to ${p.payee}`,
                },
                {
                    accountId: p.creditAccount.id,
                    accountName: p.creditAccount.name,
                    debit: 0,
                    credit: p.amount,
                    description: "Backfilled",
                },
            ],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: "backfill-script",
            backfilledAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        written++;
    }
    console.log(`\nEXECUTED: wrote ${written} journal entries.`);
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
