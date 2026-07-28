/**
 * One-off cleanup: remove the duplicate `staff/{uid}` docs created by the pre-fix
 * user-profile-provider / dashboard-layout code path.
 *
 * BUG SIGNATURE (see components/user-profile-provider.tsx history): on every admin login the
 * client did `setDoc(doc(db,"staff",user.uid), {...})` WITHOUT an `authUid` field — minting a
 * SECOND staff doc for an admin who already had the canonical `staff/{email}` doc (created at
 * signup, which DOES set authUid). The canonical doc is the forgery-resistant source the
 * firestore.rules and usePermissions/set-claims all read via `authUid`. The uid-keyed twin is
 * pure pollution: it shows in the staff list and is invisible to every authUid lookup.
 *
 * DELETE PREDICATE — matched on the bug's exact, unforgeable invariant:
 *   delete a doc IFF (it has NO authUid) AND (its doc id === some keeper's authUid),
 *   where a "keeper" is any staff doc that HAS a non-empty authUid.
 *
 * Why this invariant (and NOT an orgId/email grouping):
 *   - The duplicate's doc id IS the user's auth uid, and the canonical keeper's authUid IS that
 *     same uid. That linkage is exact regardless of orgId/email drift (the orgId/claim-drift
 *     state in MEMORY.md could give a dup orgId == uid, which an (orgId,email) grouping misses).
 *   - It can never delete a legitimate doc: an admin-added, not-yet-logged-in staff row
 *     (created via staff-form.tsx `addDoc`, an auto-id doc with no authUid) has an id that is
 *     NOT any user's authUid, so it is left untouched. A doc that carries authUid is never
 *     deleted. The sole doc for a person is never deleted.
 *
 * Before merging/deleting anything, the full affected pairs (keeper + duplicate) are exported to
 * backups/staff-dedupe-<timestamp>.json so any delete is restorable.
 *
 * Merge: conservative and display-only. firstName/lastName/phone/profileImageUrl/departmentIds
 * are copied from the duplicate into the keeper ONLY where the keeper's value is empty. The
 * authoritative fields the rules/permissions read — authUid, orgId, email, isAdmin, roleId,
 * permissions, status — are NEVER changed on the keeper. If a duplicate carries a non-empty
 * roleId/permissions that DIFFER from the keeper's, that is logged as a warning (not merged),
 * so nothing is silently lost.
 *
 * Scope: the `staff` collection only. Nothing else is read or written.
 *
 * Run (dry-run, writes nothing):   npx tsx scripts/dedupe-staff-docs.ts
 * Execute (after reviewing table):  npx tsx scripts/dedupe-staff-docs.ts --execute
 */
import * as fs from "fs";
import * as path from "path";
import { admin, db, app } from "./_admin";

const EXECUTE = process.argv.includes("--execute");
const EXPECTED_PROJECT = "goalo-6a269";
const MERGE_FIELDS = ["firstName", "lastName", "phone", "profileImageUrl", "departmentIds"] as const;
// Authoritative fields we refuse to touch on the keeper; only warned about if the dup differs.
const AUTHORITATIVE_FIELDS = ["roleId", "permissions", "isAdmin", "status"] as const;

type StaffDoc = { id: string; data: FirebaseFirestore.DocumentData };

