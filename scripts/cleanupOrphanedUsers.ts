#!/usr/bin/env npx tsx
/**
 * Cleanup Orphaned Users Script
 *
 * This script finds users whose organizations no longer exist and clears
 * their Firebase Auth custom claims (orgId, role) to prevent access.
 *
 * Usage:
 *   npx tsx scripts/cleanupOrphanedUsers.ts [--dry-run]
 *
 * Options:
 *   --dry-run  Preview what would be cleaned up without making changes
 *
 * Requirements:
 *   - FIREBASE_SERVICE_ACCOUNT_KEY env var (JSON contents of a Firebase service-account key)
 */

import { admin, db, auth } from "./_admin";

async function main() {
    const isDryRun = process.argv.includes("--dry-run");

    if (isDryRun) {
        console.log("🔍 DRY RUN MODE - No changes will be made\n");
    }

    console.log("📊 Fetching all organizations...");
    const orgsSnap = await db.collection("organizations").get();
    const validOrgIds = new Set(orgsSnap.docs.map((d) => d.id));
    console.log(`   Found ${validOrgIds.size} valid organization(s)\n`);

    console.log("📊 Fetching all users...");
    const usersSnap = await db.collection("users").get();
    console.log(`   Found ${usersSnap.size} user(s)\n`);

    const orphanedUsers: Array<{ id: string; email: string; orgId: string }> = [];

    for (const userDoc of usersSnap.docs) {
        const data = userDoc.data();
        const orgId = data.orgId;

        // Skip users without orgId or super admins
        if (!orgId || data.isSuperAdmin === true || data.role === "superadmin") {
            continue;
        }

        // Check if organization exists
        if (!validOrgIds.has(orgId)) {
            orphanedUsers.push({
                id: userDoc.id,
                email: data.email || "unknown",
                orgId,
            });
        }
    }

    if (orphanedUsers.length === 0) {
        console.log("✅ No orphaned users found!");
        process.exit(0);
    }

    console.log(`⚠️  Found ${orphanedUsers.length} orphaned user(s):\n`);
    orphanedUsers.forEach((u, i) => {
        console.log(`   ${i + 1}. ${u.email} (${u.id})`);
        console.log(`      Previous Org: ${u.orgId}`);
    });
    console.log("");

    if (isDryRun) {
        console.log("🔍 DRY RUN complete. Run without --dry-run to apply changes.");
        process.exit(0);
    }

    console.log("🔧 Cleaning up orphaned users...\n");

    let successCount = 0;
    let errorCount = 0;

    for (const user of orphanedUsers) {
        try {
            // Clear Firebase Auth claims
            try {
                const authUser = await auth.getUser(user.id);
                const existingClaims = authUser.customClaims || {};
                await auth.setCustomUserClaims(user.id, {
                    ...existingClaims,
                    orgId: null,
                    role: null,
                });
            } catch (e: unknown) {
                const error = e as { code?: string };
                if (error.code !== "auth/user-not-found") {
                    throw e;
                }
                // User doesn't exist in Auth, just update Firestore
            }

            // Update Firestore document
            await db.collection("users").doc(user.id).update({
                orgId: admin.firestore.FieldValue.delete(),
                role: admin.firestore.FieldValue.delete(),
                status: "orphaned",
                previousOrgId: user.orgId,
                orphanedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`   ✅ Cleaned: ${user.email}`);
            successCount++;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`   ❌ Failed: ${user.email} - ${message}`);
            errorCount++;
        }
    }

    console.log("");
    console.log("📊 Summary:");
    console.log(`   ✅ Cleaned: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log("");
    console.log("⚠️  IMPORTANT: Affected users will need to re-authenticate");
    console.log("   or will be redirected to create/join an organization.");
}

main().catch(console.error);
