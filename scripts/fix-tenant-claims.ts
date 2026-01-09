#!/usr/bin/env npx tsx
import * as admin from "firebase-admin";
import * as path from "path";
import * as fs from "fs";

// Load .env.local manually
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8");
    envConfig.split("\n").forEach((line) => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, "");
            if (!process.env[key]) {
                process.env[key] = value;
            }
        }
    });
}

// Initialize Firebase Admin (copied from setSuperAdminClaims.ts logic for standalone execution)
function initAdmin() {
    if (admin.apps.length) return admin.app();

    let serviceAccount: admin.ServiceAccount | undefined;

    // Check key from env (loaded above)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            console.log("✅ Loaded service account from FIREBASE_SERVICE_ACCOUNT_KEY");
        } catch {
            console.warn("⚠️ Not a valid JSON in FIREBASE_SERVICE_ACCOUNT_KEY");
        }
    }

    if (!serviceAccount) {
        const keyPath = path.join(process.cwd(), "service-account.json");
        if (fs.existsSync(keyPath)) {
            serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
            console.log("✅ Loaded service account from file");
        }
    }

    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!serviceAccount) {
        console.log("ℹ️ No service account found, trying default credentials...");
        // Provide projectId explicitly if we have it, helps in some environments
        if (projectId) {
            console.log(`ℹ️ Using Project ID: ${projectId}`);
            admin.initializeApp({ projectId });
            return admin.app();
        }
        admin.initializeApp();
        return admin.app();
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
    return admin.app();
}

const app = initAdmin();
const auth = app.auth();
const db = app.firestore();

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
