import * as admin from "firebase-admin";
import { processPayment, finalizeInvoice, onInvoiceWrite } from "../../functions/src/index";
import * as firebaseFunctionsTest from "firebase-functions-test";

const firebaseTest = firebaseFunctionsTest();

// Mock Firestore
const db = admin.firestore();

describe("Finance Backend Tests", () => {
    let testEnv;

    beforeAll(() => {
        // Initialize test environment
        testEnv = firebaseTest;
    });

    afterAll(() => {
        testEnv.cleanup();
    });

    describe("processPayment", () => {
        it("should atomicly update invoice and create payment", async () => {
            // Setup: Create Draft Invoice
            const invoiceRef = db.collection("invoices").doc();
            await invoiceRef.set({
                orgId: "org_123",
                total: 100,
                amountPaid: 0,
                amountDue: 100,
                status: "sent",
            });

            // Execute: Call processPayment
            const wrapped = testEnv.wrap(processPayment);
            await wrapped(
                {
                    invoiceId: invoiceRef.id,
                    amount: 50,
                    paymentMode: "credit_card",
                    date: new Date().toISOString(),
                },
                {
                    auth: { uid: "user_123" },
                }
            );

            // Verify: Invoice Updated
            const invoiceSnap = await invoiceRef.get();
            expect(invoiceSnap.data().amountPaid).toBe(50);
            expect(invoiceSnap.data().amountDue).toBe(50);
            expect(invoiceSnap.data().status).toBe("partial");

            // Verify: Payment Created
            const paymentsSnap = await db.collection("payments").where("invoiceId", "==", invoiceRef.id).get();
            expect(paymentsSnap.size).toBe(1);
            expect(paymentsSnap.docs[0].data().amount).toBe(50);
        });

        it("should reject overpayment", async () => {
            const invoiceRef = db.collection("invoices").doc();
            await invoiceRef.set({
                orgId: "org_123",
                total: 100,
                amountPaid: 0,
                status: "sent",
            });

            const wrapped = testEnv.wrap(processPayment);
            await expect(
                wrapped(
                    {
                        invoiceId: invoiceRef.id,
                        amount: 150, // Overpay
                        paymentMode: "cash",
                        date: new Date().toISOString(),
                    },
                    {
                        auth: { uid: "user_123" },
                    }
                )
            ).rejects.toThrow("exceeds amount due");
        });
    });

    describe("finalizeInvoice", () => {
        it("should lock draft invoice", async () => {
            const invoiceRef = db.collection("invoices").doc();
            await invoiceRef.set({
                status: "draft",
                orgId: "org_123",
            });

            const wrapped = testEnv.wrap(finalizeInvoice);
            await wrapped(
                {
                    invoiceId: invoiceRef.id,
                },
                {
                    auth: { uid: "user_123" },
                }
            );

            const snap = await invoiceRef.get();
            expect(snap.data().status).toBe("sent"); // or whatever logic dictates
            expect(snap.data().isFinalized).toBe(true);
        });
    });

    describe("onInvoiceWrite (Aggregation)", () => {
        it("should aggregate revenue", async () => {
            const wrapped = testEnv.wrap(onInvoiceWrite);
            const invoiceSnap = testEnv.firestore.makeDocumentSnapshot(
                {
                    orgId: "org_123",
                    amountPaid: 200,
                    amountDue: 0,
                    status: "paid",
                    date: admin.firestore.Timestamp.now(),
                },
                "invoices/inv_1"
            );

            await wrapped(testEnv.makeChange(null, invoiceSnap));

            // Check analytics doc (needs finding the ID logic: stats_orgId_YYYY_MM)
            // Simplified check logic would go here
        });
    });
});
