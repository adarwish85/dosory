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

// Initialize Firebase Admin
function initAdmin() {
    if (admin.apps.length) return admin.app();

    let serviceAccount: admin.ServiceAccount | undefined;

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

    if (!serviceAccount) {
        console.log("ℹ️ No service account found, trying default credentials...");
        admin.initializeApp();
        return admin.app();
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
    return admin.app();
}

const app = initAdmin();
const db = app.firestore();

async function ensureSubscriptions() {
    console.log("🔍 Checking organizations and subscriptions...\n");

    // Get all organizations
    const orgsSnapshot = await db.collection("organizations").get();

    if (orgsSnapshot.empty) {
        console.log("No organizations found.");
        return;
    }

    console.log(`Found ${orgsSnapshot.size} organizations.\n`);

    for (const orgDoc of orgsSnapshot.docs) {
        const orgId = orgDoc.id;
        const orgData = orgDoc.data();
        console.log(`📋 Organization: ${orgId} (${orgData.name || "Unnamed"})`);

        // Check if subscription exists
        const subDoc = await db.collection("subscriptions").doc(orgId).get();

        if (subDoc.exists) {
            const subData = subDoc.data();
            console.log(`   ✅ Subscription exists: status=${subData?.status}, plan=${subData?.planId}`);
        } else {
            console.log("   ⚠️ No subscription found - creating trial subscription...");

            // Create a trial subscription
            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 14); // 14 day trial

            await db
                .collection("subscriptions")
                .doc(orgId)
                .set({
                    tenantId: orgId,
                    planId: "trial",
                    planVersion: 1,
                    status: "trial",
                    currentPeriodStart: admin.firestore.FieldValue.serverTimestamp(),
                    currentPeriodEnd: admin.firestore.Timestamp.fromDate(trialEndDate),
                    expiresAt: admin.firestore.Timestamp.fromDate(trialEndDate),
                    addons: [],
                    computedEntitlements: {
                        limits: {
                            maxUsers: 5,
                            storageGB: 1,
                        },
                        enabledModules: ["crm", "leads", "customers", "projects", "tasks", "invoices"],
                        featuresByModule: {},
                    },
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

            console.log("   ✅ Created trial subscription");
        }
        console.log("");
    }

    console.log("--------------------------------------------------");
    console.log("Process Complete.");
}

// Run
ensureSubscriptions().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
