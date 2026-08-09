/**
 * CORRECTIVE AUDIT — payment journal entries whose debit account contradicts the payment's mode,
 * plus finalized-then-voided invoices whose receivable was never reversed.
 *
 * DRY-RUN ONLY. There is no --execute flag on purpose: correcting posted books is Ahmed's call,
 * and the plan below is the thing he approves. Nothing here writes.
 *
 *   npx tsx scripts/audit/audit-payment-je-corrections.ts
 *
 * WHY THERE IS ANYTHING TO CORRECT
 *   1. Until 2026-08-09 processPayment classified the mode with
 *        ["bank_transfer","cheque","card"].includes(paymentMode.toLowerCase())
 *      while the picker writes the DISPLAY NAME ("Bank Transfer" — with a space), so every
 *      payment posted to Cash 1000 regardless of how it was actually received.
 *   2. voidInvoice posted no reversing entry, so an invoice finalized and then voided left its
 *      AR debit on the books while the aging report showed nothing (amountDue is 0).
 *
 * THE PROPOSED CORRECTION SHAPE (never a silent edit of a posted entry):
 *   reversal  — the exact mirror of the wrong entry, dated today, linked by `reversesEntryId`
 *   repost    — the same amounts against the correct accounts, linked by `correctsEntryId`
 * Both carry `correctionBatch` so the whole run can be identified, and deterministic ids so a
 * re-run cannot double-post.
 */
import * as fs from "fs";
import * as path from "path";
import { db } from "../_admin";
import { accountCodeFor, classifyByName, classifyFromDoc, PaymentModeType } from "../../functions/src/payment-modes";

type AccountRef = { id: string; code: string; name: string };

const money = (n: number) => n.toFixed(2).padStart(12);

