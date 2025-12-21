import { adminDb } from "@/lib/firebase-admin";

export type QuotaResource = "staff" | "invoices" | "estimates" | "clients" | "contacts" | "projects" | "tasks" | "leads";

/**
 * Checks if an organization has reached its quota for a specific resource.
 * @param orgId The organization ID
 * @param resource The resource type to check (e.g. "staff")
 * @returns {Promise<{ allowed: boolean; limit: number; current: number; error?: string }>}
 */
export async function checkQuota(orgId: string, resource: QuotaResource) {
    try {
        // 1. Get Active Subscription to find limits
        const subDoc = await adminDb.collection("subscriptions").doc(orgId).get();
        if (!subDoc.exists) {
            // No subscription? Default to Free/Trial strict limits or fail
            // For now, let's assume no subscription = Allow strict default (e.g. 1 user) or Block
            // Better to block if this is a paid SaaS
            return { allowed: false, limit: 0, current: 0, error: "No active subscription found" };
        }

        const subData = subDoc.data();
        if (subData?.status !== "active" && subData?.status !== "trial") {
            return { allowed: false, limit: 0, current: 0, error: "Subscription is not active" };
        }

        // quotas stored in subscription doc for speed/snapshotting
        const quotas = subData?.quotas || {};
        const limit = quotas[resource];

        // -1 means unlimited
        if (limit === -1) {
            return { allowed: true, limit: -1, current: 0 };
        }

        if (limit === undefined) {
            // Config error or resource not strictly limited? 
            // Assume blocked to be safe, or unlimited?
            // Going with: if not defined, it's 0 (blocked) unless explicitly -1
            return { allowed: false, limit: 0, current: 0, error: `Quota not defined for ${resource}` };
        }

        // 2. Get Current Usage
        // This depends on how data is stored.
        // Option A: Counter in org doc (fastest)
        // Option B: Count collection (slow/expensive)
        // Option C: Count aggregation (Med)

        let current = 0;

        // MAPPING RESOURCES TO COLLECTIONS
        const collectionMap: Record<QuotaResource, string> = {
            staff: "staff", // collection "staff" where orgId == orgId
            invoices: "invoices",
            estimates: "estimates",
            clients: "customers", // "clients" in UI -> "customers" in DB
            contacts: "contacts",
            projects: "projects",
            tasks: "tasks",
            leads: "leads"
        };

        const collectionName = collectionMap[resource];

        if (collectionName) {
            const snapshot = await adminDb.collection(collectionName)
                .where("orgId", "==", orgId)
                .count()
                .get();
            current = snapshot.data().count;
        }

        // 3. Compare
        if (current >= limit) {
            return { allowed: false, limit, current, error: `${resource} limit reached (${current}/${limit})` };
        }

        return { allowed: true, limit, current };

    } catch (error) {
        console.error("Check Quota Error:", error);
        // Fail open or closed? Closed (secure)
        return { allowed: false, limit: 0, current: 0, error: "Failed to check quota" };
    }
}
