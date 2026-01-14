import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from "firebase/auth";

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

async function seed() {
    const orgId = "seed-org";
    const email = "seed@test.com";
    const password = "password123";

    console.log("Creating/Authenticating Auth User...");
    let uid = "";
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        uid = userCredential.user.uid;
        console.log(`User created with UID: ${uid}`);
    } catch (e: unknown) {
        if ((e as { code?: string }).code === "auth/email-already-in-use") {
            console.log("User already exists, logging in...");
            const userCredential = await import("firebase/auth").then((m) =>
                m.signInWithEmailAndPassword(auth, email, password)
            );
            uid = userCredential.user.uid;
        } else {
            console.error("Error creating/logging in user:", e);
            process.exit(1);
        }
    }

    console.log("Seeding Organization...");
    // Now we are authenticated as the user
    try {
        await setDoc(doc(db, "organizations", orgId), {
            name: "Seed Organization",
            slug: "seed-org",
            orgId: orgId, // Required for wildcard rule match
            currency: "USD",
            createdAt: new Date(),
            createdBy: uid,
            members: [uid],
        });
        console.log("Organization created successfully.");
    } catch (e) {
        console.error("Error creating organization:", e);
        process.exit(1);
    }

    console.log("Creating User Profile...");
    try {
        await setDoc(doc(db, "users", uid), {
            email: email,
            displayName: "Seed Admin",
            orgId: orgId,
            role: "admin",
            createdAt: new Date(),
        });
        console.log(`User profile created for ${uid}`);
    } catch (e) {
        console.error("Error creating user profile:", e);
        process.exit(1);
    }

    console.log("Seeding Completed!");
    process.exit(0);
}

seed();
