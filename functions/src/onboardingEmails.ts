// Onboarding Email Sequences Cloud Function
// Sends automated follow-up emails on Day 1, 3, and 7

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Resend } from "resend";

// Initialize Resend with API key from environment
// Lazy init — see emailNotifications.ts: `new Resend(undefined)` at module scope throws and
// breaks deploy discovery. Constructed on first send instead.
let _resend: Resend | null = null;
const getResend = (): Resend => (_resend ??= new Resend(functions.config().resend?.api_key));

interface OnboardingState {
    completed: boolean;
    startedAt: admin.firestore.Timestamp;
    completedAt?: admin.firestore.Timestamp;
    skippedAt?: admin.firestore.Timestamp;
    role: "admin" | "staff";
    useCase?: string;
    steps: {
        welcome: boolean;
        companyProfile: boolean;
        firstRecord: boolean;
        inviteTeam: boolean;
        integrations: boolean;
    };
    emailsSent: string[];
}

// Email templates
const EMAIL_TEMPLATES = {
    day1: {
        subject: "Welcome to Dosory! Let's get you started 🚀",
        getHtml: (userName: string, progress: number) => `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #0A66C2;">Welcome, ${userName}!</h1>
                <p>Thanks for joining Dosory. We're excited to help you streamline your business operations.</p>
                
                <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Your Setup Progress: ${Math.round(progress * 100)}%</h3>
                    <div style="background: #e5e7eb; border-radius: 999px; height: 8px;">
                        <div style="background: #0A66C2; height: 8px; border-radius: 999px; width: ${progress * 100}%;"></div>
                    </div>
                </div>
                
                <h3>Quick tips to get started:</h3>
                <ul>
                    <li>Complete your company profile</li>
                    <li>Add your first customer or lead</li>
                    <li>Invite team members to collaborate</li>
                </ul>
                
                <a href="https://app.dosory.com/dashboard" style="display: inline-block; background: #0A66C2; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 20px;">
                    Continue Setup →
                </a>
                
                <p style="color: #6b7280; margin-top: 30px; font-size: 14px;">
                    Questions? Reply to this email, we're here to help!
                </p>
            </div>
        `
    },
    day3: {
        subject: "How's it going? Need help with Dosory?",
        getHtml: (userName: string, incompleteTasks: string[]) => `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #0A66C2;">Hi ${userName}!</h1>
                <p>It's been a few days since you signed up. We wanted to check in and see how things are going.</p>
                
                ${incompleteTasks.length > 0 ? `
                    <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #92400e;">Almost there! Complete these steps:</h3>
                        <ul style="color: #92400e;">
                            ${incompleteTasks.map(task => `<li>${task}</li>`).join('')}
                        </ul>
                    </div>
                ` : `
                    <div style="background: #d1fae5; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #065f46;">🎉 Great job!</h3>
                        <p style="color: #065f46;">You've completed your setup. Now explore all the features!</p>
                    </div>
                `}
                
                <a href="https://app.dosory.com/dashboard" style="display: inline-block; background: #0A66C2; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 20px;">
                    Go to Dashboard →
                </a>
                
                <p style="color: #6b7280; margin-top: 30px; font-size: 14px;">
                    Need a hand? Reply to this email or check our <a href="https://app.dosory.com/dashboard/knowledge-base">Knowledge Base</a>.
                </p>
            </div>
        `
    },
    day7: {
        subject: "One week with Dosory - How can we improve?",
        getHtml: (userName: string, completed: boolean) => `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #0A66C2;">Hi ${userName}!</h1>
                
                ${completed ? `
                    <p>It's been a week since you joined Dosory, and you're already making great progress! 🎉</p>
                    <p>We'd love to hear what you think. What features do you love? What could be better?</p>
                ` : `
                    <p>It's been a week since you signed up for Dosory. We noticed you haven't completed your setup yet.</p>
                    <p>Is there something holding you back? We'd love to help!</p>
                `}
                
                <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Pro Tips:</h3>
                    <ul>
                        <li>Use the Import feature to bulk upload your data</li>
                        <li>Set up email integrations for automated notifications</li>
                        <li>Create invoice templates to save time</li>
                    </ul>
                </div>
                
                <a href="https://app.dosory.com/dashboard" style="display: inline-block; background: #0A66C2; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 20px;">
                    Explore Dosory →
                </a>
                
                <p style="color: #6b7280; margin-top: 30px; font-size: 14px;">
                    Your feedback matters! Reply to share your thoughts.
                </p>
            </div>
        `
    }
};

