// Seed script for email templates
// Run with: node scripts/seed-email-templates.js

const fs = require('fs');
const path = require('path');
const admin = require("firebase-admin");

// Parse .env.local for Firebase credentials
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const startMarker = 'FIREBASE_SERVICE_ACCOUNT_KEY=';
const startIndex = envContent.indexOf(startMarker);
const jsonStart = startIndex + startMarker.length;
let braceCount = 0;
let jsonEnd = jsonStart;
let inString = false;
let escaped = false;

for (let i = jsonStart; i < envContent.length; i++) {
    const char = envContent[i];
    if (escaped) { escaped = false; continue; }
    if (char === '\\') { escaped = true; continue; }
    if (char === '"') { inString = !inString; continue; }
    if (!inString) {
        if (char === '{') braceCount++;
        else if (char === '}') {
            braceCount--;
            if (braceCount === 0) { jsonEnd = i + 1; break; }
        }
    }
}

const serviceAccount = JSON.parse(envContent.substring(jsonStart, jsonEnd));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

// Base email wrapper with branding
const wrapWithBranding = (content) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
        <img src="{{logoUrl}}" alt="Logo" style="max-height: 50px;" />
    </div>
    
    ${content}
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
    
    <div style="text-align: center; color: #999; font-size: 12px;">
        <p>{{footerText}}</p>
    </div>
