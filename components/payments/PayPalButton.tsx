"use client";

import { useEffect, useRef, useState } from "react";


// Use existing window.paypal type if available, otherwise define minimal shape
// This prevents 'Subsequent property declarations must have the same type' error

// Removed global declaration to avoid conflicts

interface PayPalButtonsConfig {
    style?: {
        layout?: "vertical" | "horizontal";
        color?: "gold" | "blue" | "silver" | "white" | "black";
        shape?: "rect" | "pill";
        label?: "paypal" | "checkout" | "buynow" | "pay";
        height?: number;
    };
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }) => Promise<void>;
    onError?: (err: Error) => void;
    onCancel?: () => void;
}

interface PayPalButtonProps {
    invoiceId: string;
    amount: number;
    currency: string;
    onSuccess: (details: PaymentDetails) => void;
    onError?: (error: Error) => void;
    onCancel?: () => void;
    disabled?: boolean;
}

interface PaymentDetails {
    orderId: string;
    captureId: string;
    amountPaid: number;
    status: string;
}

export default function PayPalButton({
    invoiceId,
    amount,
    currency,
    onSuccess,
    onError,
    onCancel,
    disabled = false,
}: PayPalButtonProps) {
    const paypalRef = useRef<HTMLDivElement>(null);
    const [sdkLoaded, setSdkLoaded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load PayPal SDK
    useEffect(() => {
        const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

        if (!clientId) {
            setError("PayPal not configured");
            setLoading(false);
            return;
        }

        // Check if already loaded
        if ((window as any).paypal) {
            setSdkLoaded(true);
            setLoading(false);
            return;
        }

        const script = document.createElement("script");
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}`;
        script.async = true;

        script.onload = () => {
            setSdkLoaded(true);
            setLoading(false);
        };

        script.onerror = () => {
            setError("Failed to load PayPal");
            setLoading(false);
        };

        document.body.appendChild(script);

        return () => {
            // Cleanup if needed
        };
    }, [currency]);

    // Render PayPal buttons
    useEffect(() => {
        if (!sdkLoaded || !(window as any).paypal || !paypalRef.current || disabled) return;

        const buttons = (window as any).paypal.Buttons({
            style: {
                layout: "vertical",
                color: "gold",
                shape: "rect",
                label: "pay",
                height: 45,
            },

            createOrder: async () => {
                try {
                    const response = await fetch("/api/paypal/create-order", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ invoiceId }),
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.error || "Failed to create order");
                    }

                    return data.orderId;
                } catch (err) {
                    console.error("Create order error:", err);
                    throw err;
                }
            },

            onApprove: async (data: { orderID: string }) => {
                try {
                    const response = await fetch("/api/paypal/capture-order", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            orderId: data.orderID,
                            invoiceId,
                        }),
                    });

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(result.error || "Payment failed");
                    }

                    onSuccess({
                        orderId: data.orderID,
                        captureId: result.captureId,
                        amountPaid: result.amountPaid,
                        status: result.status,
                    });
                } catch (err) {
                    console.error("Capture error:", err);
                    onError?.(err as Error);
                }
            },

            onError: (err: any) => {
                console.error("PayPal error:", err);
                onError?.(err);
            },

            onCancel: () => {
                onCancel?.();
            },
        });

        buttons.render(paypalRef.current);

        return () => {
            buttons.close();
        };
    }, [sdkLoaded, invoiceId, disabled, onSuccess, onError, onCancel]);

    if (loading) {
        return (
            <div className="h-12 bg-gray-100 rounded animate-pulse flex items-center justify-center text-gray-500">
                Loading PayPal...
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-12 bg-red-50 rounded flex items-center justify-center text-red-600 text-sm">
                {error}
            </div>
        );
    }

    if (disabled) {
        return (
            <div className="h-12 bg-gray-100 rounded flex items-center justify-center text-gray-500">
                Payment unavailable
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div ref={paypalRef} className="min-h-[45px]" />
            <p className="text-xs text-gray-500 text-center">
                Pay {currency} {amount.toFixed(2)} securely with PayPal
            </p>
        </div>
    );
}
