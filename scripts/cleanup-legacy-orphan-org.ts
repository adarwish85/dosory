/**
 * Cleanup for the legacy orphan pair identified in TEST-REPORT-2026-07-28.md §4:
 *   staff/uI7Ufzr4bXZLYQXLpfruSEXPKAI2            (uid-keyed, authUid-less, Ahmed's gmail account)
 *   organizations/org_uI7Ufz..._1765902729459     (legacy-format org from the old signup flow)
 *
 * 2026-07-28: the approved two-doc deletion was DRY-RUN'd and then ABORTED by this script's
 * own pre-flight, which found the §4 premise incomplete:
 *   1. users/{uid}.orgId of Ahmed's LIVE superadmin account still points at the legacy org
 *      (claims are pure {isSuperAdmin, PlatformAdmin} — no tenant orgId — but the profile doc
 *      routes the tenant-dashboard view through this org). Deleting the org would leave the
 *      profile dangling: "login unaffected" cannot be certified.
 *   2. The org is NOT empty at the root level: subscriptions/{orgId} + 6 seeded docs
 *      (currencies 1, taxes 1, paymentModes 2, emailTemplates 2 — from the A2/A3 backfill)
 *      carry its orgId and would be orphaned by a two-doc deletion.
 *
 * Modes:
 *   npx tsx scripts/cleanup-legacy-orphan-org.ts                       # dry-run, prints plan
 *   npx tsx scripts/cleanup-legacy-orphan-org.ts --execute             # two-doc scope; REFUSES
 *                                                                      # while the account still
 *                                                                      # routes through the org
 *   npx tsx scripts/cleanup-legacy-orphan-org.ts --execute --full-scope
 *     Corrected full cleanup (REQUIRES Ahmed's separate approval — see report §"orphan
 *     cleanup blocked"): clears users/{uid}.orgId (SA account's access is via claims; the
 *     field is legacy), then deletes the staff doc, the org doc recursively, and the 7
 *     root-collection strays carrying the legacy orgId. Everything exported to backups/ first.
 */
import * as fs from "fs";
import * as path from "path";
import { db, auth, app } from "./_admin";

const STAFF_ID = "uI7Ufzr4bXZLYQXLpfruSEXPKAI2";
const ORG_ID = "org_uI7Ufzr4bXZLYQXLpfruSEXPKAI2_1765902729459";
const EXECUTE = process.argv.includes("--execute");
const FULL_SCOPE = process.argv.includes("--full-scope");
const EXPECTED_PROJECT = "goalo-6a269";
const STRAY_COLLECTIONS = ["currencies", "taxes", "paymentModes", "emailTemplates"];

const ser = (d: FirebaseFirestore.DocumentData) => {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(d))
        o[k] =
            v && typeof (v as { toDate?: () => Date }).toDate === "function"
                ? (v as { toDate: () => Date }).toDate().toISOString()
                : v;
    return o;
};

