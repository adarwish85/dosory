import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

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

        if (orphans.length === 0) {
            console.log(`[provisioning-reconcile] OK — all ${orgs.size} organizations have a subscription document.`);
            return null;
        }

        // Logged at ERROR severity for the ones that matter so they surface in alerting rather
        // than scrolling past in an info stream; shells stay at WARNING.
        const customers = orphans.filter((o) => o.verdict !== "LIKELY_SHELL");
        const shells = orphans.filter((o) => o.verdict === "LIKELY_SHELL");

        if (customers.length) {
            functions.logger.error(
                `[provisioning-reconcile] ${customers.length} org(s) with NO subscription and signs of real use — ` +
                    "every write path returns 'No subscription found' for these tenants.",
                { orphans: customers }
            );
        }
        if (shells.length) {
            functions.logger.warn(
                `[provisioning-reconcile] ${shells.length} likely-abandoned org(s) with no subscription, no auth user ` +
                    "and no documents. Probably signup debris — confirm before deleting, and do NOT auto-provision.",
                { orphans: shells }
            );
        }

        console.log(
            `[provisioning-reconcile] done. ${orgs.size} orgs scanned, ${orphans.length} without a subscription ` +
                `(${customers.length} need attention, ${shells.length} likely shells). NOTHING WAS WRITTEN.`
        );
        return null;
    });
