import * as React from "react";
import { Button, Heading, Hr, Text } from "@react-email/components";
import { BaseLayout } from "./BaseLayout";

interface TeamInviteEmailProps {
    inviterName: string;
    orgName: string;
    role: string;
    inviteUrl: string;
}

export function TeamInviteEmail({ inviterName, orgName, role, inviteUrl }: TeamInviteEmailProps) {
    return (
        <BaseLayout previewText={`You've been invited to join ${orgName}`}>
            <Heading style={heading}>You&apos;re Invited! 🤝</Heading>

            <Text style={paragraph}>
                {inviterName} has invited you to join <strong>{orgName}</strong> as a <strong>{role}</strong>.
            </Text>

            <Text style={paragraph}>Click the button below to accept the invitation and create your account:</Text>

            <Button style={button} href={inviteUrl}>
                Accept Invitation
            </Button>

            <Hr style={hr} />

            <Text style={footerNote}>
                This invitation expires in 7 days. If you didn&apos;t expect this invitation, you can safely ignore this
                email.
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

export default TeamInviteEmail;
