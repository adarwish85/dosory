#!/usr/bin/env npx tsx
import { admin, db } from "./_admin";

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
