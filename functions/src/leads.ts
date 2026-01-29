import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export const bulkDeleteLeads = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in");
    }

    const { orgId, status, assignedTo, source, searchQuery } = request.data;

    if (!orgId) {
        throw new HttpsError("invalid-argument", "Organization ID is required");
    }

    // Security: Verify user has access to this org
    const tokenOrgId = request.auth.token.orgId;

    // If token has orgId, verify it matches. 
    // If not, fetch user profile to verify (fallback for eventual consistency or missing claims)
    if (tokenOrgId && tokenOrgId !== orgId) {
        throw new HttpsError("permission-denied", "User does not belong to this organization (token mismatch)");
    } else if (!tokenOrgId) {
        // Fallback: Fetch user doc
        const userDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
        if (!userDoc.exists || userDoc.data()?.orgId !== orgId) {
            throw new HttpsError("permission-denied", "User does not belong to this organization");
        }
    }

    const db = admin.firestore();
    let query = db.collection("leads").where("orgId", "==", orgId);

    if (status && status !== "all") query = query.where("status", "==", status);
    if (assignedTo) query = query.where("assignedTo", "==", assignedTo);
    if (source) query = query.where("source", "==", source);

    if (searchQuery) {
        const lower = searchQuery.toLowerCase();
        query = query.where("name_lower", ">=", lower).where("name_lower", "<=", lower + "\uf8ff");
    }

    try {
        // Batch delete
        const snapshot = await query.get();

        if (snapshot.empty) {
            return { success: true, count: 0 };
        }

        const batchSize = 400;
        const batches = [];
        let batch = db.batch();
        let count = 0;
        let totalDeleted = 0;

        for (const doc of snapshot.docs) {
            batch.delete(doc.ref);
            count++;
            totalDeleted++;
            if (count >= batchSize) {
                batches.push(batch.commit());
                batch = db.batch();
                count = 0;
            }
        }
        if (count > 0) batches.push(batch.commit());

        await Promise.all(batches);

        return { success: true, count: totalDeleted };
    } catch (error) {
        console.error("Bulk delete failed:", error);
        throw new HttpsError("internal", "Failed to delete leads");
    }
});
