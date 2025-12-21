import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { amount, currency = "USD", description } = await req.json();

        // Get Access Token
        const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
        const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

        // Use sandbox for dev, live for prod based on env
        const isSandbox = !process.env.PAYPAL_LIVE_MODE;
        const baseUrl = isSandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";

        if (!clientId || !clientSecret) {
            return NextResponse.json({ error: "PayPal credentials not configured" }, { status: 500 });
        }

        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

        // 1. Get Access Token
        const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
            method: "POST",
            headers: {
                "Authorization": `Basic ${auth}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
        });

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // 2. Create Order
        const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                intent: "CAPTURE",
                purchase_units: [
                    {
                        description: description || "Subscription",
                        amount: {
                            currency_code: currency,
                            value: amount.toFixed(2),
                        },
                    },
                ],
            }),
        });

        const order = await orderResponse.json();
        return NextResponse.json(order);

    } catch (error: any) {
        console.error("Create Order Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