</div>
`;

// All 25 email templates
const templates = [
    // Account & Authentication (6)
    {
        id: "password_reset",
        name: "Password Reset",
        category: "account",
        description: "Sent when a user requests to reset their password",
        subject: "Reset your password",
        variables: [
            { key: "userName", label: "User Name", description: "The recipient's full name" },
            { key: "resetLink", label: "Reset Link", description: "Password reset URL" },
            { key: "expiryTime", label: "Expiry Time", description: "When the link expires (e.g., '24 hours')" }
        ],
        htmlContent: wrapWithBranding(`
            <h2 style="color: #333;">Reset Your Password</h2>
            <p style="color: #666; font-size: 16px;">Hi {{userName}},</p>
            <p style="color: #666; font-size: 16px;">We received a request to reset your password. Click the button below to set a new password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{resetLink}}" style="background-color: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
            </div>
            
            <p style="color: #666; font-size: 14px;">This link will expire in {{expiryTime}}.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        `)
    },
    {
        id: "welcome_tenant",
        name: "Welcome Tenant Admin",
        category: "account",
        description: "Sent when Super Admin creates a new tenant account",
        subject: "Welcome to {{platformName}}!",
        variables: [
            { key: "orgName", label: "Organization Name", description: "The tenant's organization name" },
            { key: "adminName", label: "Admin Name", description: "The tenant admin's name" },
            { key: "loginUrl", label: "Login URL", description: "Portal login URL" },
            { key: "resetLink", label: "Reset Link", description: "Password setup URL" },
            { key: "platformName", label: "Platform Name", description: "Name of the platform" }
        ],
        htmlContent: wrapWithBranding(`
            <h2 style="color: #333;">Welcome to {{platformName}}!</h2>
            <p style="color: #666; font-size: 16px;">Hi {{adminName}},</p>
            <p style="color: #666; font-size: 16px;">Your organization <strong>{{orgName}}</strong> has been set up and is ready to use.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #333; font-weight: bold;">Getting Started:</p>
                <ol style="color: #666; padding-left: 20px;">
                    <li>Click the button below to set your password</li>
                    <li>Log in to your admin dashboard</li>
                    <li>Start configuring your workspace</li>
                </ol>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{resetLink}}" style="background-color: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Set Your Password</a>
            </div>
        `)
    },
    {
        id: "welcome_staff",
        name: "Welcome Staff Member",
        category: "account",
        description: "Sent when a staff member is added to an organization",
        subject: "Welcome to the team!",
        variables: [
            { key: "firstName", label: "First Name", description: "Staff member's first name" },
            { key: "orgName", label: "Organization Name", description: "Organization name" },
            { key: "portalUrl", label: "Portal URL", description: "Login portal URL" },
            { key: "resetLink", label: "Reset Link", description: "Password setup URL" }
        ],
        htmlContent: wrapWithBranding(`
            <h2 style="color: #333;">Welcome, {{firstName}}!</h2>
            <p style="color: #666; font-size: 16px;">You've been added to <strong>{{orgName}}</strong>.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; color: #333; font-weight: bold;">Getting Started:</p>
                <ol style="color: #666; padding-left: 20px;">
                    <li>Click the button below to set your password</li>
                    <li>Sign in to the portal</li>
                    <li>Start exploring your dashboard</li>
                </ol>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{resetLink}}" style="background-color: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Set Your Password</a>
            </div>
            
            <p style="color: #666; font-size: 14px;">Portal: <a href="{{portalUrl}}" style="color: #0A66C2;">{{portalUrl}}</a></p>
        `)
    },
    {
        id: "email_verification",
        name: "Email Verification",
        category: "account",
        description: "Sent to verify a user's email address",
        subject: "Verify your email address",
        variables: [
            { key: "userName", label: "User Name", description: "The recipient's name" },
            { key: "verifyLink", label: "Verify Link", description: "Email verification URL" },
            { key: "expiryTime", label: "Expiry Time", description: "When the link expires" }
        ],
        htmlContent: wrapWithBranding(`
            <h2 style="color: #333;">Verify Your Email</h2>
            <p style="color: #666; font-size: 16px;">Hi {{userName}},</p>
            <p style="color: #666; font-size: 16px;">Please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{verifyLink}}" style="background-color: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email</a>
            </div>
            
            <p style="color: #666; font-size: 14px;">This link will expire in {{expiryTime}}.</p>
        `)
    },
    {
        id: "account_locked",
        name: "Account Locked",
        category: "account",
        description: "Sent when an account is locked due to security reasons",
        subject: "Your account has been locked",
        variables: [
            { key: "userName", label: "User Name", description: "The recipient's name" },
            { key: "unlockLink", label: "Unlock Link", description: "Account unlock URL" },
            { key: "reason", label: "Reason", description: "Why the account was locked" }
        ],
        htmlContent: wrapWithBranding(`
            <h2 style="color: #333;">Account Security Alert</h2>
            <p style="color: #666; font-size: 16px;">Hi {{userName}},</p>
            <p style="color: #666; font-size: 16px;">Your account has been temporarily locked for security reasons:</p>
            
            <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fee2e2;">
                <p style="margin: 0; color: #991b1b;">{{reason}}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{unlockLink}}" style="background-color: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Unlock Account</a>
            </div>
            
            <p style="color: #666; font-size: 14px;">If you didn't attempt to access your account, please contact support immediately.</p>
        `)
    },
    {
        id: "login_alert",
        name: "New Login Alert",
        category: "account",
        description: "Sent when a new device logs into the account",
        subject: "New login detected",
        variables: [
            { key: "userName", label: "User Name", description: "The recipient's name" },
            { key: "deviceInfo", label: "Device Info", description: "Device/browser information" },
            { key: "location", label: "Location", description: "Approximate login location" },
            { key: "time", label: "Time", description: "When the login occurred" }
        ],
        htmlContent: wrapWithBranding(`
            <h2 style="color: #333;">New Login Detected</h2>
            <p style="color: #666; font-size: 16px;">Hi {{userName}},</p>
            <p style="color: #666; font-size: 16px;">We detected a new login to your account:</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Device:</strong> {{deviceInfo}}</p>
                <p style="margin: 0 0 10px 0;"><strong>Location:</strong> {{location}}</p>
                <p style="margin: 0;"><strong>Time:</strong> {{time}}</p>
            </div>
            
            <p style="color: #666; font-size: 14px;">If this was you, no action is needed. If you don't recognize this login, please secure your account immediately.</p>
        `)
    },

    // Team & Access (4)
    {
        id: "join_request_approved",
        name: "Join Request Approved",
        category: "team",
        description: "Sent when a user's request to join an organization is approved",
        subject: "Welcome to {{orgName}}!",
        variables: [
            { key: "userName", label: "User Name", description: "The recipient's name" },
            { key: "orgName", label: "Organization Name", description: "Organization name" },
            { key: "portalUrl", label: "Portal URL", description: "Login portal URL" }
        ],
        htmlContent: wrapWithBranding(`
            <h2 style="color: #333;">Welcome to {{orgName}}!</h2>
            <p style="color: #666; font-size: 16px;">Hi {{userName}},</p>
            <p style="color: #666; font-size: 16px;">Great news! Your request to join <strong>{{orgName}}</strong> has been approved.</p>
            
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #dcfce7;">
                <p style="margin: 0; color: #166534; font-weight: bold;">You can now access the portal.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{portalUrl}}" style="background-color: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
            </div>
        `)
    },
    {
        id: "join_request_rejected",
        name: "Join Request Rejected",
        category: "team",
        description: "Sent when a user's join request is declined",
        subject: "Join Request Update - {{orgName}}",
        variables: [
            { key: "userName", label: "User Name", description: "The recipient's name" },
            { key: "orgName", label: "Organization Name", description: "Organization name" }
        ],
        htmlContent: wrapWithBranding(`
            <h2 style="color: #333;">Request Status Update</h2>
            <p style="color: #666; font-size: 16px;">Hi {{userName}},</p>
            <p style="color: #666; font-size: 16px;">Your request to join <strong>{{orgName}}</strong> was reviewed.</p>
            
            <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fee2e2;">
                <p style="margin: 0; color: #991b1b;">Unfortunately, this request was not approved at this time.</p>
            </div>
            
            <p style="color: #666; font-size: 14px;">If you believe this is an error, please contact the organization administrator directly.</p>
        `)
    },
    {
        id: "role_changed",
        name: "Role Changed",
        category: "team",
        description: "Sent when a user's role is updated",
        subject: "Your role has been updated",
        variables: [
            { key: "userName", label: "User Name", description: "The recipient's name" },
            { key: "oldRole", label: "Old Role", description: "Previous role name" },
            { key: "newRole", label: "New Role", description: "New role name" },
            { key: "orgName", label: "Organization Name", description: "Organization name" }
        ],
        htmlContent: wrapWithBranding(`
            <h2 style="color: #333;">Role Update</h2>
            <p style="color: #666; font-size: 16px;">Hi {{userName}},</p>
            <p style="color: #666; font-size: 16px;">Your role at <strong>{{orgName}}</strong> has been updated:</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Previous Role:</strong> {{oldRole}}</p>
                <p style="margin: 0;"><strong>New Role:</strong> {{newRole}}</p>
            </div>
            
            <p style="color: #666; font-size: 14px;">Your permissions may have changed. Please contact your administrator if you have questions.</p>
        `)
    },
    {
        id: "team_invitation",
        name: "Team Invitation",
        category: "team",
        description: "Sent to invite someone to join an organization",
        subject: "You're invited to join {{orgName}}",
        variables: [
            { key: "inviterName", label: "Inviter Name", description: "Name of person who invited" },
            { key: "orgName", label: "Organization Name", description: "Organization name" },
            { key: "inviteLink", label: "Invite Link", description: "Invitation acceptance URL" },
            { key: "expiryTime", label: "Expiry Time", description: "When invitation expires" }
        ],
        htmlContent: wrapWithBranding(`
            <h2 style="color: #333;">You're Invited!</h2>
            <p style="color: #666; font-size: 16px;"><strong>{{inviterName}}</strong> has invited you to join <strong>{{orgName}}</strong>.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{inviteLink}}" style="background-color: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Accept Invitation</a>
            </div>
            
            <p style="color: #666; font-size: 14px;">This invitation will expire in {{expiryTime}}.</p>
        `)
    },

    // Billing & Subscription (5)
    {
        id: "subscription_created",
        name: "Subscription Started",
        category: "billing",
        description: "Sent when a new subscription is activated",
        subject: "Your subscription is active!",
        variables: [
            { key: "orgName", label: "Organization Name", description: "Organization name" },
            { key: "planName", label: "Plan Name", description: "Subscription plan name" },
            { key: "startDate", label: "Start Date", description: "Subscription start date" },
            { key: "amount", label: "Amount", description: "Subscription cost" }
        ],
        htmlContent: wrapWithBranding(`
            <h2 style="color: #333;">Subscription Activated!</h2>
            <p style="color: #666; font-size: 16px;">Great news! Your subscription for <strong>{{orgName}}</strong> is now active.</p>
            
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #dcfce7;">
                <p style="margin: 0 0 10px 0;"><strong>Plan:</strong> {{planName}}</p>
                <p style="margin: 0 0 10px 0;"><strong>Started:</strong> {{startDate}}</p>
                <p style="margin: 0;"><strong>Amount:</strong> {{amount}}</p>
            </div>
            
            <p style="color: #666; font-size: 14px;">Thank you for your subscription!</p>
        `)
    },
    {
        id: "subscription_cancelled",
        name: "Subscription Cancelled",
        category: "billing",
        description: "Sent when a subscription is cancelled",
        subject: "Subscription cancelled",
        variables: [
            { key: "orgName", label: "Organization Name", description: "Organization name" },
            { key: "planName", label: "Plan Name", description: "Subscription plan name" },
            { key: "endDate", label: "End Date", description: "When access ends" }
        ],
        htmlContent: wrapWithBranding(`
            <h2 style="color: #333;">Subscription Cancelled</h2>
            <p style="color: #666; font-size: 16px;">Your subscription for <strong>{{orgName}}</strong> has been cancelled.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Plan:</strong> {{planName}}</p>
                <p style="margin: 0;"><strong>Access Until:</strong> {{endDate}}</p>
            </div>
            
            <p style="color: #666; font-size: 14px;">We're sorry to see you go. You can resubscribe anytime.</p>
        `)
    },
    {
        id: "subscription_expiring",
        name: "Subscription Expiring",
        category: "billing",
        description: "Warning that subscription is about to expire",
        subject: "Your subscription is ending soon",
        variables: [
            { key: "orgName", label: "Organization Name", description: "Organization name" },
            { key: "planName", label: "Plan Name", description: "Subscription plan name" },
            { key: "expiryDate", label: "Expiry Date", description: "When subscription ends" },
            { key: "renewLink", label: "Renew Link", description: "Renewal URL" }
        ],
        htmlContent: wrapWithBranding(`
            <h2 style="color: #333;">Subscription Ending Soon</h2>
            <p style="color: #666; font-size: 16px;">Your subscription for <strong>{{orgName}}</strong> is expiring soon.</p>
            
            <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fef3c7;">
                <p style="margin: 0 0 10px 0;"><strong>Plan:</strong> {{planName}}</p>
                <p style="margin: 0;"><strong>Expires:</strong> {{expiryDate}}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{renewLink}}" style="background-color: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Renew Now</a>
            </div>
        `)
    },
    {
        id: "payment_success",
        name: "Payment Successful",
        category: "billing",
        description: "Sent when a payment is successfully processed",
        subject: "Payment received - Thank you!",
        variables: [
            { key: "orgName", label: "Organization Name", description: "Organization name" },
            { key: "amount", label: "Amount", description: "Payment amount" },
            { key: "invoiceNumber", label: "Invoice Number", description: "Invoice reference" },
            { key: "receiptLink", label: "Receipt Link", description: "Receipt download URL" }
        ],
        htmlContent: wrapWithBranding(`
            <h2 style="color: #333;">Payment Received</h2>
            <p style="color: #666; font-size: 16px;">Thank you! We've received your payment for <strong>{{orgName}}</strong>.</p>
            
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #dcfce7;">
                <p style="margin: 0 0 10px 0;"><strong>Amount:</strong> {{amount}}</p>
                <p style="margin: 0;"><strong>Invoice:</strong> {{invoiceNumber}}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{receiptLink}}" style="background-color: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Download Receipt</a>
            </div>
        `)
    },
    {
        id: "payment_failed",
        name: "Payment Failed",
        category: "billing",
        description: "Sent when a payment cannot be processed",
        subject: "Payment failed - Action required",
        variables: [
            { key: "orgName", label: "Organization Name", description: "Organization name" },
            { key: "amount", label: "Amount", description: "Payment amount" },
            { key: "reason", label: "Reason", description: "Why payment failed" },
            { key: "updatePaymentLink", label: "Update Payment Link", description: "Update payment method URL" }
        ],
        htmlContent: wrapWithBranding(`
            <h2 style="color: #333;">Payment Failed</h2>
            <p style="color: #666; font-size: 16px;">We couldn't process your payment for <strong>{{orgName}}</strong>.</p>
            
            <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fee2e2;">
                <p style="margin: 0 0 10px 0;"><strong>Amount:</strong> {{amount}}</p>
                <p style="margin: 0;"><strong>Reason:</strong> {{reason}}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{updatePaymentLink}}" style="background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Update Payment Method</a>
            </div>
        `)
    },

    // Invoices & Estimates (4)
    {
        id: "invoice_created",
        name: "Invoice Created",
        category: "invoices",
        description: "Sent when a new invoice is created for a customer",
        subject: "Invoice #{{invoiceNumber}} from {{orgName}}",
        variables: [
            { key: "customerName", label: "Customer Name", description: "Customer's name" },
            { key: "invoiceNumber", label: "Invoice Number", description: "Invoice reference number" },
            { key: "amount", label: "Amount", description: "Invoice total" },
            { key: "dueDate", label: "Due Date", description: "Payment due date" },
            { key: "viewLink", label: "View Link", description: "Invoice view URL" },
            { key: "orgName", label: "Organization Name", description: "Sending organization" }
        ],
        htmlContent: wrapWithBranding(`
            <h2 style="color: #333;">Invoice #{{invoiceNumber}}</h2>
            <p style="color: #666; font-size: 16px;">Hi {{customerName}},</p>
            <p style="color: #666; font-size: 16px;">A new invoice has been created for you:</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Amount Due:</strong> {{amount}}</p>
                <p style="margin: 0;"><strong>Due Date:</strong> {{dueDate}}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{viewLink}}" style="background-color: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View & Pay Invoice</a>
            </div>
        `)
    },
    {
        id: "invoice_reminder",
        name: "Invoice Reminder",
        category: "invoices",
        description: "Reminder for an unpaid invoice",
        subject: "Reminder: Invoice #{{invoiceNumber}} is due",
        variables: [
            { key: "customerName", label: "Customer Name", description: "Customer's name" },
            { key: "invoiceNumber", label: "Invoice Number", description: "Invoice reference" },
            { key: "amount", label: "Amount", description: "Amount due" },
            { key: "dueDate", label: "Due Date", description: "Payment due date" },
            { key: "payLink", label: "Pay Link", description: "Payment URL" }
        ],
        htmlContent: wrapWithBranding(`
            <h2 style="color: #333;">Payment Reminder</h2>
            <p style="color: #666; font-size: 16px;">Hi {{customerName}},</p>
            <p style="color: #666; font-size: 16px;">This is a friendly reminder that Invoice #{{invoiceNumber}} is due.</p>
            
            <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fef3c7;">
                <p style="margin: 0 0 10px 0;"><strong>Amount:</strong> {{amount}}</p>
                <p style="margin: 0;"><strong>Due Date:</strong> {{dueDate}}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{payLink}}" style="background-color: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Pay Now</a>
            </div>
        `)
    },
    {
        id: "invoice_overdue",
        name: "Invoice Overdue",
        category: "invoices",
        description: "Notification that an invoice is past due",
        subject: "Overdue: Invoice #{{invoiceNumber}}",
        variables: [
            { key: "customerName", label: "Customer Name", description: "Customer's name" },
            { key: "invoiceNumber", label: "Invoice Number", description: "Invoice reference" },
            { key: "amount", label: "Amount", description: "Amount overdue" },
            { key: "daysOverdue", label: "Days Overdue", description: "Number of days past due" },
            { key: "payLink", label: "Pay Link", description: "Payment URL" }
        ],
        htmlContent: wrapWithBranding(`
            <h2 style="color: #333;">Invoice Overdue</h2>
            <p style="color: #666; font-size: 16px;">Hi {{customerName}},</p>
            <p style="color: #666; font-size: 16px;">Invoice #{{invoiceNumber}} is now overdue.</p>
            
            <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fee2e2;">
                <p style="margin: 0 0 10px 0;"><strong>Amount:</strong> {{amount}}</p>
                <p style="margin: 0;"><strong>Days Overdue:</strong> {{daysOverdue}}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{payLink}}" style="background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Pay Now</a>
            </div>
            
            <p style="color: #666; font-size: 14px;">Please settle this invoice as soon as possible to avoid any service interruptions.</p>
        `)
    },
    {
        id: "estimate_sent",
        name: "Estimate Sent",
        category: "invoices",
        description: "Sent when an estimate/quote is created for a customer",
        subject: "Estimate #{{estimateNumber}} from {{orgName}}",
        variables: [
            { key: "customerName", label: "Customer Name", description: "Customer's name" },
            { key: "estimateNumber", label: "Estimate Number", description: "Estimate reference" },
            { key: "amount", label: "Amount", description: "Estimate total" },
            { key: "viewLink", label: "View Link", description: "Estimate view URL" },
            { key: "orgName", label: "Organization Name", description: "Sending organization" }
        ],
        htmlContent: wrapWithBranding(`
            <h2 style="color: #333;">Estimate #{{estimateNumber}}</h2>
            <p style="color: #666; font-size: 16px;">Hi {{customerName}},</p>
            <p style="color: #666; font-size: 16px;">We've prepared an estimate for you:</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Estimated Total:</strong> {{amount}}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{viewLink}}" style="background-color: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Estimate</a>
            </div>
            
            <p style="color: #666; font-size: 14px;">Please review the estimate and let us know if you have any questions.</p>
        `)
    },

    // Support (3)
    {
        id: "ticket_created",
        name: "Ticket Created",
        category: "support",
        description: "Sent when a support ticket is opened",
        subject: "Ticket #{{ticketId}} - {{subject}}",
        variables: [
            { key: "customerName", label: "Customer Name", description: "Customer's name" },
            { key: "ticketId", label: "Ticket ID", description: "Ticket reference number" },
            { key: "subject", label: "Subject", description: "Ticket subject" },
            { key: "viewLink", label: "View Link", description: "Ticket view URL" }
        ],
        htmlContent: wrapWithBranding(`
            <h2 style="color: #333;">Support Ticket Created</h2>
            <p style="color: #666; font-size: 16px;">Hi {{customerName}},</p>
            <p style="color: #666; font-size: 16px;">Your support ticket has been received:</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Ticket ID:</strong> #{{ticketId}}</p>
                <p style="margin: 0;"><strong>Subject:</strong> {{subject}}</p>
            </div>
            
            <p style="color: #666; font-size: 16px;">Our team will review your request and respond shortly.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{viewLink}}" style="background-color: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Ticket</a>
            </div>
        `)
    },
    {
        id: "ticket_reply",
        name: "Ticket Reply",
        category: "support",
        description: "Sent when an agent replies to a ticket",
        subject: "Re: Ticket #{{ticketId}}",
        variables: [
            { key: "customerName", label: "Customer Name", description: "Customer's name" },
            { key: "ticketId", label: "Ticket ID", description: "Ticket reference" },
            { key: "agentName", label: "Agent Name", description: "Name of responding agent" },
            { key: "replyPreview", label: "Reply Preview", description: "Preview of the reply" },
            { key: "viewLink", label: "View Link", description: "Ticket view URL" }
        ],
        htmlContent: wrapWithBranding(`
            <h2 style="color: #333;">New Reply on Ticket #{{ticketId}}</h2>
            <p style="color: #666; font-size: 16px;">Hi {{customerName}},</p>
            <p style="color: #666; font-size: 16px;"><strong>{{agentName}}</strong> has replied to your ticket:</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1a1a1a;">
                <p style="margin: 0; color: #666; font-style: italic;">{{replyPreview}}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{viewLink}}" style="background-color: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Full Reply</a>
            </div>
        `)
    },
    {
        id: "ticket_closed",
        name: "Ticket Closed",
        category: "support",
        description: "Sent when a ticket is marked as resolved",
        subject: "Ticket #{{ticketId}} has been closed",
        variables: [
            { key: "customerName", label: "Customer Name", description: "Customer's name" },
            { key: "ticketId", label: "Ticket ID", description: "Ticket reference" },
            { key: "subject", label: "Subject", description: "Ticket subject" },
            { key: "feedbackLink", label: "Feedback Link", description: "Satisfaction survey URL" }
        ],
        htmlContent: wrapWithBranding(`
            <h2 style="color: #333;">Ticket Closed</h2>
            <p style="color: #666; font-size: 16px;">Hi {{customerName}},</p>
            <p style="color: #666; font-size: 16px;">Your support ticket has been resolved and closed:</p>
            
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #dcfce7;">
                <p style="margin: 0 0 10px 0;"><strong>Ticket ID:</strong> #{{ticketId}}</p>
                <p style="margin: 0;"><strong>Subject:</strong> {{subject}}</p>
            </div>
            
            <p style="color: #666; font-size: 16px;">We'd love to hear your feedback:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{feedbackLink}}" style="background-color: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Rate Your Experience</a>
            </div>
        `)
    },

    // Projects & Tasks (3)
    {
        id: "project_assigned",
        name: "Project Assigned",
        category: "projects",
        description: "Sent when a user is assigned to a project",
        subject: "You've been assigned to {{projectName}}",
        variables: [
            { key: "userName", label: "User Name", description: "Assigned user's name" },
            { key: "projectName", label: "Project Name", description: "Name of the project" },
            { key: "deadline", label: "Deadline", description: "Project deadline" },
            { key: "viewLink", label: "View Link", description: "Project view URL" }
        ],
        htmlContent: wrapWithBranding(`
            <h2 style="color: #333;">New Project Assignment</h2>
            <p style="color: #666; font-size: 16px;">Hi {{userName}},</p>
            <p style="color: #666; font-size: 16px;">You've been assigned to a new project:</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Project:</strong> {{projectName}}</p>
                <p style="margin: 0;"><strong>Deadline:</strong> {{deadline}}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{viewLink}}" style="background-color: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Project</a>
            </div>
        `)
    },
    {
        id: "task_assigned",
        name: "Task Assigned",
        category: "projects",
        description: "Sent when a task is assigned to a user",
        subject: "New task: {{taskName}}",
        variables: [
            { key: "userName", label: "User Name", description: "Assigned user's name" },
            { key: "taskName", label: "Task Name", description: "Name of the task" },
            { key: "projectName", label: "Project Name", description: "Related project name" },
            { key: "dueDate", label: "Due Date", description: "Task due date" },
            { key: "viewLink", label: "View Link", description: "Task view URL" }
        ],
        htmlContent: wrapWithBranding(`
            <h2 style="color: #333;">New Task Assigned</h2>
            <p style="color: #666; font-size: 16px;">Hi {{userName}},</p>
            <p style="color: #666; font-size: 16px;">You've been assigned a new task:</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Task:</strong> {{taskName}}</p>
                <p style="margin: 0 0 10px 0;"><strong>Project:</strong> {{projectName}}</p>
                <p style="margin: 0;"><strong>Due:</strong> {{dueDate}}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{viewLink}}" style="background-color: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Task</a>
            </div>
        `)
    },
    {
        id: "task_due_reminder",
        name: "Task Due Reminder",
        category: "projects",
        description: "Reminder that a task is approaching its due date",
        subject: "Reminder: {{taskName}} is due soon",
        variables: [
            { key: "userName", label: "User Name", description: "Assigned user's name" },
            { key: "taskName", label: "Task Name", description: "Name of the task" },
            { key: "dueDate", label: "Due Date", description: "Task due date" },
            { key: "viewLink", label: "View Link", description: "Task view URL" }
        ],
        htmlContent: wrapWithBranding(`
            <h2 style="color: #333;">Task Due Reminder</h2>
            <p style="color: #666; font-size: 16px;">Hi {{userName}},</p>
            <p style="color: #666; font-size: 16px;">This is a reminder that your task is due soon:</p>
            
            <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fef3c7;">
                <p style="margin: 0 0 10px 0;"><strong>Task:</strong> {{taskName}}</p>
                <p style="margin: 0;"><strong>Due:</strong> {{dueDate}}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{viewLink}}" style="background-color: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Task</a>
            </div>
        `)
    }
];

async function seedTemplates() {
    console.log("🚀 Seeding 25 email templates...\n");

    for (const template of templates) {
        const docRef = db.collection("platform").doc("emailTemplates").collection("templates").doc(template.id);

        await docRef.set({
            ...template,
            plainTextContent: "", // Will be auto-generated
            enabled: true,
            isDefault: true,
            defaultHtmlContent: template.htmlContent,
            defaultSubject: template.subject,
            version: 1,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: "system"
        });

        console.log(`✅ ${template.category.padEnd(10)} | ${template.name}`);
    }

    console.log("\n🎉 All 25 email templates seeded successfully!");
    process.exit(0);
}

seedTemplates().catch(err => {
    console.error("❌ Error seeding templates:", err);
    process.exit(1);
});
