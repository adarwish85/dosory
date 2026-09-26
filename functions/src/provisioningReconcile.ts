import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Resend } from "resend";

// Lazy, matching emailNotifications.ts: `new Resend(undefined)` throws at module scope, which
// would take the whole functions bundle down on cold start when the key is absent.
let _resend: Resend | null = null;
const getResend = (): Resend =>
    (_resend ??= new Resend(functions.config().resend?.api_key || process.env.RESEND_API_KEY));

/**
 * Where the report goes. Cloud Logging alone is not a signal — nobody opens it on a good day,
 * which is precisely the day this needs to be readable. The daily email means a green "0" is
 * seen as often as a red "3", so silence never has to be interpreted.
 */
const REPORT_TO = process.env.OPS_REPORT_EMAIL || "";

if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();

/**
 * Daily reconciliation: which organizations have no subscription document?
 *
 * REPORT ONLY. It never writes, never repairs, and never creates a subscription. That is a
 * deliberate constraint, not an unfinished feature.
 *
 * WHY REPORT-ONLY. On 2026-09-26 three orgs were found in this state — chicago, fareedmagdy and
 * saad99. An auto-repair would have "fixed" all three by minting a fresh 14-day trial on each.
 * All three turned out to be dead shells: no Firebase Auth user at all, zero documents of every
 * kind, an expired trial from June. Repairing them would have fabricated trials nobody asked
 * for, on accounts nobody can sign into, and hidden the signup defect that produced them. The
 * only correct action for those three was to leave them alone — which a sweep that repairs
 * cannot ever choose.
 *
 * So this answers a question and stops. A human decides.
 *
 * WHAT IT REPORTS, and why each field is here: the point is to tell a real CUSTOMER from a dead
 * SHELL at a glance, because those need opposite responses.
 *
 *   orgId, name, subdomain   which tenant
 *   createdAt                how long it has been broken
 *   status                   `pending_verification` means the signup never completed
 *   ownerId / ownerEmail     who to contact, if anyone
 *   authUserExists           THE decisive field. No auth user = nobody can sign in = a shell,
 *                            not a customer. All three found so far were false.
 *   lastSignInTime           a customer who has signed in is a customer
 *   documentCounts           staff/customers/leads/invoices/projects/tasks. All zero means the
 *                            tenant has never been used; anything non-zero means real work is
 *                            blocked and it is urgent.
 *   verdict                  LIKELY_SHELL | LIKELY_CUSTOMER | NEEDS_REVIEW, derived below —
 *                            a suggestion to speed triage, never an instruction.
 */

const COUNTED_COLLECTIONS = ["staff", "customers", "leads", "invoices", "projects", "tasks"];

interface OrphanReport {
    orgId: string;
    name: string;
    subdomain: string;
    createdAt: string | null;
    status: string;
    ownerId: string;
    ownerEmail: string | null;
    authUserExists: boolean;
    lastSignInTime: string | null;
    documentCounts: Record<string, number>;
    totalDocuments: number;
    verdict: "LIKELY_SHELL" | "LIKELY_CUSTOMER" | "NEEDS_REVIEW";
}

