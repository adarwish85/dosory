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
 *   - FIREBASE_SERVICE_ACCOUNT_KEY env var or service-account.json in project root
 */

import * as admin from "firebase-admin";
import * as path from "path";
import * as fs from "fs";

async function main() {
    const isDryRun = process.argv.includes("--dry-run");

    if (isDryRun) {
        console.log("🔍 DRY RUN MODE - No changes will be made\n");
    }

    // Initialize Firebase Admin SDK
    try {
        let serviceAccount: admin.ServiceAccount | undefined;

        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            try {
                serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            } catch {
                const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
                if (fs.existsSync(keyPath)) {
                    serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
                }
            }
        }

        if (!serviceAccount) {
            const defaultPath = path.join(process.cwd(), "service-account.json");
            if (fs.existsSync(defaultPath)) {
                serviceAccount = JSON.parse(fs.readFileSync(defaultPath, "utf8"));
            }
        }

        if (!serviceAccount) {
            console.error("Firebase service account not found.");
            console.error(
                "Please set FIREBASE_SERVICE_ACCOUNT_KEY env var or place service-account.json in project root."
            );
            process.exit(1);
        }

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        }
    } catch (error) {
        console.error("Failed to initialize Firebase Admin SDK:", error);
        process.exit(1);
    }

    const db = admin.firestore();
    const auth = admin.auth();

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
