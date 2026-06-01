/**
 * Database Cleanup Script
 *
 * Deletes all tenant data while preserving:
 * - Super admin users (role === 'superadmin')
 * - Billing plans (billingPlans collection)
 * - Billing addons (billingAddons collection)
 *
 * Run with: npx tsx scripts/cleanup-database.ts
 */

import * as fs from "fs";
import * as path from "path";

// Load .env.local manually
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match && !process.env[match[1]]) {
            process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
        }
    });
}

import * as admin from "firebase-admin";

// Initialize Firebase Admin
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!admin.apps.length) {
    if (serviceAccountKey) {
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(serviceAccountKey)),
        });
    } else {
        // Try default credentials
        admin.initializeApp();
    }
}

const db = admin.firestore();

// Collections to completely clear (all documents)
const COLLECTIONS_TO_CLEAR = [
    "customers",
    "contacts",
    "leads",
    "invoices",
    "estimates",
    "payments",
    "expenses",
    "projects",
    "tasks",
    "tickets",
    "contracts",
    "activities",
    "audit_logs",
    "impersonation_sessions",
    "subscriptions",
    "tenantUsage",
    "organizations",
    "staff",
    "notes",
    "reminders",
    "files",
    "creditNotes",
    "onboarding",
];

// Collections to partially clear (preserve some documents)
const PRESERVE_SUPERADMIN_ROLES = ["superadmin", "super_admin"];

async function deleteCollection(collectionPath: string, batchSize = 100): Promise<number> {
    const collectionRef = db.collection(collectionPath);
    let totalDeleted = 0;

    while (true) {
        const snapshot = await collectionRef.limit(batchSize).get();

        if (snapshot.empty) {
            break;
        }

        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        totalDeleted += snapshot.size;
        console.log(`  Deleted ${snapshot.size} docs from ${collectionPath} (total: ${totalDeleted})`);
    }

    return totalDeleted;
}

async function cleanUsersPreserveSuperAdmin(): Promise<number> {
    const usersRef = db.collection("users");
    const snapshot = await usersRef.get();

    let deleted = 0;
    const batch = db.batch();

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const role = data.role?.toLowerCase();

        if (!PRESERVE_SUPERADMIN_ROLES.includes(role)) {
            batch.delete(doc.ref);
            deleted++;
        } else {
            console.log(`  Preserving super admin: ${data.email || doc.id}`);
        }
    }

    if (deleted > 0) {
        await batch.commit();
    }

    return deleted;
}

async function deleteFirebaseAuthUsers(): Promise<number> {
    console.log("\n🗑️  Cleaning Firebase Auth users (preserving super admins)...");

    // Get super admin UIDs to preserve
    const usersRef = db.collection("users");
    const superAdminSnapshot = await usersRef.where("role", "in", PRESERVE_SUPERADMIN_ROLES).get();
    const preserveUids = new Set(superAdminSnapshot.docs.map((doc) => doc.id));

    let deleted = 0;
    let nextPageToken: string | undefined;

    do {
        const listResult = await admin.auth().listUsers(1000, nextPageToken);

        for (const user of listResult.users) {
            if (!preserveUids.has(user.uid)) {
                try {
                    await admin.auth().deleteUser(user.uid);
                    deleted++;
                    console.log(`  Deleted Auth user: ${user.email || user.uid}`);
                } catch (error) {
                    console.error(`  Failed to delete Auth user ${user.uid}:`, error);
                }
            } else {
                console.log(`  Preserving Auth user: ${user.email || user.uid}`);
            }
        }

        nextPageToken = listResult.pageToken;
    } while (nextPageToken);

    return deleted;
}

async function main() {
    console.log("🧹 Database Cleanup Script");
    console.log("==========================");
    console.log("This will delete all tenant data while preserving:");
    console.log("  - Super admin users");
    console.log("  - Billing plans (billingPlans)");
    console.log("  - Billing addons (billingAddons)\n");

    const stats: Record<string, number> = {};

    // 1. Clear tenant-related collections
    console.log("📦 Clearing collections...\n");

    for (const collection of COLLECTIONS_TO_CLEAR) {
        console.log(`\n🗑️  Clearing: ${collection}`);
        try {
            const count = await deleteCollection(collection);
            stats[collection] = count;
            console.log(`   ✅ ${collection}: ${count} documents deleted`);
        } catch (error) {
            console.error(`   ❌ ${collection}: Error -`, error);
            stats[collection] = -1;
        }
    }

    // 2. Clean users collection (preserve super admins)
    console.log("\n🗑️  Cleaning users collection (preserving super admins)...");
    try {
        const usersDeleted = await cleanUsersPreserveSuperAdmin();
        stats["users"] = usersDeleted;
        console.log(`   ✅ users: ${usersDeleted} documents deleted (super admins preserved)`);
    } catch (error) {
        console.error("   ❌ users: Error -", error);
    }

    // 3. Clean Firebase Auth users
    try {
        const authDeleted = await deleteFirebaseAuthUsers();
        stats["auth_users"] = authDeleted;
        console.log(`   ✅ Firebase Auth: ${authDeleted} users deleted (super admins preserved)`);
    } catch (error) {
        console.error("   ❌ Firebase Auth: Error -", error);
    }

    // Summary
    console.log("\n\n📊 Cleanup Summary");
    console.log("==================");
    Object.entries(stats).forEach(([collection, count]) => {
        const status = count >= 0 ? `${count} deleted` : "ERROR";
        console.log(`  ${collection}: ${status}`);
    });

    console.log("\n✅ Cleanup complete!");
    console.log("\n📝 Preserved:");
    console.log("  - billingPlans collection (untouched)");
    console.log("  - billingAddons collection (untouched)");
    console.log("  - Super admin users");
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
