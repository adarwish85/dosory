import nodemailer from "nodemailer";
import { adminDb } from "@/lib/firebase-admin";

interface SmtpSettings {
    host: string;
    port: number;
    encryption: "ssl" | "tls" | "none";
    username: string;
    password: string;
    fromName: string;
    fromEmail: string;
}

export async function sendEmail(to: string, subject: string, html: string) {
    // Fetch settings
    const settingsDoc = await adminDb.collection("platform").doc("settings").get();
    const settings = settingsDoc.data();

    if (!settings?.smtpSettings) {
        console.warn("SMTP settings not configured in platform/settings");
        return false;
    }

    const { host, port, username, password, encryption, fromEmail, fromName } = settings.smtpSettings as SmtpSettings;

    // Create transporter
    const transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: encryption === "ssl", // true for 465 usually
        auth: {
            user: username,
            pass: password,
        },
        tls: {
            // Do not fail on invalid certs
            rejectUnauthorized: false
        }
    });

    try {
        await transporter.sendMail({
            from: `"${fromName || 'Platform Support'}" <${fromEmail}>`,
            to,
            subject,
            html,
        });
        console.log(`Email sent to ${to}`);
        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
}

export async function sendPasswordResetEmail(to: string, link: string) {
    const subject = "Reset your password";
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to the platform!</h2>
            <p>Your account has been created.</p>
            <p>Please click the link below to set your password and sign in:</p>
            <p><a href="${link}" style="background-color: #0A66C2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Set Password</a></p>
            <p>Or copy this link: ${link}</p>
            <p>If you did not request this, please ignore this email.</p>
        </div>
    `;
    return sendEmail(to, subject, html);
}

export async function sendWelcomeStaffEmail(
    to: string,
    firstName: string,
    portalUrl: string,
    resetPasswordLink: string
): Promise<boolean> {
    const subject = "Welcome to the Team!";
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Welcome, ${firstName}!</h2>
            <p style="color: #666; font-size: 16px;">
                Your account has been created and you're now part of the team.
            </p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; color: #333; font-weight: bold;">Getting Started:</p>
                <ol style="color: #666; padding-left: 20px;">
                    <li>Click the button below to set your password</li>
                    <li>Sign in to the portal</li>
                    <li>Start exploring your dashboard</li>
                </ol>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetPasswordLink}" 
                   style="background-color: #1a1a1a; color: white; padding: 14px 28px; 
                          text-decoration: none; border-radius: 6px; font-weight: bold;
                          display: inline-block;">
                    Set Your Password
                </a>
            </div>

            <p style="color: #666; font-size: 14px;">
                After setting your password, you can access the portal at:<br/>
                <a href="${portalUrl}" style="color: #0A66C2;">${portalUrl}</a>
            </p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            
            <p style="color: #999; font-size: 12px;">
                If you didn't expect this email, please contact your administrator.
            </p>
        </div>
    `;
    return sendEmail(to, subject, html);
}

export async function sendJoinRequestApprovedEmail(
    to: string,
    orgName: string,
    portalUrl: string
): Promise<boolean> {
    const subject = `Join Request Approved - ${orgName}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Welcome to ${orgName}!</h2>
            <p style="color: #666; font-size: 16px;">
                Your request to join the organization has been approved.
            </p>
            
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #dcfce7;">
                <p style="margin: 0; color: #166534; font-weight: bold;">You can now access the portal.</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${portalUrl}" 
                   style="background-color: #1a1a1a; color: white; padding: 14px 28px; 
                          text-decoration: none; border-radius: 6px; font-weight: bold;
                          display: inline-block;">
                    Go to Dashboard
                </a>
            </div>

            <p style="color: #666; font-size: 14px;">
                Direct Link:<br/>
                <a href="${portalUrl}" style="color: #0A66C2;">${portalUrl}</a>
            </p>
        </div>
    `;
    return sendEmail(to, subject, html);
}

export async function sendJoinRequestRejectedEmail(
    to: string,
    orgName: string
): Promise<boolean> {
    const subject = `Join Request Update - ${orgName}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Request status update</h2>
            <p style="color: #666; font-size: 16px;">
                Your request to join <strong>${orgName}</strong> was reviewed.
            </p>
            
            <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fee2e2;">
                <p style="margin: 0; color: #991b1b;">Unfortunately, this request was not approved at this time.</p>
            </div>

            <p style="color: #666; font-size: 14px;">
                If you believe this is an error, please contact the organization administrator directly.
            </p>
        </div>
    `;
    return sendEmail(to, subject, html);
}

export async function sendPortalInviteEmail(email: string | undefined, name: string | undefined, customerSlug: string) {
    if (!email) return;

    // In a real app, generate a secure token for password setup.
    // For now, link to the general portal login or signup.
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${customerSlug}/login`;

    await sendEmail(email, "Invitation to Client Portal", `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Welcome to the Client Portal</h2>
            <p style="color: #666;">Hi ${name || 'there'},</p>
            <p style="color: #666;">You have been invited to access the client portal. You can view invoices, projects, and tickets online.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${portalUrl}" style="background-color: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Access Portal</a>
            </div>
            <p style="color: #666; font-size: 14px;">If you have questions, reply to this email.</p>
        </div>
    `);
}
