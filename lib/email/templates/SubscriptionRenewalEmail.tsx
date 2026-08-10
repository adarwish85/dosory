import * as React from "react";
import { Button, Heading, Hr, Text } from "@react-email/components";
import { BaseLayout } from "./BaseLayout";

interface SubscriptionRenewalEmailProps {
    userName: string;
    planName: string;
    amount: string;
    currency: string;
    payUrl: string;
    /** Formatted date the current period ends. */
    periodEnd: string;
    /** Formatted date access stops if nothing is paid. */
    graceEnd: string;
}

/**
 * The renewal notice. EasyKash has no recurring charge, so nothing happens automatically —
 * this email IS the renewal mechanism, and the link is the only way the tenant can pay. It
 * therefore states the amount, the deadline, and what happens if it passes, rather than the
 * usual "your card will be charged" language, which would be a lie here.
 */
export function SubscriptionRenewalEmail({
    userName,
    planName,
    amount,
    currency,
    payUrl,
    periodEnd,
    graceEnd,
}: SubscriptionRenewalEmailProps) {
    return (
        <BaseLayout previewText={`Renew your ${planName} subscription`}>
            <Heading style={heading}>Time to renew your subscription</Heading>

            <Text style={paragraph}>Hi {userName},</Text>

            <Text style={paragraph}>
                Your <strong>{planName}</strong> plan runs until <strong>{periodEnd}</strong>. Payments are not taken
                automatically, so please use the link below to renew.
            </Text>

            <Button style={button} href={payUrl}>
                Pay {currency} {amount}
            </Button>

            <Text style={paragraph}>
                You can pay by card, mobile wallet, or with a Fawry / Aman cash voucher. If you choose a voucher, your
                subscription is renewed once the shop confirms the payment.
            </Text>

            <Hr style={hr} />

            <Text style={footerNote}>
                If nothing is paid by <strong>{graceEnd}</strong>, the workspace moves to read-only until it is renewed.
                Your data is not deleted.
            </Text>
        </BaseLayout>
    );
}

const heading = { fontSize: "24px", fontWeight: "bold", color: "#111827", margin: "0 0 16px" };
const paragraph = { fontSize: "15px", lineHeight: "24px", color: "#374151", margin: "0 0 16px" };
const button = {
    backgroundColor: "#065f46",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "15px",
    fontWeight: 600,
    textDecoration: "none",
    textAlign: "center" as const,
    display: "block",
    padding: "12px",
};
const hr = { borderColor: "#e5e7eb", margin: "24px 0" };
const footerNote = { fontSize: "13px", lineHeight: "20px", color: "#6b7280", margin: 0 };
