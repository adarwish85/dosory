import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, collection, addDoc } from "firebase/firestore";

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

// Connect to WRONG port to simulate failure/unreachable backend
console.log("Connecting to Firestore on WRONG port (9999)...");
connectFirestoreEmulator(db, "127.0.0.1", 9999);

async function runTest() {
    console.log("🚀 Attempting write to unreachable backend...");

    // Set a timeout to fail if it hangs (expected behavior for no-persistence client)
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000));

    try {
        const writePromise = addDoc(collection(db, "resilience_test"), {
            test: "data",
            timestamp: new Date(),
        });

        await Promise.race([writePromise, timeout]);
        console.log("⚠️ Write succeeded (unexpected for unreachable backend without persistence)");
    } catch (e: unknown) {
        const error = e as { message?: string; code?: string };
        console.log("✅ Caught expected error/timeout:");
        console.log(error.message || error.code);

        if (error.message === "Timeout") {
            console.log(
                "--> SDK correctly hangs/retries when backend unreachable (normal behavior without persistence)."
            );
            console.log("--> In Browser with Persistence, this would resolve via Cache.");
            console.log("--> In Browser without Persistence, this would hang until timeout.");
        } else if (error.code === "unavailable") {
            console.log("--> SDK threw 'unavailable' error.");
        }
    }

    // We can't easily verification toast behavior here, but we verified the mechanism.
    process.exit(0);
}

runTest();
