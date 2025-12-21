import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { headers } from "next/headers";

export async function POST(req: Request) {
    try {
        const { orderId, planId, billingPeriod } = await req.json();

        // Validate Authentication (Tenant Admin)
        const headerList = await headers();
        const idToken = headerList.get("Authorization")?.split("Bearer ")[1];
        if (!idToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // Get user profile to find Org ID
        const userDoc = await adminDb.collection("users").doc(uid).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const orgId = userDoc.data()?.orgId;
        if (!orgId) {
            return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        // PayPal API Setup
        const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
        const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
        const isSandbox = !process.env.PAYPAL_LIVE_MODE;
        const baseUrl = isSandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

        // 1. Get Access Token
        const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
            method: "POST",
            headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
            body: "grant_type=client_credentials",
        });
        const { access_token } = await tokenResponse.json();

        // 2. Capture Order
        const captureResponse = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${access_token}`,
                "Content-Type": "application/json",
            },
        });

        const captureData = await captureResponse.json();

        if (captureData.status === "COMPLETED") {
            // 3. Activate Subscription in Firestore

            // Get Plan Details
            const planDoc = await adminDb.collection("platform").doc("subscriptionPlans").collection("plans").doc(planId).get();
            const planData = planDoc.data();

            if (!planData) {
                console.error("Plan not found:", planId);
                // Even if plan not found, payment was taken... handle manual resolution or fail gracefully
            }

            // Create Subscription Record
            const startDate = new Date();
            const endDate = new Date();
            if (billingPeriod === 'monthly') {
                endDate.setMonth(endDate.getMonth() + 1);
            } else {
                endDate.setFullYear(endDate.getFullYear() + 1);
            }

            const subscriptionRef = adminDb.collection("subscriptions").doc(orgId);
            await subscriptionRef.set({
                id: orgId, // One active sub per tenant
                tenantId: orgId,
                planId: planId,
                planName: planData?.name || "Unknown Plan",
                status: "active",
                amount: captureData.purchase_units[0].payments.captures[0].amount.value,
                currency: captureData.purchase_units[0].payments.captures[0].amount.currency_code,
                billingPeriod: billingPeriod,
                startDate: startDate,
                endDate: endDate,
                nextBillingDate: endDate,
                paymentMethod: "paypal",
                paypalOrderId: orderId,
                paypalSubscriptionId: null, // One-time payment for now, or subscription ID if using Subscriptions API
                updatedAt: new Date(),
                // Store quotas for quick access (or lookup from plan dynamically)
                quotas: planData?.quotas || {},
                capabilities: planData?.capabilities || {},
            });

            return NextResponse.json({ success: true, captureId: captureData.id });
        } else {
            return NextResponse.json({ error: "Payment not completed", details: captureData }, { status: 400 });
        }

    } catch (error: any) {
        console.error("Capture Order Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
