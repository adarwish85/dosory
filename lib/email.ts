import nodemailer from "nodemailer";
import { adminDb } from "@/lib/firebase-admin";

interface EmailBranding {
    logoUrl?: string;
    primaryColor?: string;
    footerText?: string;
}

interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    htmlContent: string;
    enabled: boolean;
    variables: { key: string; label: string; description: string }[];
}

// Cache for templates to avoid repeated Firestore reads
const templatesCache: Map<string, EmailTemplate> = new Map();
let brandingCache: EmailBranding | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Fetch branding settings
async function getBranding(): Promise<EmailBranding> {
    const now = Date.now();
    if (brandingCache && now - cacheTimestamp < CACHE_TTL) {
        return brandingCache;
    }

    const settingsDoc = await adminDb.collection("platform").doc("settings").get();
    const settings = settingsDoc.data();

    brandingCache = {
        logoUrl: settings?.emailBranding?.logoUrl || "",
        primaryColor: settings?.emailBranding?.primaryColor || "#1a1a1a",
        footerText: settings?.emailBranding?.footerText || "© 2024 Dosory. All rights reserved.",
    };
    cacheTimestamp = now;

    return brandingCache;
}

// Fetch a template from Firestore
async function getTemplate(templateId: string): Promise<EmailTemplate | null> {
    const now = Date.now();
    const cached = templatesCache.get(templateId);

    if (cached && now - cacheTimestamp < CACHE_TTL) {
        return cached;
    }

    try {
        const docRef = adminDb.collection("platform").doc("emailTemplates").collection("templates").doc(templateId);
        const doc = await docRef.get();

        if (!doc.exists) {
            console.warn(`Email template "${templateId}" not found in Firestore`);
            return null;
        }

        const template = { id: doc.id, ...doc.data() } as EmailTemplate;
        templatesCache.set(templateId, template);
        cacheTimestamp = now;

        return template;
    } catch (error) {
        console.error(`Error fetching template "${templateId}":`, error);
        return null;
    }
}

// Replace variables in content
function replaceVariables(content: string, variables: Record<string, string>): string {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`{{${key}}}`, "g"), value || "");
    }
    return result;
}

// Apply branding to HTML content
function applyBranding(html: string, branding: EmailBranding): string {
    return html
        .replace(/{{logoUrl}}/g, branding.logoUrl || "")
        .replace(/{{footerText}}/g, branding.footerText || "")
        .replace(/{{primaryColor}}/g, branding.primaryColor || "#1a1a1a");
}

