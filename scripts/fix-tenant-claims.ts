#!/usr/bin/env npx tsx
import { db, auth } from "./_admin";

async function fixTenantClaims() {
    console.log("🔍 Scanning users in Firestore to backfill Custom Claims...");

    // Get all users
    const usersSnapshot = await db.collection("users").get();

    if (usersSnapshot.empty) {
        console.log("No users found.");
        return;
    }

    console.log(`Found ${usersSnapshot.size} user documents.`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const doc of usersSnapshot.docs) {
        const userData = doc.data();
        const uid = doc.id;

        // Skip if missing critical info
        if (!userData.orgId) {
            console.warn(`Skipping user ${uid}: No orgId found.`);
            continue;
        }

        const orgId = userData.orgId;
        const role = userData.role || "staff"; // Default to staff if missing

        try {
            // Check existing claims to avoid redundant writes? (optional)
            // But for backfill, we force update

            await auth.setCustomUserClaims(uid, {
                orgId,
                role,
            });

            console.log(`✅ Updated claims for ${userData.email || uid}: orgId=${orgId}, role=${role}`);
            updatedCount++;
        } catch (error: unknown) {
            console.error(`❌ Failed to set claims for ${uid}:`, error);
            errorCount++;
        }
    }

    console.log("--------------------------------------------------");
    console.log("Process Complete.");
    console.log(`Updated: ${updatedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log("⚠️  Users must refresh their ID token (logout/login) to see changes.");
}

// Run
fixTenantClaims().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
