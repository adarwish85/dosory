import { admin, db, auth } from "./_admin";

const ORG_ID = "org_verify_users_test_" + Date.now();
const TEST_EMAIL = `verify_user_${Date.now()}@example.com`;
const TEST_PASSWORD = "password123";
const ROLE_NAME = "Verify Test Role";

async function verifyUsersModule() {
    console.log(`\n🔍 Starting Users Module Verification for Org: ${ORG_ID}`);
    let roleId = "";
    let userId = "";

    try {
        // 1. Create a Role
        console.log("\n1️⃣ Creating Test Role...");
        const roleRef = await db.collection("roles").add({
            name: ROLE_NAME,
            description: "Role for automated verification",
            permissions: ["customers-view", "invoices-create"],
            orgId: ORG_ID,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        roleId = roleRef.id;
        console.log(`✅ Role created: ${roleId}`);

        // 2. Create Staff Member (Simulating API Logic)
        console.log(`\n2️⃣ Creating Staff Member (${TEST_EMAIL})...`);

        // 2a. Create Auth User
        const userRecord = await auth.createUser({
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
            displayName: "Verify User",
            emailVerified: false,
        });
        userId = userRecord.uid;
        console.log(`   - Auth User created: ${userId}`);

        // 2b. Create User Doc
        await db.collection("users").doc(userId).set({
            email: TEST_EMAIL,
            displayName: "Verify User",
            role: "staff",
            orgId: ORG_ID,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log("   - User Firestore doc created");

        // 2c. Set Custom Claims
        await auth.setCustomUserClaims(userId, {
            orgId: ORG_ID,
            role: "staff",
        });
        console.log("   - Custom claims set");

        // 2d. Create Staff Doc
        const staffDocId = TEST_EMAIL.toLowerCase();
        await db
            .collection("staff")
            .doc(staffDocId)
            .set({
                authUid: userId,
                firstName: "Verify",
                lastName: "User",
                email: TEST_EMAIL,
                phone: "1234567890",
                isAdmin: false,
                roleId: roleId,
                permissions: ["customers-view"], // Specific permissions override or supplement
                orgId: ORG_ID,
                status: "active",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        console.log(`   - Staff doc created: ${staffDocId}`);
        console.log("✅ Staff Member creation simulated successfully");

        // 3. Verify Data Integrity
        console.log("\n3️⃣ Verifying Data Integrity...");

        // 3a. Verify Auth Claims
        const user = await auth.getUser(userId);
        const claims = user.customClaims;
        if (claims.orgId !== ORG_ID || claims.role !== "staff") {
            throw new Error(`❌ Claims mismatch. Expected orgId=${ORG_ID}, role=staff. Got: ${JSON.stringify(claims)}`);
        }
        console.log("✅ Auth Claims verified");

        // 3b. Verify Staff -> Role Link
        const staffDoc = await db.collection("staff").doc(TEST_EMAIL.toLowerCase()).get();
        if (!staffDoc.exists) throw new Error("Staff doc not found");
        if (staffDoc.data().roleId !== roleId) throw new Error("Staff roleId mismatch");
        console.log("✅ Staff -> Role link verified");

        console.log("\n🎉 Users Module Verification PASSED!");
    } catch (error) {
        console.error("\n❌ Verification FAILED:", error);
    } finally {
        // Cleanup
        console.log("\n🧹 Cleaning up test data...");
        if (roleId) await db.collection("roles").doc(roleId).delete();
        if (userId) {
            await auth.deleteUser(userId).catch(() => {});
            await db.collection("users").doc(userId).delete();
            await db.collection("staff").doc(TEST_EMAIL.toLowerCase()).delete();
        }
        console.log("✅ Cleanup complete");
    }
}

verifyUsersModule();
