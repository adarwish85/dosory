import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
    stages: [
        { duration: "30s", target: 20 }, // Wrap up to 20 users
        { duration: "1m", target: 20 }, // Sustained load
        { duration: "10s", target: 0 }, // Scale down
    ],
    thresholds: {
        http_req_duration: ["p(95)<200"], // 95% of requests must complete below 200ms
    },
};

const BASE_URL = "https://us-central1-YOUR_PROJECT.cloudfunctions.net";

export default function () {
    // 1. Test Invoice Fetch (Read Performance)
    // Assuming a deployed API endpoint or direct Firestore read via REST API
    // Here we mock a callable function HTTP trigger for "getInvoices" or similar

    // 2. Test Payment Processing (Write Performance)
    // Note: Needs valid auth token usually. Mocking headers here.
    const payload = JSON.stringify({
        data: {
            invoiceId: "inv_TEST",
            amount: 10,
            paymentMode: "benchmark",
            date: new Date().toISOString(),
        },
    });

    const params = {
        headers: {
            "Content-Type": "application/json",
            // 'Authorization': 'Bearer YOUR_TEST_TOKEN'
        },
    };

    // Mock call to callable function URL structure
    // const res = http.post(`${BASE_URL}/processPayment`, payload, params);

    // check(res, {
    //   'is status 200': (r) => r.status === 200,
    // });

    sleep(1);
}
