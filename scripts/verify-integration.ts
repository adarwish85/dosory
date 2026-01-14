import { initializeApp } from "firebase/app";
import {
    getFirestore,
    connectFirestoreEmulator,
    collection,
    addDoc,
    getDoc,
    getDocs,
    query,
    where,
    doc,
} from "firebase/firestore";
import { getAuth, connectAuthEmulator, signInWithCustomToken } from "firebase/auth";
import admin from "firebase-admin";
import { convertLeadToCustomerService } from "../lib/services/lead-service";

// Admin SDK Setup (for setting claims)
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "dosory-test",
    });
}

// Client SDK Setup
const firebaseConfig = {
    apiKey: "fake-api-key",
    authDomain: "localhost",
    projectId: "dosory-test",
    storageBucket: "dosory-test.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

connectFirestoreEmulator(db, "127.0.0.1", 8080);
connectAuthEmulator(auth, "http://127.0.0.1:9099");

async function runTest() {
    console.log("🚀 Starting Integration Test: Lead -> Customer -> Project Flow");

    // 1. Authenticate & Set Claims
    const email = "seed@test.com";
    const password = "password123";
    let uid = "";
    const orgId = "seed-org";

    try {
        // Ensure user exists (admin check)
        try {
            const userRecord = await admin.auth().getUserByEmail(email);
            uid = userRecord.uid;
        } catch {
            console.log("Creating seed user via Admin SDK...");
            const userRecord = await admin.auth().createUser({ email, password });
            uid = userRecord.uid;
        }

        // Set Claims & Create Custom Token
        // Note: setCustomUserClaims persists it, createCustomToken embeds it for this session
        await admin.auth().setCustomUserClaims(uid, { orgId, role: "admin" });
        const customToken = await admin.auth().createCustomToken(uid, { orgId, role: "admin" });
        console.log("✅ Custom Token Created for user", uid);

        // Sign In Client with Custom Token
        const userCredential = await signInWithCustomToken(auth, customToken);

        // Safety check claims
        const tokenResult = await userCredential.user.getIdTokenResult();
        if (tokenResult.claims.orgId !== orgId) {
            throw new Error(`Claims mismatch: expected ${orgId}, got ${tokenResult.claims.orgId}`);
        }

        console.log(`✅ Authenticated as ${email} (${uid})`);
    } catch (e) {
        console.error("❌ Authentication failed.", e);
        process.exit(1);
    }

    const profile = { uid, orgId, email };

    // 2. Create a Mock Lead with a Deal
    console.log("Creating Mock Lead...");
    const leadData = {
        name: "Integration Test Lead",
        company: "Integration Corp",
        email: `test-${Date.now()}@integration.com`,
        phone: "555-0199",
        status: "qualified",
        orgId: orgId,
        deal: {
            subject: "Big Deal 2026",
            value: 50000,
            description: "A huge project",
            expectedCloseDate: new Date(),
        },
        tags: ["test", "high-value"],
        description: "Testing conversion flow",
    };

    let leadId = "";
    try {
        const leadRef = await addDoc(collection(db, "leads"), leadData);
        leadId = leadRef.id;
        console.log(`✅ Mock Lead Created: ${leadId}`);
    } catch (e) {
        console.error("❌ Failed to create mock mock lead:", e);
        process.exit(1);
    }

    // 3. Convert Lead
    console.log("🔄 Converting Lead...");
    try {
        const customerId = await convertLeadToCustomerService(db, profile, leadId, {
            createContact: true,
            createProjectFromDeal: true,
        });
        console.log(`✅ Conversion Success! Customer ID: ${customerId}`);

        // 4. Verify Customer
        const custSnap = await getDoc(doc(db, "customers", customerId));
        if (!custSnap.exists()) throw new Error("Customer doc missing");
        const custData = custSnap.data();
        if (custData.company !== "Integration Corp") throw new Error("Customer company mismatch");
        if (custData.fromLeadId !== leadId) throw new Error("Link to lead missing");
        console.log("✅ Verified Customer Data");

        // 5. Verify Contact
        const contactsQ = query(
            collection(db, "contacts"),
            where("customerId", "==", customerId),
            where("orgId", "==", orgId)
        );
        const contactsSnap = await getDocs(contactsQ);
        if (contactsSnap.empty) throw new Error("Contact not created");
        const contactData = contactsSnap.docs[0].data();
        if (contactData.email !== leadData.email) throw new Error("Contact email mismatch");
        console.log("✅ Verified Contact Creation");

        // 6. Verify Project
        const projectQ = query(
            collection(db, "projects"),
            where("customerId", "==", customerId),
            where("orgId", "==", orgId)
        );
        const projectSnap = await getDocs(projectQ);
        if (projectSnap.empty) throw new Error("Project not created");
        const projectData = projectSnap.docs[0].data();
        if (projectData.name !== "Big Deal 2026") throw new Error("Project name mismatch");
        console.log("✅ Verified Project Creation from Deal");

        // 7. Verify Lead Deletion
        const oldLeadSnap = await admin.firestore().collection("leads").doc(leadId).get();
        if (oldLeadSnap.exists) throw new Error("Lead document was not deleted");
        console.log("✅ Verified Lead Deletion");

        console.log("🎉 Integration Test Passed!");
        process.exit(0);
    } catch (e) {
        console.error("❌ Test Failed:", e);
        process.exit(1);
    }
}

runTest();
