/**
 * READ-ONLY audit: what `paymentMode` strings actually exist in prod, and how the posting
 * paths classify them.
 *
 * WHY: functions/src/finance.ts decides Bank vs Cash with
 *     ["bank_transfer", "cheque", "card"].includes(paymentMode.toLowerCase())
 * while /dashboard/payments/new writes the payment mode's DISPLAY NAME ("Bank Transfer"),
 * whose lowercase form is "bank transfer" — with a space. lib/hooks/use-expenses.ts uses a
 * third convention again (`=== "cash" ? Cash : Bank`).
 *
 *   npx tsx scripts/audit/audit-payment-modes.ts
 */
import { db } from "../_admin";

const BANK_CODES = ["bank_transfer", "cheque", "card"];

async function main() {
    const [payments, modes, expenses] = await Promise.all([
        db.collection("payments").get(),
        db.collection("paymentModes").get(),
        db.collection("expenses").get(),
    ]);

    const tally = new Map<string, number>();
    for (const d of payments.docs) {
        const m = String(d.data().paymentMode ?? "(missing)");
        tally.set(m, (tally.get(m) || 0) + 1);
    }

    console.log("=".repeat(88));
    console.log("PAYMENT `paymentMode` VALUES IN PROD");
    console.log("=".repeat(88));
    console.log("value".padEnd(30) + "docs".padStart(6) + "   finance.ts → account");
    for (const [value, n] of [...tally].sort((a, b) => b[1] - a[1])) {
        const isBank = BANK_CODES.includes(value.toLowerCase());
        console.log(value.padEnd(30) + String(n).padStart(6) + `   ${isBank ? "1010 Bank" : "1000 Cash"}`);
    }

    console.log("\nCONFIGURED paymentModes (what the picker offers, per org):");
    const byOrg = new Map<string, string[]>();
    for (const d of modes.docs) {
        const x = d.data();
        if (!byOrg.has(x.orgId)) byOrg.set(x.orgId, []);
        byOrg.get(x.orgId)!.push(String(x.name));
    }
    for (const [orgId, names] of byOrg) console.log(`  ${orgId}: ${names.join(", ")}`);

    const expTally = new Map<string, number>();
    for (const d of expenses.docs) {
        const m = String(d.data().paymentMode ?? "(missing)");
        expTally.set(m, (expTally.get(m) || 0) + 1);
    }
    console.log("\nEXPENSE `paymentMode` values (use-expenses maps `cash`→1000, everything else→1010):");
    for (const [value, n] of [...expTally].sort((a, b) => b[1] - a[1])) {
        console.log(
            `  ${value.padEnd(28)} ${String(n).padStart(4)}   → ${value === "cash" ? "1000 Cash" : "1010 Bank"}`
        );
    }

    // How many invoices would break the callables' unguarded `undefined` writes?
    const invoices = await db.collection("invoices").get();
    const missingNumber = invoices.docs.filter((d) => d.data().number === undefined);
    const missingCustomer = invoices.docs.filter((d) => d.data().customerId === undefined);
    const missingCurrency = invoices.docs.filter((d) => d.data().currency === undefined);
    console.log("\nINVOICES MISSING A FIELD THE CALLABLES WRITE UNGUARDED (each one 500s):");
    console.log(`  total invoices           : ${invoices.size}`);
    console.log(`  missing \`number\`         : ${missingNumber.length}`);
    console.log(`  missing \`customerId\`     : ${missingCustomer.length}`);
    console.log(`  missing \`currency\`       : ${missingCurrency.length}`);
    for (const d of [...missingNumber, ...missingCustomer, ...missingCurrency].slice(0, 10)) {
        const x = d.data();
        console.log(
            `    ${d.id} org=${x.orgId} status=${x.status} number=${x.number} customerId=${x.customerId} currency=${x.currency}`
        );
    }
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
