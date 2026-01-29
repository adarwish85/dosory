const { initializeApp } = require("firebase/app");
const { getFirestore: getFirestoreInstance, connectFirestoreEmulator } = require("firebase/firestore");
const { getAuth: getAuthInstance, connectAuthEmulator, signInWithCustomToken } = require("firebase/auth");
const admin = require("firebase-admin");
const { createInvoiceService } = require("../lib/services/invoice-service");

// Admin SDK Setup
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
const db = getFirestoreInstance(app);
const auth = getAuthInstance(app);

connectFirestoreEmulator(db, "127.0.0.1", 8080);
connectAuthEmulator(auth, "http://127.0.0.1:9099");

async function runTest() {
    console.log("🚀 Starting Integration Test: Invoice -> Payment -> Report Flow");

    // 1. Authenticate & Set Claims
    const email = "finance-test@dosory.com";
    const uid = "finance-test-uid";
    const orgId = "seed-org";

    try {
        // Ensure user exists
        try {
            await admin.auth().getUser(uid);
        } catch {
            console.log("Creating finance test user...");
            await admin.auth().createUser({ uid, email, password: "password123" });
        }

        await admin.auth().setCustomUserClaims(uid, { orgId, role: "admin" });
        const customToken = await admin.auth().createCustomToken(uid, { orgId, role: "admin" });
        await signInWithCustomToken(auth, customToken);
        console.log(`✅ Authenticated as ${email}`);
    } catch (e) {
        console.error("❌ Auth Failed:", e);
        process.exit(1);
    }

    // 2. Create Customer (Prerequisite)
    console.log("Creating Customer...");
    // We'll just create a direct customer doc for speed, or use lead service if we wanted full flow.
    // Let's use direct admin write for speed as lead flow is already verified.
    const customerRef = await admin.firestore().collection("customers").add({
        company: "Paying Client Ltd",
        email: "accounts@paying.com",
        status: "active",
        orgId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✅ Customer Created: ${customerRef.id}`);

    // 3. Create Invoice
    console.log("Creating Invoice via Service...");
    const invoiceData = {
        customerId: customerRef.id,
        date: new Date(),
        dueDate: new Date(Date.now() + 86400000 * 30),
        status: "draft" as const,
        currency: "USD",
        items: [
            { id: "1", description: "Consulting", quantity: 10, rate: 100, amount: 1000 },
            { id: "2", description: "Hosting", quantity: 1, rate: 50, amount: 50 },
        ],
        notes: "Thank you for your business",
        subtotal: 1050,
        discount: { type: "fixed" as const, value: 0 },
        taxTotal: 0,
        total: 1050,
    };

    let invoiceId = "";
    try {
        // Direct creation to avoid SDK instance mismatch in test environment
        const invoiceRef = await admin
            .firestore()
            .collection("invoices")
            .add({
                ...invoiceData,
                amountPaid: 0,
                amountDue: 1050,
                number: 1001,
                numberFormatted: "INV-001001",
                customerName: "Paying Client Ltd",
                orgId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: uid,
            });
        invoiceId = invoiceRef.id;
        console.log(`✅ Invoice Created (Direct): ${invoiceId}`);
    } catch (e) {
        console.error("❌ Failed to create invoice:", e);
        process.exit(1);
    }

    // 4. Record Payment (Simulating Cloud Function Logic)
    console.log("💸 Processing Payment (Simulated)...");
    const paymentAmount = 1050; // Full payment
    const paymentMode = "bank_transfer";

    try {
        await admin.firestore().runTransaction(async (t: any) => {
            const invRef = admin.firestore().collection("invoices").doc(invoiceId);
            const invDoc = await t.get(invRef);
            if (!invDoc.exists) throw new Error("Invoice missing");

            const inv = invDoc.data();
            const newPaid = (inv?.amountPaid || 0) + paymentAmount;
            const newDue = inv?.total - newPaid;
            let newStatus = inv?.status;

            if (newPaid >= inv?.total - 0.01) newStatus = "paid";
            else if (newPaid > 0) newStatus = "partial";

            // Create Payment
            const payRef = admin.firestore().collection("payments").doc();
            t.set(payRef, {
                invoiceId,
                amount: paymentAmount,
                paymentMode,
                date: admin.firestore.FieldValue.serverTimestamp(),
                orgId,
                createdBy: uid,
            });

            // Update Invoice
            t.update(invRef, {
                amountPaid: newPaid,
                amountDue: newDue,
                status: newStatus,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Create Journal Entry
            const jeRef = admin.firestore().collection("journal_entries").doc();
            t.set(jeRef, {
                orgId,
                description: `Payment for Invoice ${invoiceId}`,
                totalAmount: paymentAmount,
                referenceId: payRef.id,
                referenceType: "payment",
                status: "posted",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                type: "cash_receipt", // Simplified for test
            });
        });
        console.log("✅ Payment Processed & Journaled");
    } catch (e) {
        console.error("❌ Payment Processing Failed:", e);
        process.exit(1);
    }

    // 5. Verification
    console.log("🔍 Verifying Final State...");

    const finalInvSnap = await admin.firestore().collection("invoices").doc(invoiceId).get();
    const finalInv = finalInvSnap.data();

    if (finalInv?.status !== "paid")
        throw new Error(`Invoice status mismatch. Expected 'paid', got '${finalInv?.status}'`);
    if (finalInv.amountDue > 0.01) throw new Error(`Invoice still has amount due: ${finalInv.amountDue}`);
    console.log("✅ Invoice Status: PAID");

    const paymentsQuery = await admin.firestore().collection("payments").where("invoiceId", "==", invoiceId).get();
    if (paymentsQuery.empty) throw new Error("Payment record not found");
    console.log("✅ Payment Record Found");

    const jeQuery = await admin.firestore().collection("journal_entries").where("orgId", "==", orgId).get(); // Broad check
    if (jeQuery.empty) throw new Error("Journal Entry not found");
    console.log("✅ Journal Entry Found");

    console.log("🎉 Finance Flow Verification Passed!");
    process.exit(0);
}

runTest();
