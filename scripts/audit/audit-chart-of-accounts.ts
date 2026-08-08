/**
 * READ-ONLY audit of the ledger `accounts` collection across every org.
 *
 * Context: lib/hooks/use-finance.ts lazy-seeds a default chart of accounts from the CLIENT
 * with addDoc() auto-IDs and no idempotency guard. Two tabs, or one slow first paint, could
 * race and seed the chart twice. Before adding the accounts(orgId, code) index — which will
 * make any duplicates visible in the UI — we need to know exactly what is in prod.
 *
 * Writes NOTHING. Run: npx tsx scripts/audit/audit-chart-of-accounts.ts
 */
import * as fs from "fs";
import * as path from "path";
import { db, admin } from "../_admin";

type AccountRow = {
    id: string;
    orgId?: string;
    code?: string;
    name?: string;
    type?: string;
    isSystem?: boolean;
    balance?: number;
    createdAt?: string;
};

async function main() {
    const projectId = (admin.app().options.credential as { projectId?: string })?.projectId;
    if (projectId && projectId !== "goalo-6a269") throw new Error(`wrong project: ${projectId}`);
    console.log(`project: ${projectId}\n`);

    const [accountsSnap, jeSnap, orgsSnap] = await Promise.all([
        db.collection("accounts").get(),
        db.collection("journal_entries").get(),
        db.collection("organizations").get(),
    ]);

    console.log(`accounts: ${accountsSnap.size}   journal_entries: ${jeSnap.size}   organizations: ${orgsSnap.size}\n`);

    // accountId -> number of journal LINES referencing it (across all entries)
    const postingsByAccount = new Map<string, number>();
    const entriesByAccount = new Map<string, Set<string>>();
    for (const je of jeSnap.docs) {
        const lines = (je.data().lines || []) as { accountId?: string }[];
        for (const l of lines) {
            if (!l?.accountId) continue;
            postingsByAccount.set(l.accountId, (postingsByAccount.get(l.accountId) || 0) + 1);
            if (!entriesByAccount.has(l.accountId)) entriesByAccount.set(l.accountId, new Set());
            entriesByAccount.get(l.accountId)!.add(je.id);
        }
    }

    const byOrg = new Map<string, AccountRow[]>();
    for (const d of accountsSnap.docs) {
        const x = d.data();
        const row: AccountRow = {
            id: d.id,
            orgId: x.orgId,
            code: x.code,
            name: x.name,
            type: x.type,
            isSystem: x.isSystem,
            balance: x.balance,
            createdAt: x.createdAt?.toDate?.()?.toISOString?.(),
        };
        const key = x.orgId || "(no orgId)";
        if (!byOrg.has(key)) byOrg.set(key, []);
        byOrg.get(key)!.push(row);
    }

    const orgNames = new Map(orgsSnap.docs.map((d) => [d.id, d.data().name || "(unnamed)"]));
    const conflicts: { orgId: string; code: string; ids: string[]; postings: number }[] = [];
    let totalDupGroups = 0;

    console.log("=".repeat(78));
    console.log("PER-ORG INVENTORY");
    console.log("=".repeat(78));

    const orgsWithNoAccounts = [...orgsSnap.docs.map((d) => d.id)].filter((id) => !byOrg.has(id));

    for (const [orgId, rows] of [...byOrg.entries()].sort()) {
        const byCode = new Map<string, AccountRow[]>();
        for (const r of rows) {
            const c = r.code ?? "(no code)";
            if (!byCode.has(c)) byCode.set(c, []);
            byCode.get(c)!.push(r);
        }
        const dupCodes = [...byCode.entries()].filter(([, v]) => v.length > 1);
        totalDupGroups += dupCodes.length;

        console.log(`\norg ${orgId}  (${orgNames.get(orgId) ?? "NOT AN ORG DOC"})`);
        console.log(
            `  accounts: ${rows.length}   distinct codes: ${byCode.size}   duplicate-code groups: ${dupCodes.length}`
        );

        for (const [code, group] of dupCodes) {
            const withPostings = group.filter((g) => (postingsByAccount.get(g.id) || 0) > 0);
            console.log(`    DUP code ${code} × ${group.length}`);
            for (const g of group) {
                const n = postingsByAccount.get(g.id) || 0;
                console.log(
                    `       ${g.id}  name=${JSON.stringify(g.name)} bal=${g.balance ?? "?"} postings=${n}` +
                        `${n > 0 ? "  <-- HAS JOURNAL LINES" : ""}  created=${g.createdAt ?? "?"}`
                );
            }
            if (withPostings.length > 0) {
                conflicts.push({
                    orgId,
                    code,
                    ids: group.map((g) => g.id),
                    postings: withPostings.reduce((s, g) => s + (postingsByAccount.get(g.id) || 0), 0),
                });
            }
        }
    }

    console.log(`\norgs with ZERO accounts: ${orgsWithNoAccounts.length}`);
    orgsWithNoAccounts.forEach((id) => console.log(`   ${id}  (${orgNames.get(id)})`));

    console.log("\n" + "=".repeat(78));
    console.log("VERDICT");
    console.log("=".repeat(78));
    console.log(`duplicate-code groups across all orgs : ${totalDupGroups}`);
    console.log(`groups where a duplicate HAS postings : ${conflicts.length}  <-- these BLOCK auto-dedupe`);
    for (const c of conflicts)
        console.log(`   org ${c.orgId} code ${c.code}: ${c.postings} journal lines across ${c.ids.length} accounts`);

    // Orphan check: journal lines pointing at accounts that do not exist.
    const accountIds = new Set(accountsSnap.docs.map((d) => d.id));
    const orphanAccountIds = [...postingsByAccount.keys()].filter((id) => !accountIds.has(id));
    console.log(`\njournal lines referencing MISSING accounts: ${orphanAccountIds.length}`);
    orphanAccountIds.slice(0, 10).forEach((id) => console.log(`   ${id} (${postingsByAccount.get(id)} lines)`));

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fs.mkdirSync("backups", { recursive: true });
    const out = path.join("backups", `accounts-audit-${stamp}.json`);
    fs.writeFileSync(
        out,
        JSON.stringify(
            {
                generatedAt: stamp,
                projectId,
                counts: { accounts: accountsSnap.size, journalEntries: jeSnap.size, organizations: orgsSnap.size },
                byOrg: Object.fromEntries([...byOrg.entries()].map(([k, v]) => [k, v])),
                postingsByAccount: Object.fromEntries(postingsByAccount),
                conflicts,
                orgsWithNoAccounts,
            },
            null,
            2
        )
    );
    console.log(`\nfull snapshot written to ${out} (this doubles as the pre-change backup)`);
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
