/**
 * RBAC Seed Script
 * Usage: npx ts-node scripts/seed-rbac.ts
 *
 * This script connects to Firestore using the Admin SDK and seeds the
 * standard ROLES into every organization in the system (or a specific one).
 */

// Force environment variables to load from .env.local if needed
// import * as dotenv from 'dotenv';
// dotenv.config({ path: '.env.local' });

// We need to import the initialized admin app.
// Note: lib/firebase-admin likely relies on Cert env vars.
// If running locally without service account json, this might fail unless authenticated via gcloud.

// Manual config loader since we don't have dotenv
import * as fs from "fs";
import * as path from "path";

// helper to parse env file
function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, "../.env.local");
        if (fs.existsSync(envPath)) {
            const data = fs.readFileSync(envPath, "utf8");
            data.split("\n").forEach((line) => {
                const parts = line.split("=");
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const val = parts
                        .slice(1)
                        .join("=")
                        .trim()
                        .replace(/^["'](.*)["']$/, "$1"); // trim quotes
                    if (key && !process.env[key]) {
                        process.env[key] = val;
                    }
                }
            });
            console.log("Loaded .env.local");
        }
    } catch (e) {
        console.warn("Could not load .env.local", e);
    }
}
loadEnv();

import * as admin from "firebase-admin";
import { SEED_ROLES } from "./roles-seed-data";

// Initialize Admin SDK
if (!admin.apps.length) {
    try {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        const config: admin.AppOptions = {
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        };

        if (serviceAccount) {
            config.credential = admin.credential.cert(JSON.parse(serviceAccount));
        } else {
            // Fallback to ADC
            config.credential = admin.credential.applicationDefault();
        }

        admin.initializeApp(config);
        console.log("Initialized Firebase Admin for project:", config.projectId);
    } catch (e) {
        console.error("Failed to initialize admin:", e);
        process.exit(1);
    }
}

const db = admin.firestore();

async function main() {
    console.log("Starting RBAC Seed...");

    // 1. Get all organizations
    // In a real multi-tenant system, we iterate all orgs.
    // For test, we might just do one.

    console.log("Fetching organizations...");
    const orgsSnap = await db.collection("organizations").get();

    if (orgsSnap.empty) {
        console.log("No organizations found. Seeding failed.");
        return;
    }

    console.log(`Found ${orgsSnap.size} organizations.`);

    const batch = db.batch();
    let opCount = 0;

    for (const orgDoc of orgsSnap.docs) {
        const orgId = orgDoc.id;
        console.log(`Seeding roles for Org: ${orgId}`);

        for (const role of SEED_ROLES) {
            const roleRef = db.collection("organizations").doc(orgId).collection("roles").doc(role.id);

            batch.set(roleRef, {
                ...role,
                tenantId: orgId, // Ensure tenant ownership
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            opCount++;

            // Firestore batch limit is 500
            if (opCount >= 400) {
                await batch.commit();
                console.log("Committed batch...");
                opCount = 0;
            }
        }
    }

    if (opCount > 0) {
        await batch.commit();
        console.log("Committed final batch.");
    }

    console.log("RBAC Seed Complete!");
}

main().catch(console.error);
