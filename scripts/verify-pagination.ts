import { initializeApp } from "firebase/app";
import {
    getFirestore,
    connectFirestoreEmulator,
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    startAfter,
    where,
} from "firebase/firestore";
import admin from "firebase-admin";

// Admin Setup for clean seeding
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

if (!admin.apps.length) {
    admin.initializeApp({ projectId: "dosory-test" });
}

import { getAuth, connectAuthEmulator, signInWithCustomToken } from "firebase/auth";

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

const ORG_ID = "pagination-test-org";
const COLLECTION = "leads";

async function runTest() {
    console.log("🚀 Starting Pagination Verification Test");

    // 0. Authenticate
    const uid = "pagination-tester";
    try {
        await admin
            .auth()
            .createUser({ uid, email: "pager@test.com" })
            .catch(() => {});
        await admin.auth().setCustomUserClaims(uid, { orgId: ORG_ID, role: "admin" });
        const token = await admin.auth().createCustomToken(uid, { orgId: ORG_ID, role: "admin" });
        await signInWithCustomToken(auth, token);
        console.log("✅ Authenticated.");
    } catch (e) {
        console.error("Auth failed", e);
        process.exit(1);
    }

    // 1. Cleanup old data
    console.log("Cleaning up old test data...");
    const oldDocs = await admin.firestore().collection(COLLECTION).where("orgId", "==", ORG_ID).get();
    const batchDelete = admin.firestore().batch();
    oldDocs.docs.forEach((d) => batchDelete.delete(d.ref));
    await batchDelete.commit();

    // 2. Seed Data (25 items)
    console.log("Seeding 25 Leads...");
    const batchSeed = admin.firestore().batch();
    for (let i = 1; i <= 25; i++) {
        const docRef = admin.firestore().collection(COLLECTION).doc();
        batchSeed.set(docRef, {
            name: `Lead ${String(i).padStart(3, "0")}`, // Lead 001, Lead 002...
            orgId: ORG_ID,
            createdAt: admin.firestore.Timestamp.now(),
            value: i * 100,
        });
    }
    await batchSeed.commit();
    console.log("✅ Seeding complete.");

    // 3. Test Pagination (Page 1)
    console.log("Fetching Page 1 (Limit 10, Order by Name)...");
    const q1 = query(collection(db, COLLECTION), where("orgId", "==", ORG_ID), orderBy("name", "asc"), limit(10));
    const snap1 = await getDocs(q1);

    if (snap1.size !== 10) throw new Error(`Page 1 size mismatch. Expected 10, got ${snap1.size}`);
    const firstItem = snap1.docs[0].data().name;
    const lastItem1 = snap1.docs[snap1.docs.length - 1].data().name;
    console.log(`✅ Page 1: ${firstItem} -> ${lastItem1}`);

    if (firstItem !== "Lead 001" || lastItem1 !== "Lead 010") {
        throw new Error("Page 1 data incorrect order");
    }

    // 4. Test Pagination (Page 2) - Using Cursor
    console.log("Fetching Page 2 (Limit 10, Start After Page 1)...");
    const lastDocOfPage1 = snap1.docs[snap1.docs.length - 1];

    const q2 = query(
        collection(db, COLLECTION),
        where("orgId", "==", ORG_ID),
        orderBy("name", "asc"),
        startAfter(lastDocOfPage1),
        limit(10)
    );
    const snap2 = await getDocs(q2);

    if (snap2.size !== 10) throw new Error(`Page 2 size mismatch. Expected 10, got ${snap2.size}`);
    const firstItem2 = snap2.docs[0].data().name;
    const lastItem2 = snap2.docs[snap2.docs.length - 1].data().name;
    console.log(`✅ Page 2: ${firstItem2} -> ${lastItem2}`);

    if (firstItem2 !== "Lead 011" || lastItem2 !== "Lead 020") {
        throw new Error("Page 2 data incorrect order or overlap");
    }

    // 5. Test Pagination (Page 3) - Partial Page
    console.log("Fetching Page 3 (Limit 10, Start After Page 2)...");
    const lastDocOfPage2 = snap2.docs[snap2.docs.length - 1];

    const q3 = query(
        collection(db, COLLECTION),
        where("orgId", "==", ORG_ID),
        orderBy("name", "asc"),
        startAfter(lastDocOfPage2),
        limit(10)
    );
    const snap3 = await getDocs(q3);

    if (snap3.size !== 5) throw new Error(`Page 3 size mismatch. Expected 5, got ${snap3.size}`);
    const firstItem3 = snap3.docs[0].data().name;
    const lastItem3 = snap3.docs[snap3.docs.length - 1].data().name;
    console.log(`✅ Page 3: ${firstItem3} -> ${lastItem3}`);

    if (firstItem3 !== "Lead 021" || lastItem3 !== "Lead 025") {
        throw new Error("Page 3 data incorrect");
    }

    console.log("🎉 Pagination Logic Verified!");
    process.exit(0);
}

runTest();
