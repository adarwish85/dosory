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

async function diagnoseUser(email: string) {
    console.log(`\n🔍 Diagnosing user: ${email}\n`);
    console.log("=".repeat(60));

    // 1. Find user by email
    let userRecord;
    try {
        userRecord = await auth.getUserByEmail(email);
        console.log("\n📧 AUTH USER:");
        console.log(`   UID: ${userRecord.uid}`);
        console.log(`   Email: ${userRecord.email}`);
        console.log(`   Custom Claims: ${JSON.stringify(userRecord.customClaims || {})}`);
    } catch (e) {
        console.error(`   ❌ User not found in Auth: ${(e as Error).message}`);
        return;
    }

    // 2. Check Firestore profile
    console.log("\n📋 FIRESTORE PROFILE:");
    const userDoc = await db.collection("users").doc(userRecord.uid).get();
    if (userDoc.exists) {
        const data = userDoc.data();
        console.log(`   orgId: ${data?.orgId || data?.organizationId || "MISSING"}`);
        console.log(`   role: ${data?.role || "MISSING"}`);
    } else {
        console.log("   ❌ No Firestore profile found");
    }

    // 3. Check organization
    const orgId = userRecord.customClaims?.orgId || userDoc.data()?.orgId;
    if (orgId) {
        console.log(`\n🏢 ORGANIZATION (${orgId}):`);
        const orgDoc = await db.collection("organizations").doc(orgId).get();
        if (orgDoc.exists) {
            const data = orgDoc.data();
            console.log(`   Name: ${data?.name || "Unknown"}`);
            console.log(`   Status: ${data?.status || "Unknown"}`);
        } else {
            console.log("   ❌ Organization not found");
        }

        // 4. Check subscription
        console.log("\n💳 SUBSCRIPTION:");
        const subDoc = await db.collection("subscriptions").doc(orgId).get();
        if (subDoc.exists) {
            const data = subDoc.data();
            console.log(`   Status: ${data?.status || "Unknown"}`);
            console.log(`   Plan: ${data?.planId || "Unknown"}`);
        } else {
            console.log("   ❌ No subscription found");
        }
    }

    // 5. Check leads for this org
    console.log("\n📊 LEADS:");
    const leadsSnapshot = await db.collection("leads").where("orgId", "==", orgId).get();
    console.log(`   Total leads for orgId=${orgId}: ${leadsSnapshot.size}`);

    if (leadsSnapshot.size > 0) {
        console.log("   Sample leads:");
        leadsSnapshot.docs.slice(0, 3).forEach((doc, i) => {
            const data = doc.data();
            console.log(`     ${i + 1}. ${data.name} (orgId: ${data.orgId})`);
        });
    }

    // 6. Check if any leads have DIFFERENT orgId
    const allLeadsSnapshot = await db.collection("leads").limit(20).get();
    const differentOrgLeads = allLeadsSnapshot.docs.filter((d) => d.data().orgId !== orgId);
    if (differentOrgLeads.length > 0) {
        console.log("\n⚠️  LEADS WITH DIFFERENT orgId:");
        differentOrgLeads.forEach((doc) => {
            const data = doc.data();
            console.log(`     - ${data.name}: orgId=${data.orgId}, createdBy=${data.createdBy}`);
        });
    }

    console.log("\n" + "=".repeat(60));
    console.log("DIAGNOSIS COMPLETE");
}

// Get email from args or use default
const email = process.argv[2] || "a.darwish@wasiladev.com";
diagnoseUser(email).catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
