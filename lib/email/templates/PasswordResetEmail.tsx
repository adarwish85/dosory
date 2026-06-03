import * as React from "react";
import { Button, Heading, Hr, Text } from "@react-email/components";
import { BaseLayout } from "./BaseLayout";

interface PasswordResetEmailProps {
    userName: string;
    resetUrl: string;
}

export function PasswordResetEmail({ userName, resetUrl }: PasswordResetEmailProps) {
    return (
        <BaseLayout previewText="Reset your password">
            <Heading style={heading}>Reset Your Password</Heading>

            <Text style={paragraph}>Hi {userName},</Text>

            <Text style={paragraph}>
                We received a request to reset your password. Click the button below to choose a new password:
            </Text>

            <Button style={button} href={resetUrl}>
                Reset Password
            </Button>

            <Hr style={hr} />

            <Text style={footerNote}>
                This link expires in 1 hour. If you didn&apos;t request a password reset, you can safely ignore this email -
                your password won&apos;t be changed.
            </Text>
        </BaseLayout>
    );
}

// Styles
const heading = {
    color: "#1e3a5f",
    fontSize: "24px",
    fontWeight: "600",
    lineHeight: "32px",
    margin: "0 0 24px",
};

const paragraph = {
    color: "#525f7f",
    fontSize: "16px",
    lineHeight: "26px",
    margin: "0 0 16px",
};

const button = {
    backgroundColor: "#3b82f6",
    borderRadius: "8px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "16px",
    fontWeight: "600",
    lineHeight: "50px",
    padding: "0 24px",
    textAlign: "center" as const,
    textDecoration: "none",
};

const hr = {
    border: "none",
    borderTop: "1px solid #e6ebf1",
    margin: "32px 0",
};

const footerNote = {
    color: "#8898aa",
    fontSize: "14px",
    lineHeight: "22px",
    margin: "0",
};

export default PasswordResetEmail;