async function main() {
    const projectId =
        (app.options as { projectId?: string }).projectId ||
        (app.options.credential as unknown as { projectId?: string })?.projectId;
    if (projectId && projectId !== EXPECTED_PROJECT) throw new Error(`wrong project ${projectId}`);
    console.log(
        `Project: ${projectId} · mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}${FULL_SCOPE ? " · FULL-SCOPE" : " · two-doc scope"}\n`
    );

    // ---- pre-flight reads ----
    const staffSnap = await db.collection("staff").doc(STAFF_ID).get();
    const orgRef = db.collection("organizations").doc(ORG_ID);
    const orgSnap = await orgRef.get();
    console.log(`staff/${STAFF_ID} exists: ${staffSnap.exists}`);
    console.log(`organizations/${ORG_ID} exists: ${orgSnap.exists}`);
    if (!staffSnap.exists && !orgSnap.exists) {
        console.log("nothing to do");
        return;
    }

    // guard: staff doc must still match the §4 fingerprint (email + no authUid)
    const sd = staffSnap.exists ? staffSnap.data()! : null;
    if (sd && (sd.email !== "ahmeddarwesh@gmail.com" || !!sd.authUid)) {
        throw new Error("staff doc no longer matches the approved fingerprint — aborting");
    }

    const subcolls = orgSnap.exists ? await orgRef.listCollections() : [];
    const subcollDump: Record<string, { id: string; data: Record<string, unknown> }[]> = {};
    for (const c of subcolls) {
        const docs = await c.get();
        subcollDump[c.id] = docs.docs.map((x) => ({ id: x.id, data: ser(x.data()) }));
    }

    // the live account: does its login route through these docs?
    const user = await auth.getUser(STAFF_ID).catch(() => null);
    const claims = user?.customClaims || {};
    const usersRef = db.collection("users").doc(STAFF_ID);
    const usersDoc = await usersRef.get();
    const usersOrgId = usersDoc.exists ? usersDoc.data()!.orgId : undefined;
    console.log(
        `\nauth user ${user?.email}: claims=${JSON.stringify(claims)} users-doc orgId=${JSON.stringify(usersOrgId)}`
    );
    const routesThroughLegacy = claims.orgId === ORG_ID || usersOrgId === ORG_ID;
    console.log(
        routesThroughLegacy
            ? "⚠️  account ROUTES THROUGH the legacy org (users-doc and/or claims)"
            : "account does NOT route through the legacy org"
    );

    // root-collection strays carrying the legacy orgId
    const strays: { coll: string; id: string; data: Record<string, unknown> }[] = [];
    const subSnap = await db.collection("subscriptions").doc(ORG_ID).get();
    if (subSnap.exists) strays.push({ coll: "subscriptions", id: ORG_ID, data: ser(subSnap.data()!) });
    for (const coll of STRAY_COLLECTIONS) {
        const s = await db.collection(coll).where("orgId", "==", ORG_ID).get();
        for (const d of s.docs) strays.push({ coll, id: d.id, data: ser(d.data()) });
    }
    console.log(
        `root-collection strays carrying legacy orgId: ${strays.length ? strays.map((s) => `${s.coll}/${s.id}`).join(", ") : "none"}`
    );

    // ---- plan ----
    console.log(`\n=== DELETION PLAN (${FULL_SCOPE ? "full scope" : "approved two-doc scope"}) ===`);
    if (FULL_SCOPE && usersOrgId === ORG_ID)
        console.log(`  UPDATE users/${STAFF_ID}: remove legacy orgId field (SA access is claims-based)`);
    if (staffSnap.exists) console.log(`  DELETE staff/${STAFF_ID}`);
    if (orgSnap.exists) {
        console.log(`  DELETE organizations/${ORG_ID} (recursive)`);
        for (const [cid, docs] of Object.entries(subcollDump))
            for (const d of docs) console.log(`    └─ ${cid}/${d.id}`);
    }
    if (FULL_SCOPE) for (const s of strays) console.log(`  DELETE ${s.coll}/${s.id}`);
    else if (strays.length)
        console.log(`  (NOT deleting ${strays.length} root strays — outside approved scope; use --full-scope)`);

    if (!EXECUTE) {
        console.log("\nDRY-RUN only. Re-run with --execute.");
        return;
    }
    if (!FULL_SCOPE && routesThroughLegacy) {
        throw new Error(
            "Refusing two-doc execution: the live account still routes through the legacy org and " +
                "root strays would be orphaned. Full cleanup (--full-scope) needs Ahmed's separate approval."
        );
    }

    // ---- backup ----
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fs.mkdirSync("backups", { recursive: true });
    const backupPath = path.join("backups", `orphan-cleanup-${stamp}.json`);
    fs.writeFileSync(
        backupPath,
        JSON.stringify(
            {
                staff: staffSnap.exists ? { id: STAFF_ID, data: ser(staffSnap.data()!) } : null,
                organization: orgSnap.exists ? { id: ORG_ID, data: ser(orgSnap.data()!) } : null,
                orgSubcollections: subcollDump,
                rootStrays: strays,
                accountState: { uid: STAFF_ID, email: user?.email, claims, usersDocOrgId: usersOrgId },
            },
            null,
            2
        )
    );
    console.log(`\nBacked up → ${backupPath}`);

    // ---- execute ----
    if (FULL_SCOPE && usersOrgId === ORG_ID) {
        const { FieldValue } = await import("firebase-admin/firestore");
        await usersRef.update({ orgId: FieldValue.delete() });
        console.log(`updated users/${STAFF_ID}: legacy orgId removed`);
    }
    if (orgSnap.exists) {
        await db.recursiveDelete(orgRef);
        console.log(
            `deleted organizations/${ORG_ID} (+${Object.values(subcollDump).reduce((n, d) => n + d.length, 0)} subcollection docs)`
        );
    }
    if (staffSnap.exists) {
        await db.collection("staff").doc(STAFF_ID).delete();
        console.log(`deleted staff/${STAFF_ID}`);
    }
    if (FULL_SCOPE) {
        for (const s of strays) {
            await db.collection(s.coll).doc(s.id).delete();
            console.log(`deleted ${s.coll}/${s.id}`);
        }
    }

    // ---- post-verify ----
    const s2 = await db.collection("staff").doc(STAFF_ID).get();
    const o2 = await orgRef.get();
    const u2 = await auth.getUser(STAFF_ID).catch(() => null);
    const ud2 = await usersRef.get();
    console.log(`\nVERIFY: staff gone=${!s2.exists} org gone=${!o2.exists}`);
    console.log(
        `VERIFY: auth account intact=${!!u2} (email=${u2?.email}, disabled=${u2?.disabled}, ` +
            `claims unchanged=${JSON.stringify(u2?.customClaims || {}) === JSON.stringify(claims)}, ` +
            `users-doc orgId now=${JSON.stringify(ud2.exists ? ud2.data()!.orgId : undefined)})`
    );
}
main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e.message || e);
        process.exit(1);
    });