// Scheduled function to send onboarding emails
// Runs every hour to check for users who need emails
export const sendOnboardingEmails = functions.pubsub
    .schedule("every 1 hours")
    .onRun(async () => {
        const db = admin.firestore();
        const now = admin.firestore.Timestamp.now();

        // Get all users with onboarding in progress
        const usersSnapshot = await db.collectionGroup("onboarding").get();

        for (const doc of usersSnapshot.docs) {
            try {
                const userId = doc.ref.parent.parent?.id;
                if (!userId) continue;

                const state = doc.data() as OnboardingState;

                // Skip if already completed
                if (state.completed || state.skippedAt) continue;

                const startedAt = state.startedAt.toDate();
                const hoursSinceStart = (now.toDate().getTime() - startedAt.getTime()) / (1000 * 60 * 60);
                const emailsSent = state.emailsSent || [];

                // Get user email
                const userRecord = await admin.auth().getUser(userId);
                const userEmail = userRecord.email;
                const userName = userRecord.displayName || userEmail?.split("@")[0] || "there";

                if (!userEmail) continue;

                // Determine which email to send
                let emailType: "day1" | "day3" | "day7" | null = null;

                if (hoursSinceStart >= 24 && !emailsSent.includes("day1")) {
                    emailType = "day1";
                } else if (hoursSinceStart >= 72 && !emailsSent.includes("day3")) {
                    emailType = "day3";
                } else if (hoursSinceStart >= 168 && !emailsSent.includes("day7")) {
                    emailType = "day7";
                }

                if (!emailType) continue;

                // Calculate progress and incomplete tasks
                const completedSteps = Object.values(state.steps).filter(Boolean).length;
                const totalSteps = Object.keys(state.steps).length;
                const progress = completedSteps / totalSteps;

                const incompleteTasks: string[] = [];
                if (!state.steps.companyProfile) incompleteTasks.push("Complete your company profile");
                if (!state.steps.firstRecord) incompleteTasks.push("Add your first customer or lead");
                if (!state.steps.inviteTeam) incompleteTasks.push("Invite team members");

                // Get email template
                const template = EMAIL_TEMPLATES[emailType];
                let html: string;

                switch (emailType) {
                    case "day1":
                        html = EMAIL_TEMPLATES.day1.getHtml(userName, progress);
                        break;
                    case "day3":
                        html = EMAIL_TEMPLATES.day3.getHtml(userName, incompleteTasks);
                        break;
                    case "day7":
                        html = EMAIL_TEMPLATES.day7.getHtml(userName, state.completed);
                        break;
                }

                // Send email via Resend
                await getResend().emails.send({
                    from: "Dosory <noreply@dosory.com>",
                    to: userEmail,
                    subject: template.subject,
                    html: html
                });

                // Update emailsSent in Firestore
                await doc.ref.update({
                    emailsSent: admin.firestore.FieldValue.arrayUnion(emailType)
                });

                // Log analytics event
                await db.collection("analytics").doc("onboarding").collection("events").add({
                    userId,
                    event: "onboarding_email_sent",
                    metadata: { emailType },
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });

                functions.logger.info(`Sent ${emailType} email to ${userEmail}`);

            } catch (error) {
                functions.logger.error("Error sending onboarding email:", error);
            }
        }

        return null;
    });

// Triggered when a new user signs up - schedule Day 1 email
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
    const db = admin.firestore();

    // Create initial onboarding state
    await db.doc(`users/${user.uid}/onboarding/state`).set({
        completed: false,
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        role: "admin",
        steps: {
            welcome: false,
            companyProfile: false,
            firstRecord: false,
            inviteTeam: false,
            integrations: false
        },
        currentStep: 0,
        emailsSent: []
    });

    functions.logger.info(`Created onboarding state for new user: ${user.email}`);
});
