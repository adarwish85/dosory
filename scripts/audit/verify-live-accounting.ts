/**
 * Runs the accounting-invariants logic against LIVE prod data for one org.
 * Read-only. Used as post-deploy proof that the callables actually post.
 */
import { db } from "../_admin";
const ORG = process.argv[2] || "qasmoke20260728131942";

async function main() {
    const [je, inv, pay, acc] = await Promise.all([
        db.collection("journal_entries").where("orgId", "==", ORG).get(),
        db.collection("invoices").where("orgId", "==", ORG).get(),
        db.collection("payments").where("orgId", "==", ORG).get(),
        db.collection("accounts").where("orgId", "==", ORG).get(),
    ]);
    const accIds = new Set(acc.docs.map((d) => d.id));
    console.log(
        `org ${ORG}: accounts=${acc.size} invoices=${inv.size} payments=${pay.size} journal_entries=${je.size}\n`
    );

    let fails = 0;
    console.log("--- INVARIANT 1: every journal entry balances to zero ---");
    for (const d of je.docs) {
        const x = d.data();
        const lines = (x.lines || []) as {
            debit?: number;
            credit?: number;
            accountId?: string;
            accountName?: string;
        }[];
        const dr = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
        const cr = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
        const bal = Math.abs(dr - cr) < 0.005;
        const known = lines.every((l) => l.accountId && accIds.has(l.accountId));
        if (!bal || !known) fails++;
        console.log(
            `  ${bal ? "OK " : "BAD"} ${d.id} ${x.referenceType} ref=${x.referenceId} DR=${dr.toFixed(2)} CR=${cr.toFixed(2)} accountsResolve=${known}`
        );
        lines.forEach((l) => console.log(`        ${l.accountName}  dr=${l.debit} cr=${l.credit}`));
    }

    console.log("\n--- INVARIANT 2: invoice totals reconcile against their payments ---");
    for (const d of inv.docs) {
        const x = d.data();
        const paid = pay.docs
            .filter((q) => q.data().invoiceId === d.id)
            .reduce((s, q) => s + (Number(q.data().amount) || 0), 0);
        const due = Number(x.amountDue) || 0;
        const total = Number(x.total) || 0;
        const okRec = Math.abs(total - paid - due) < 0.005;
        if (!okRec) fails++;
        console.log(
            `  ${okRec ? "OK " : "BAD"} #${x.number} total=${total} payments=${paid} amountDue=${due}  (total - paid - due = ${(total - paid - due).toFixed(2)})`
        );
    }

    console.log("\n--- INVARIANT 3: finalized/paid invoices have their journal entries ---");
    for (const d of inv.docs) {
        const x = d.data();
        if (x.status === "draft") continue;
        const hasInv = je.docs.some((q) => q.data().referenceType === "invoice" && q.data().referenceId === d.id);
        const paysFor = pay.docs.filter((q) => q.data().invoiceId === d.id);
        const hasPay = paysFor.every((q) =>
            je.docs.some((r) => r.data().referenceType === "payment" && r.data().referenceId === q.id)
        );
        console.log(`  #${x.number} (${x.status}) invoiceJE=${hasInv} paymentJEs=${paysFor.length ? hasPay : "n/a"}`);
    }

    console.log(`\nRESULT: ${fails === 0 ? "ALL INVARIANTS HOLD" : `${fails} VIOLATION(S)`}`);
    process.exit(fails === 0 ? 0 : 1);
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