export const provisioningReconcile = functions.pubsub
    .schedule("30 2 * * *")
    .timeZone("UTC")
    .onRun(async () => {
        console.log("[provisioning-reconcile] starting daily orphan sweep (READ ONLY)");

        const orgs = await db.collection("organizations").get();
        const orphans: OrphanReport[] = [];

        for (const orgDoc of orgs.docs) {
            const orgId = orgDoc.id;

            const sub = await db.collection("subscriptions").doc(orgId).get();
            if (sub.exists) continue; // healthy — the whole point of the sweep

            const org = orgDoc.data() || {};
            const ownerId = String(org.ownerId || "");

            // The decisive signal. An org whose owner has no auth record cannot be signed into
            // by anybody, which is what separates an abandoned signup from a broken customer.
            let authUserExists = false;
            let ownerEmail: string | null = null;
            let lastSignInTime: string | null = null;
            if (ownerId) {
                try {
                    const rec = await admin.auth().getUser(ownerId);
                    authUserExists = true;
                    ownerEmail = rec.email || null;
                    lastSignInTime = rec.metadata.lastSignInTime || null;
                } catch {
                    authUserExists = false; // no such user — expected for shells
                }
            }

            const documentCounts: Record<string, number> = {};
            let totalDocuments = 0;
            for (const coll of COUNTED_COLLECTIONS) {
                const snap = await db.collection(coll).where("orgId", "==", orgId).count().get();
                const n = snap.data().count;
                documentCounts[coll] = n;
                totalDocuments += n;
            }

            // A suggestion for triage, never an instruction — the sweep does not act on it.
            let verdict: OrphanReport["verdict"] = "NEEDS_REVIEW";
            if (!authUserExists && totalDocuments === 0) verdict = "LIKELY_SHELL";
            else if (authUserExists && totalDocuments > 0) verdict = "LIKELY_CUSTOMER";

            orphans.push({
                orgId,
                name: String(org.name || ""),
                subdomain: String(org.subdomain || ""),
                createdAt: org.createdAt?.toDate ? org.createdAt.toDate().toISOString() : null,
                status: String(org.status || ""),
                ownerId,
                ownerEmail,
                authUserExists,
                lastSignInTime,
                documentCounts,
                totalDocuments,
                verdict,
            });
        }

        // ALWAYS report the count, including zero. A report that only arrives when something
        // is wrong trains its reader to treat absence as "fine", which is indistinguishable
        // from the job being broken, unscheduled, or silently erroring.
        const customers = orphans.filter((o) => o.verdict !== "LIKELY_SHELL");
        const shells = orphans.filter((o) => o.verdict === "LIKELY_SHELL");
        const headline =
            orphans.length === 0
                ? `OK — all ${orgs.size} organizations have a subscription document.`
                : `${orphans.length} of ${orgs.size} organizations have NO subscription document ` +
                  `(${customers.length} showing real use, ${shells.length} likely shells).`;

        if (customers.length) {
            functions.logger.error(`[provisioning-reconcile] ${headline}`, { orphans: customers });
        } else if (shells.length) {
            functions.logger.warn(`[provisioning-reconcile] ${headline}`, { orphans: shells });
        } else {
            functions.logger.info(`[provisioning-reconcile] ${headline}`);
        }

        await emailReport(headline, orphans, orgs.size);

        console.log(`[provisioning-reconcile] done. ${headline} NOTHING WAS WRITTEN.`);
        return null;
    });

/**
 * Daily digest to whoever owns this platform. Deliberately sent on a clean run too.
 *
 * Never throws: a reporting failure must not fail the sweep, or the only thing anyone learns is
 * that the job is red — without learning what it found.
 */
async function emailReport(headline: string, orphans: OrphanReport[], totalOrgs: number): Promise<void> {
    if (!REPORT_TO) {
        console.warn("[provisioning-reconcile] OPS_REPORT_EMAIL is not set — Cloud Logging only, which nobody reads.");
        return;
    }

    const clean = orphans.length === 0;
    const rows = orphans
        .map(
            (o) => `<tr>
                <td>${o.verdict === "LIKELY_SHELL" ? "shell?" : "<b>NEEDS ATTENTION</b>"}</td>
                <td>${o.orgId}</td><td>${o.name || "-"}</td>
                <td>${o.createdAt?.slice(0, 10) || "-"}</td><td>${o.status || "-"}</td>
                <td>${o.ownerEmail || "-"}</td>
                <td>${o.authUserExists ? "yes" : "<b>NO</b>"}</td>
                <td>${o.lastSignInTime?.slice(0, 16) || "never"}</td>
                <td>${o.totalDocuments}</td>
            </tr>`
        )
        .join("");

    const html = clean
        ? `<p><b>Provisioning check: clean.</b></p><p>${headline}</p>
           <p style="color:#666">Sent daily whether or not anything is wrong, so a quiet inbox
           means "checked and fine" rather than "possibly not running".</p>`
        : `<p><b>Provisioning check: ${orphans.length} org(s) without a subscription.</b></p>
           <p>${headline} These tenants cannot save anything — every write path returns
           "No subscription found".</p>
           <table border="1" cellpadding="6" cellspacing="0">
             <tr><th>verdict</th><th>orgId</th><th>name</th><th>created</th><th>status</th>
                 <th>owner</th><th>auth user?</th><th>last sign-in</th><th>docs</th></tr>
             ${rows}
           </table>
           <p style="color:#666"><b>auth user = NO and docs = 0</b> is almost certainly signup
           debris, not a customer. This sweep never repairs anything: on 2026-09-26 an
           auto-repair would have minted fresh trials on three dead shells and hidden the signup
           defect that produced them.</p>`;

    try {
        await getResend().emails.send({
            from: process.env.RESEND_FROM_EMAIL || "Dosory <noreply@dosory.com>",
            to: REPORT_TO,
            subject: clean
                ? `Dosory provisioning check: clean (${totalOrgs} orgs)`
                : `Dosory provisioning check: ${orphans.length} org(s) WITHOUT a subscription`,
            html,
        });
    } catch (error) {
        console.error("[provisioning-reconcile] report email failed — falling back to logs only:", error);
    }
}
