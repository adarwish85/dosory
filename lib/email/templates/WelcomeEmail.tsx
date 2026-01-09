import * as React from "react";
import { Button, Heading, Hr, Link, Text } from "@react-email/components";
import { BaseLayout } from "./BaseLayout";

interface WelcomeEmailProps {
    userName: string;
    orgName: string;
    loginUrl: string;
}

export function WelcomeEmail({ userName, orgName, loginUrl }: WelcomeEmailProps) {
    return (
        <BaseLayout previewText={`Welcome to ${orgName}!`}>
            <Heading style={heading}>Welcome to {orgName}! 🎉</Heading>

            <Text style={paragraph}>Hi {userName},</Text>

            <Text style={paragraph}>
                Your account has been successfully created. We're excited to have you on board!
            </Text>

            <Text style={paragraph}>Here's what you can do next:</Text>

            <ul style={list}>
                <li style={listItem}>Set up your company profile</li>
                <li style={listItem}>Add your first customer</li>
                <li style={listItem}>Create your first invoice</li>
                <li style={listItem}>Invite team members</li>
            </ul>

            <Button style={button} href={loginUrl}>
                Go to Dashboard
            </Button>

            <Hr style={hr} />

            <Text style={footerNote}>If you have any questions, feel free to reach out to our support team.</Text>
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

const list = {
    color: "#525f7f",
    fontSize: "16px",
    lineHeight: "26px",
    margin: "0 0 24px",
    paddingLeft: "24px",
};

const listItem = {
    marginBottom: "8px",
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

export default WelcomeEmail;
