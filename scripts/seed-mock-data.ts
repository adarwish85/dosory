/**
 * Seed Mock Data Script
 *
 * Populates the database with realistic mock data for testing:
 * - Plans (Starter, Professional)
 * - Tenants (Acme Corp, Small Biz Inc)
 * - Users (Admins, Staff)
 * - CRM Data (Customers, Contacts, Leads)
 *
 * Run with: npx tsx scripts/seed-mock-data.ts
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
import { FieldValue } from "firebase-admin/firestore";

// Initialize Firebase Admin
if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
        });
    } else {
        admin.initializeApp();
    }
}

const db = admin.firestore();
const auth = admin.auth();

const TEAMS = [
    {
        id: "tenant_acme",
        name: "Acme Corp",
        subdomain: "acme",
        planId: "plan_professional",
        users: [
            { email: "admin@acme.com", name: "Alice Admin", role: "admin" },
            { email: "bob@acme.com", name: "Bob Sales", role: "staff" },
            { email: "carol@acme.com", name: "Carol Support", role: "staff" },
        ],
    },
    {
        id: "tenant_smallbiz",
        name: "Small Biz Inc",
        subdomain: "smallbiz",
        planId: "plan_starter",
        users: [{ email: "dave@smallbiz.com", name: "Dave Owner", role: "admin" }],
    },
];

async function seedPlans() {
    console.log("🌱 Seeding Plans...");
    const plans = [
        {
            id: "plan_starter",
            name: "Starter",
            status: "published",
            limits: { maxUsers: 3, storageGB: 10 },
            entitlements: { modules: ["crm"], featuresByModule: { crm: { bulkImport: false } } },
            ui: { sortOrder: 1 },
        },
        {
            id: "plan_professional",
            name: "Professional",
            status: "published",
            limits: { maxUsers: 10, storageGB: 50 },
            entitlements: { modules: ["crm", "sales"], featuresByModule: { crm: { bulkImport: true } } },
            ui: { sortOrder: 2 },
        },
    ];

    for (const plan of plans) {
        await db
            .collection("plans")
            .doc(plan.id)
            .set(
                {
                    ...plan,
                    versioning: { version: 1, publishedAt: FieldValue.serverTimestamp() },
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                },
                { merge: true }
            );
    }
}

async function seedTenants() {
    console.log("🌱 Seeding Tenants & Users...");

    for (const team of TEAMS) {
        // 1. Create Tenant (Organization)
        await db.collection("organizations").doc(team.id).set({
            name: team.name,
            subdomain: team.subdomain,
            status: "active",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        // 2. Create Subscription
        await db
            .collection("subscriptions")
            .doc(team.id)
            .set({
                planId: team.planId,
                status: "active",
                planVersion: 1,
                billingCycle: "monthly",
                addons: [],
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
                // Mock computed entitlements
                computedEntitlements: {
                    limits: team.planId === "plan_starter" ? { maxUsers: 3 } : { maxUsers: 10 },
                    enabledModules: team.planId === "plan_starter" ? ["crm"] : ["crm", "sales"],
                },
            });

        // 3. Create Tenant Usage
        await db.collection("tenant_usage").doc(team.id).set({
            usersCount: team.users.length,
            storageUsedGB: 0.1,
            updatedAt: FieldValue.serverTimestamp(),
        });

        // 4. Create Users
        for (const user of team.users) {
            let uid = `user_${user.email.split("@")[0]}`;

            try {
                // Create in Auth
                try {
                    await auth.createUser({
                        uid,
                        email: user.email,
                        displayName: user.name,
                        password: "password123", // Default password
                        emailVerified: true,
                    });
                } catch (e: unknown) {
                    const error = e as { code: string };
                    if (error.code === "auth/uid-already-exists") {
                        // Keep existing UID
                    } else if (error.code === "auth/email-already-exists") {
                        const existingUser = await auth.getUserByEmail(user.email);
                        uid = existingUser.uid;
                    } else {
                        throw e;
                    }
                }

                // Create in Firestore
                await db.collection("users").doc(uid).set(
                    {
                        email: user.email,
                        displayName: user.name,
                        orgId: team.id,
                        role: user.role,
                        status: "active",
                        createdAt: FieldValue.serverTimestamp(),
                        updatedAt: FieldValue.serverTimestamp(),
                    },
                    { merge: true }
                );

                console.log(`   Created user: ${user.email} (${uid})`);
            } catch (error) {
                console.error(`   Failed to create user ${user.email}:`, error);
            }
        }
    }
}

async function seedCRMData() {
    console.log("🌱 Seeding CRM Data for Acme Corp...");
    const orgId = "tenant_acme";
    const createdBy = "user_admin"; // Alice Admin

    // Customers
    const customers = [
        { name: "TechStart Inc", email: "contact@techstart.io", status: "active" },
        { name: "Global Logistics", email: "info@globallog.com", status: "active" },
        { name: "Local Bakery", email: "hello@bakery.local", status: "inactive" },
    ];

    for (const cust of customers) {
        const custRef = await db.collection("customers").add({
            company: cust.name, // Using company as primary name field based on hooks
            email: cust.email,
            status: cust.status,
            orgId,
            createdBy,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Contacts for this customer
        await db.collection("contacts").add({
            firstName: "John",
            lastName: "Doe",
            email: `john@${cust.email.split("@")[1]}`,
            customerId: custRef.id,
            orgId,
            createdBy,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
    }

    // Leads
    const leads = [
        { company: "Big Corp Potential", status: "new" },
        { company: "Startup lead", status: "qualified" },
        { company: "Cold lead", status: "contacted" },
    ];

    for (const lead of leads) {
        await db.collection("leads").add({
            ...lead,
            orgId,
            createdBy,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
    }
}

async function main() {
    try {
        await seedPlans();
        await seedTenants();
        await seedCRMData();
        console.log("\n✅ Seeding complete!");
        console.log("Credentials:");
        console.log("  - Alice Admin (Acme Corp): admin@acme.com / password123");
        console.log("  - Bob Sales (Acme Corp): bob@acme.com / password123");
        console.log("  - Dave Owner (Small Biz): dave@smallbiz.com / password123");
    } catch (error) {
        console.error("Fatal error:", error);
    }
}

main();