// Core email sending function
//
// SMTP credentials are read from process.env (Stage 3.0.4 — migrated out of
// platform/settings.smtpSettings, which was world-readable in Firestore).
// SMTP_PASSWORD comes from Secret Manager via apphosting.yaml; the other six
// SMTP_* vars are inline non-secrets.
export async function sendEmail(to: string, subject: string, html: string) {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const username = process.env.SMTP_USERNAME;
    const password = process.env.SMTP_PASSWORD;
    const encryption = process.env.SMTP_ENCRYPTION;
    const fromEmail = process.env.SMTP_FROM_EMAIL;
    const fromName = process.env.SMTP_FROM_NAME;

    if (!host || !port || !username || !password || !fromEmail) {
        console.warn(
            "SMTP env vars not configured (SMTP_HOST/SMTP_PORT/SMTP_USERNAME/SMTP_PASSWORD/SMTP_FROM_EMAIL required)"
        );
        return false;
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: encryption === "ssl",
        auth: {
            user: username,
            pass: password,
        },
        tls: {
            rejectUnauthorized: false,
        },
    });

    try {
        await transporter.sendMail({
            from: `"${fromName || "Platform Support"}" <${fromEmail}>`,
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

// Send email using a template from Firestore
export async function sendTemplatedEmail(
    templateId: string,
    to: string,
    variables: Record<string, string>
): Promise<boolean> {
    // Fetch template
    const template = await getTemplate(templateId);

    if (!template) {
        console.error(`Template "${templateId}" not found, falling back to basic email`);
        return false;
    }

    // Check if template is enabled
    if (!template.enabled) {
        console.warn(`Template "${templateId}" is disabled, skipping email`);
        return false;
    }

    // Fetch branding
    const branding = await getBranding();

    // Replace variables and apply branding
    const subject = replaceVariables(template.subject, variables);
    let html = replaceVariables(template.htmlContent, variables);
    html = applyBranding(html, branding);

    return sendEmail(to, subject, html);
}

// ============================================
// CONVENIENCE FUNCTIONS (using templates)
// ============================================

export async function sendPasswordResetEmail(to: string, resetLink: string, userName?: string) {
    const sent = await sendTemplatedEmail("password_reset", to, {
        userName: userName || "User",
        resetLink,
        expiryTime: "24 hours",
    });

    // Fallback to hardcoded if template fails
    if (!sent) {
        const subject = "Reset your password";
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Reset Your Password</h2>
                <p>Click the link below to set your password:</p>
                <p><a href="${resetLink}" style="background-color: #1a1a1a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Set Password</a></p>
                <p>Or copy this link: ${resetLink}</p>
            </div>
        `;
        return sendEmail(to, subject, html);
    }
    return sent;
}

export async function sendWelcomeTenantEmail(
    to: string,
    adminName: string,
    orgName: string,
    resetLink: string,
    loginUrl?: string
): Promise<boolean> {
    const sent = await sendTemplatedEmail("welcome_tenant", to, {
        adminName,
        orgName,
        resetLink,
        loginUrl: loginUrl || process.env.NEXT_PUBLIC_APP_URL || "",
        platformName: "Dosory",
    });

    if (!sent) {
        // Fallback
        return sendPasswordResetEmail(to, resetLink, adminName);
    }
    return sent;
}

export async function sendWelcomeStaffEmail(
    to: string,
    firstName: string,
    portalUrl: string,
    resetPasswordLink: string
): Promise<boolean> {
    const sent = await sendTemplatedEmail("welcome_staff", to, {
        firstName,
        orgName: "Your Organization",
        portalUrl,
        resetLink: resetPasswordLink,
    });

    if (!sent) {
        // Fallback to hardcoded
        const subject = "Welcome to the Team!";
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>Welcome, ${firstName}!</h2>
                <p>Your account has been created.</p>
                <p><a href="${resetPasswordLink}" style="background-color: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px;">Set Your Password</a></p>
                <p>Portal: <a href="${portalUrl}">${portalUrl}</a></p>
            </div>
        `;
        return sendEmail(to, subject, html);
    }
    return sent;
}

export async function sendJoinRequestApprovedEmail(to: string, orgName: string, portalUrl: string): Promise<boolean> {
    const sent = await sendTemplatedEmail("join_request_approved", to, {
        userName: "User",
        orgName,
        portalUrl,
    });

    if (!sent) {
        const subject = `Join Request Approved - ${orgName}`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>Welcome to ${orgName}!</h2>
                <p>Your request to join has been approved.</p>
                <p><a href="${portalUrl}" style="background-color: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px;">Go to Dashboard</a></p>
            </div>
        `;
        return sendEmail(to, subject, html);
    }
    return sent;
}

export async function sendJoinRequestRejectedEmail(to: string, orgName: string): Promise<boolean> {
    const sent = await sendTemplatedEmail("join_request_rejected", to, {
        userName: "User",
        orgName,
    });

    if (!sent) {
        const subject = `Join Request Update - ${orgName}`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>Request Status Update</h2>
                <p>Your request to join <strong>${orgName}</strong> was not approved at this time.</p>
            </div>
        `;
        return sendEmail(to, subject, html);
    }
    return sent;
}

export async function sendPortalInviteEmail(email: string | undefined, name: string | undefined, customerSlug: string) {
    if (!email) return false;

    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${customerSlug}/login`;

    // No template for this yet, use direct send
    await sendEmail(
        email,
        "Invitation to Client Portal",
        `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Welcome to the Client Portal</h2>
            <p>Hi ${name || "there"},</p>
            <p>You have been invited to access the client portal.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${portalUrl}" style="background-color: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">Access Portal</a>
            </div>
        </div>
    `
    );
    return true;
}

// ============================================
// INVOICE EMAILS
// ============================================

export async function sendInvoiceCreatedEmail(
    to: string,
    customerName: string,
    invoiceNumber: string,
    amount: string,
    dueDate: string,
    viewLink: string,
    orgName: string
): Promise<boolean> {
    return sendTemplatedEmail("invoice_created", to, {
        customerName,
        invoiceNumber,
        amount,
        dueDate,
        viewLink,
        orgName,
    });
}

export async function sendInvoiceReminderEmail(
    to: string,
    customerName: string,
    invoiceNumber: string,
    amount: string,
    dueDate: string,
    payLink: string
): Promise<boolean> {
    return sendTemplatedEmail("invoice_reminder", to, {
        customerName,
        invoiceNumber,
        amount,
        dueDate,
        payLink,
    });
}

export async function sendInvoiceOverdueEmail(
    to: string,
    customerName: string,
    invoiceNumber: string,
    amount: string,
    daysOverdue: string,
    payLink: string
): Promise<boolean> {
    return sendTemplatedEmail("invoice_overdue", to, {
        customerName,
        invoiceNumber,
        amount,
        daysOverdue,
        payLink,
    });
}

// ============================================
// SUPPORT EMAILS
// ============================================

export async function sendTicketCreatedEmail(
    to: string,
    customerName: string,
    ticketId: string,
    subject: string,
    viewLink: string
): Promise<boolean> {
    return sendTemplatedEmail("ticket_created", to, {
        customerName,
        ticketId,
        subject,
        viewLink,
    });
}

export async function sendTicketReplyEmail(
    to: string,
    customerName: string,
    ticketId: string,
    agentName: string,
    replyPreview: string,
    viewLink: string
): Promise<boolean> {
    return sendTemplatedEmail("ticket_reply", to, {
        customerName,
        ticketId,
        agentName,
        replyPreview,
        viewLink,
    });
}

export async function sendTicketClosedEmail(
    to: string,
    customerName: string,
    ticketId: string,
    subject: string,
    feedbackLink: string
): Promise<boolean> {
    return sendTemplatedEmail("ticket_closed", to, {
        customerName,
        ticketId,
        subject,
        feedbackLink,
    });
}

// ============================================
// PROJECT/TASK EMAILS
// ============================================

export async function sendProjectAssignedEmail(
    to: string,
    userName: string,
    projectName: string,
    deadline: string,
    viewLink: string
): Promise<boolean> {
    return sendTemplatedEmail("project_assigned", to, {
        userName,
        projectName,
        deadline,
        viewLink,
    });
}

export async function sendTaskAssignedEmail(
    to: string,
    userName: string,
    taskName: string,
    projectName: string,
    dueDate: string,
    viewLink: string
): Promise<boolean> {
    return sendTemplatedEmail("task_assigned", to, {
        userName,
        taskName,
        projectName,
        dueDate,
        viewLink,
    });
}

export async function sendTaskDueReminderEmail(
    to: string,
    userName: string,
    taskName: string,
    dueDate: string,
    viewLink: string
): Promise<boolean> {
    return sendTemplatedEmail("task_due_reminder", to, {
        userName,
        taskName,
        dueDate,
        viewLink,
    });
}

// Clear cache (useful for testing or when templates are updated)
export function clearEmailCache() {
    templatesCache.clear();
    brandingCache = null;
    cacheTimestamp = 0;
}