function isEmpty(v: unknown): boolean {
    if (v === undefined || v === null) return true;
    if (typeof v === "string") return v.trim() === "";
    if (Array.isArray(v)) return v.length === 0;
    return false;
}
function msOf(ts: unknown): number {
    if (ts && typeof (ts as { toMillis?: () => number }).toMillis === "function") {
        return (ts as { toMillis: () => number }).toMillis();
    }
    return 0;
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

    const snap = await db.collection("staff").get();
    const all: StaffDoc[] = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
    console.log(`Read ${all.length} staff docs.\n`);

    // Index keepers by authUid. If two docs share an authUid (itself anomalous), prefer the
    // email-keyed one, else the most-recently-updated — that is the keeper; the other is NOT
    // auto-deleted here (it still carries authUid) but is reported.
    const keeperByAuthUid = new Map<string, StaffDoc>();
    const authUidCollisions: string[] = [];
    for (const d of all) {
        const au = d.data.authUid;
        if (isEmpty(au) || typeof au !== "string") continue;
        const existing = keeperByAuthUid.get(au);
        if (!existing) {
            keeperByAuthUid.set(au, d);
            continue;
        }
        authUidCollisions.push(au);
        const emailOf = (x: StaffDoc) => (typeof x.data.email === "string" ? x.data.email.toLowerCase() : "");
        const preferred =
            existing.id.toLowerCase() === emailOf(existing)
                ? existing
                : d.id.toLowerCase() === emailOf(d)
                  ? d
                  : msOf(d.data.updatedAt) > msOf(existing.data.updatedAt)
                    ? d
                    : existing;
        keeperByAuthUid.set(au, preferred);
    }

    type Plan = { dup: StaffDoc; keeper: StaffDoc; merges: Record<string, unknown>; warnings: string[] };
    const plans: Plan[] = [];
    const leftAlone: { id: string; reason: string }[] = [];

    for (const d of all) {
        if (!isEmpty(d.data.authUid)) continue; // keepers / authoritative docs are never deleted
        const keeper = keeperByAuthUid.get(d.id); // is this doc's id a real user's authUid?
        if (!keeper) {
            // authUid-less and not any keeper's uid → e.g. an admin-added, not-yet-logged-in
            // staff row (auto-id) or a true orphan. Leave it; never delete.
            leftAlone.push({ id: d.id, reason: "authUid-less, id is no keeper's authUid — left untouched" });
            continue;
        }
        if (keeper.id === d.id) continue; // paranoia: keeper can't be authUid-less, but never self-delete

        const merges: Record<string, unknown> = {};
        for (const f of MERGE_FIELDS) {
            if (isEmpty(keeper.data[f]) && !isEmpty(d.data[f])) merges[f] = d.data[f];
        }
        const warnings: string[] = [];
        for (const f of AUTHORITATIVE_FIELDS) {
            if (!isEmpty(d.data[f]) && JSON.stringify(d.data[f]) !== JSON.stringify(keeper.data[f])) {
                warnings.push(`${f}: dup=${JSON.stringify(d.data[f])} keeper=${JSON.stringify(keeper.data[f])}`);
            }
        }
        plans.push({ dup: d, keeper, merges, warnings });
    }

    // ---- dry-run table ----
    console.log("=== DEDUPE PLAN ===");
    if (plans.length === 0) console.log("(no uid-keyed authUid-less duplicates found)");
    for (const p of plans) {
        console.log(`\norg=${p.keeper.data.orgId}  email=${p.keeper.data.email}`);
        console.log(`  KEEP   ${p.keeper.id}   (authUid=${p.keeper.data.authUid})`);
        console.log(`  DELETE ${p.dup.id}   (authUid=—, orgId=${p.dup.data.orgId})`);
        if (Object.keys(p.merges).length) console.log(`  MERGE→keeper: ${JSON.stringify(p.merges)}`);
        for (const w of p.warnings) console.log(`  ⚠ authoritative-diff (NOT merged): ${w}`);
    }
    console.log(
        `\nStaff docs: ${all.length} · keepers(authUid): ${keeperByAuthUid.size} · to delete: ${plans.length} · left-untouched(authUid-less non-dup): ${leftAlone.length} · authUid-collisions: ${authUidCollisions.length}`
    );
    for (const l of leftAlone) console.log(`  LEAVE ${l.id} — ${l.reason}`);
    for (const au of authUidCollisions) console.log(`  ⚠ multiple docs share authUid ${au} — review manually`);

    if (!EXECUTE) {
        console.log("\nDRY-RUN only. Re-run with --execute to apply.");
        return;
    }
    if (plans.length === 0) {
        console.log("\nNothing to execute.");
        return;
    }

    // ---- backup every affected pair before mutating ----
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupsDir = path.join(process.cwd(), "backups");
    fs.mkdirSync(backupsDir, { recursive: true });
    const backupPath = path.join(backupsDir, `staff-dedupe-${stamp}.json`);
    fs.writeFileSync(
        backupPath,
        JSON.stringify(
            plans.map((p) => ({
                keeper: { id: p.keeper.id, data: p.keeper.data },
                deleted: { id: p.dup.id, data: p.dup.data },
                merges: p.merges,
                warnings: p.warnings,
            })),
            null,
            2
        )
    );
    console.log(`\nBacked up ${plans.length} affected pairs → ${path.relative(process.cwd(), backupPath)}`);

    // ---- apply: merge display fields into keeper, then delete the duplicate ----
    let merged = 0;
    let deleted = 0;
    for (const p of plans) {
        if (Object.keys(p.merges).length) {
            await db
                .collection("staff")
                .doc(p.keeper.id)
                .set({ ...p.merges, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
            merged++;
        }
        await db.collection("staff").doc(p.dup.id).delete();
        deleted++;
    }
    console.log(`\nEXECUTED: merged ${merged} keeper(s), deleted ${deleted} duplicate(s).`);
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
