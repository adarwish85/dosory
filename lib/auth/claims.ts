import { adminAuth } from "@/lib/firebase-admin";

export async function setTenantClaims(uid: string, orgId: string, role: string) {
    try {
        await adminAuth.setCustomUserClaims(uid, {
            orgId,
            role,
            // Add a timestamp to force client token refresh detection if needed
            updatedAt: Date.now(),
        });
        console.log(`✅ Set claims for ${uid}: orgId=${orgId}, role=${role}`);
    } catch (error) {
        console.error(`❌ Failed to set claims for ${uid}:`, error);
        throw error;
    }
}
