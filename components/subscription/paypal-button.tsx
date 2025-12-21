"use client";

import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface PayPalButtonProps {
    amount: number;
    currency?: string;
    description?: string;
    planId: string;
    billingPeriod: "monthly" | "yearly";
    onSuccess: (details: any) => void;
    onError: (error: any) => void;
}

export function SubscriptionPayPalButton({
    amount,
    currency = "USD",
    description,
    planId,
    billingPeriod,
    onSuccess,
    onError
}: PayPalButtonProps) {
    const [isPending, setIsPending] = useState(false);

    const initialOptions = {
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test",
        currency: currency,
        intent: "capture",
    };

    return (
        <PayPalScriptProvider options={initialOptions}>
            <div className="w-full relative z-0">
                {isPending && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                )}

                <PayPalButtons
                    style={{ layout: "vertical", shape: "rect" }}
                    createOrder={async (data, actions) => {
                        setIsPending(true);
                        try {
                            const response = await fetch("/api/paypal/create-order", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    amount,
                                    currency,
                                    description,
                                    planId,
                                    billingPeriod
                                }),
                            });

                            const order = await response.json();
                            if (order.error) throw new Error(order.error);
                            return order.id;
                        } catch (err) {
                            setIsPending(false);
                            onError(err);
                            return "";
                        }
                    }}
                    onApprove={async (data, actions) => {
                        try {
                            const response = await fetch("/api/paypal/capture-order", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    orderId: data.orderID,
                                    planId,
                                    billingPeriod
                                }),
                            });

                            const details = await response.json();
                            if (details.error) throw new Error(details.error);

                            onSuccess(details);
                        } catch (err) {
                            onError(err);
                        } finally {
                            setIsPending(false);
                        }
                    }}
                    onError={(err) => {
                        setIsPending(false);
                        console.error("PayPal Error:", err);
                        onError(err);
                    }}
                    onCancel={() => {
                        setIsPending(false);
                    }}
                />
            </div>
        </PayPalScriptProvider>
    );
}
