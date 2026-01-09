// PayPal Configuration and API Helpers

const PAYPAL_API_URL =
    process.env.PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

interface PayPalAccessToken {
    access_token: string;
    token_type: string;
    expires_in: number;
}

// Get PayPal access token
export async function getPayPalAccessToken(): Promise<string> {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error("PayPal credentials not configured");
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
    });

    if (!response.ok) {
        throw new Error("Failed to get PayPal access token");
    }

    const data: PayPalAccessToken = await response.json();
    return data.access_token;
}

interface CreateOrderParams {
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    description?: string;
}

interface PayPalOrder {
    id: string;
    status: string;
    links: Array<{ href: string; rel: string; method: string }>;
}

// Create PayPal order
export async function createPayPalOrder(params: CreateOrderParams): Promise<PayPalOrder> {
    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            intent: "CAPTURE",
            purchase_units: [
                {
                    reference_id: params.invoiceId,
                    description: params.description || `Invoice #${params.invoiceNumber}`,
                    custom_id: params.invoiceId,
                    invoice_id: params.invoiceNumber,
                    amount: {
                        currency_code: params.currency,
                        value: params.amount.toFixed(2),
                    },
                },
            ],
            payment_source: {
                paypal: {
                    experience_context: {
                        payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
                        brand_name: "Dosory",
                        locale: "en-US",
                        landing_page: "LOGIN",
                        user_action: "PAY_NOW",
                        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/success`,
                        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/cancelled`,
                    },
                },
            },
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error("PayPal create order error:", error);
        throw new Error("Failed to create PayPal order");
    }

    return response.json();
}

interface CaptureResult {
    id: string;
    status: string;
    purchase_units: Array<{
        reference_id: string;
        payments: {
            captures: Array<{
                id: string;
                status: string;
                amount: { value: string; currency_code: string };
            }>;
        };
    }>;
    payer: {
        email_address: string;
        payer_id: string;
        name?: { given_name: string; surname: string };
    };
}

// Capture PayPal order (complete payment)
export async function capturePayPalOrder(orderId: string): Promise<CaptureResult> {
    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        const error = await response.text();
        console.error("PayPal capture error:", error);
        throw new Error("Failed to capture PayPal payment");
    }

    return response.json();
}

// Get order details
export async function getPayPalOrder(orderId: string): Promise<PayPalOrder> {
    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${orderId}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error("Failed to get PayPal order");
    }

    return response.json();
}

// Get PayPal client ID for frontend
export function getPayPalClientId(): string {
    return process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";
}