async function main() {
    const [payments, entries, accountsSnap, modesSnap, invoices] = await Promise.all([
        db.collection("payments").get(),
        db.collection("journal_entries").get(),
        db.collection("accounts").get(),
        db.collection("paymentModes").get(),
        db.collection("invoices").get(),
    ]);

    const accountsById = new Map<string, AccountRef & { orgId: string }>();
    const accountsByOrgCode = new Map<string, AccountRef>();
    for (const d of accountsSnap.docs) {
        const x = d.data();
        const ref = { id: d.id, code: String(x.code), name: String(x.name) };
        accountsById.set(d.id, { ...ref, orgId: x.orgId });
        accountsByOrgCode.set(`${x.orgId}::${x.code}`, ref);
    }

    // The tenant's own mode documents are the classification authority (post-backfill).
    const modeByOrgName = new Map<string, { type?: unknown; slug?: unknown }>();
    for (const d of modesSnap.docs) {
        const x = d.data();
        modeByOrgName.set(`${x.orgId}::${x.name}`, { type: x.type, slug: x.slug });
    }

    const resolve = (orgId: string, rawMode: string): PaymentModeType => {
        const fromDoc = classifyFromDoc(modeByOrgName.get(`${orgId}::${rawMode}`));
        return fromDoc !== "unknown" ? fromDoc : classifyByName(rawMode);
    };

    // ---------------------------------------------------------------- 1. mis-posted payments
    const paymentEntries = entries.docs.filter((d) => d.data().referenceType === "payment");
    const misposted: Record<string, unknown>[] = [];

    for (const je of paymentEntries) {
        const j = je.data();
        const payment = payments.docs.find((p) => p.id === j.referenceId);
        if (!payment) continue;
        const p = payment.data();
        const rawMode = String(p.paymentMode ?? "");
        const shouldType = resolve(p.orgId, rawMode);
        const shouldCode = accountCodeFor(shouldType);

        const debitLine = (j.lines || []).find((l: { debit?: number }) => (l.debit || 0) > 0);
        const actual = debitLine ? accountsById.get(debitLine.accountId) : undefined;
        if (!actual) continue;
        if (actual.code === shouldCode) continue;

        const target = accountsByOrgCode.get(`${p.orgId}::${shouldCode}`);
        misposted.push({
            journalEntryId: je.id,
            paymentId: payment.id,
            orgId: p.orgId,
            date: j.date?.toDate?.()?.toISOString?.().slice(0, 10) ?? "?",
            amount: Number(j.totalAmount) || 0,
            currency: j.currency || "USD",
            paymentMode: rawMode,
            resolvedType: shouldType,
            postedTo: `${actual.code} ${actual.name}`,
            shouldBe: target ? `${target.code} ${target.name}` : `${shouldCode} ‹ACCOUNT MISSING IN THIS ORG›`,
            targetAccountId: target?.id ?? null,
            blocked: !target,
        });
    }

    // ------------------------------------------------- 2. voided invoices with no reversal
    const invoiceEntries = entries.docs.filter((d) => d.data().referenceType === "invoice");
    const reversedIds = new Set(entries.docs.map((d) => d.data().reversesEntryId).filter(Boolean));
    const unreversed: Record<string, unknown>[] = [];

    for (const je of invoiceEntries) {
        const j = je.data();
        if (reversedIds.has(je.id)) continue;
        const invoice = invoices.docs.find((i) => i.id === j.referenceId);
        if (!invoice) continue;
        const inv = invoice.data();
        if (inv.status !== "void" && inv.status !== "cancelled") continue;

        const ar = accountsByOrgCode.get(`${j.orgId}::1200`);
        const income = accountsByOrgCode.get(`${j.orgId}::4000`);
        unreversed.push({
            journalEntryId: je.id,
            invoiceId: invoice.id,
            orgId: j.orgId,
            status: inv.status,
            amount: Number(j.totalAmount) || 0,
            currency: j.currency || "USD",
            reversalWouldBe:
                ar && income ? `DR ${income.code} ${income.name} / CR ${ar.code} ${ar.name}` : "‹ACCOUNTS MISSING›",
            blocked: !ar || !income,
        });
    }

    // ------------------------------------------------------------------------- the report
    console.log("=".repeat(104));
    console.log("CORRECTION PLAN — DRY RUN. Nothing was written. Requires Ahmed's approval to execute.");
    console.log("=".repeat(104));

    console.log(`\n1. PAYMENT ENTRIES POSTED TO THE WRONG ASSET ACCOUNT  (${misposted.length})`);
    if (misposted.length === 0) {
        console.log("   none");
    } else {
        console.log(
            "   " +
                "org".padEnd(24) +
                "date".padEnd(12) +
                "amount".padStart(12) +
                "  mode".padEnd(20) +
                "  posted → should be"
        );
        for (const m of misposted as any[]) {
            console.log(
                "   " +
                    String(m.orgId).padEnd(24) +
                    String(m.date).padEnd(12) +
                    money(m.amount) +
                    `  ${m.paymentMode}`.padEnd(20) +
                    `  ${m.postedTo}  →  ${m.shouldBe}` +
                    (m.blocked ? "   ‹BLOCKED: target account does not exist›" : "")
            );
        }
        const total = (misposted as any[]).reduce((s, m) => s + m.amount, 0);
        console.log(`   ${"".padEnd(36)}${money(total)}  total to reclassify`);
    }

    console.log(`\n2. VOIDED INVOICES WHOSE RECEIVABLE WAS NEVER REVERSED  (${unreversed.length})`);
    if (unreversed.length === 0) {
        console.log("   none");
    } else {
        for (const u of unreversed as any[]) {
            console.log(
                `   ${String(u.orgId).padEnd(24)} invoice ${u.invoiceId} ${money(u.amount)}  ${u.reversalWouldBe}` +
                    (u.blocked ? "   ‹BLOCKED›" : "")
            );
        }
        const total = (unreversed as any[]).reduce((s, u) => s + u.amount, 0);
        console.log(`   ${"".padEnd(36)}${money(total)}  total receivable to reverse`);
    }

    // --------------------------------------------- 3. payments with no entry at all
    // Not a mis-post — nothing was ever written. These predate the 2026-08-08 fix, when
    // findAccountByCode read an empty subcollection and every posting path silently skipped.
    // Listed so the plan states its own scope: correcting §1 does NOT make the books complete.
    const paymentIdsWithEntries = new Set(paymentEntries.map((d) => d.data().referenceId).filter(Boolean));
    const unposted = payments.docs
        .filter((p) => !paymentIdsWithEntries.has(p.id))
        .map((p) => ({
            paymentId: p.id,
            orgId: p.data().orgId,
            amount: Number(p.data().amount) || 0,
            paymentMode: p.data().paymentMode ?? "‹none›",
            wouldResolveTo: accountCodeFor(resolve(p.data().orgId, String(p.data().paymentMode ?? ""))),
        }));

    console.log(`\n3. PAYMENTS WITH NO JOURNAL ENTRY AT ALL  (${unposted.length})`);
    if (unposted.length === 0) {
        console.log("   none");
    } else {
        for (const u of unposted) {
            console.log(
                `   ${String(u.orgId).padEnd(24)} payment ${u.paymentId} ${money(u.amount)}  mode=${String(u.paymentMode)}  would post to ${u.wouldResolveTo}`
            );
        }
        console.log("   These are a BACKFILL question, not a correction — same class as the 2026-08-08");
        console.log("   expense backfill. Separate decision.");
    }

    // Unlinked entries: a payment-type entry with no referenceId cannot be matched to a payment,
    // so it is neither confirmed correct nor confirmed wrong. Same landmine the expense backfill
    // hit — surface it rather than assuming.
    const unlinked = paymentEntries.filter((d) => !d.data().referenceId);
    console.log(`\n4. PAYMENT ENTRIES WITH NO referenceId  (${unlinked.length})  — cannot be matched to a payment`);
    for (const d of unlinked) {
        const j = d.data();
        console.log(
            `   ${String(j.orgId).padEnd(24)} JE ${d.id} ${money(Number(j.totalAmount) || 0)}  "${j.description}"`
        );
    }

    console.log("\nPROPOSED ENTRIES PER ITEM (nothing is edited in place):");
    console.log("   §1  reversal  je-corr-rev-{journalEntryId}   mirror of the wrong entry");
    console.log("       repost    je-corr-new-{journalEntryId}   same amounts, correct asset account");
    console.log("   §2  reversal  je-void-{invoiceId}            DR Sales Income / CR Accounts Receivable");
    console.log("   every entry carries correctionBatch + reversesEntryId/correctsEntryId, ids are");
    console.log("   deterministic, and a re-run would be a no-op.");

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fs.mkdirSync("backups", { recursive: true });
    const out = path.join("backups", `je-correction-plan-${stamp}.json`);
    fs.writeFileSync(
        out,
        JSON.stringify(
            {
                generatedAt: stamp,
                misposted,
                unreversed,
                unposted,
                unlinked: unlinked.map((d) => ({ id: d.id, ...d.data() })),
            },
            null,
            2
        )
    );
    console.log(`\nplan written to ${out}`);
    console.log("STOPPING: no corrections executed. Awaiting approval.");
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
