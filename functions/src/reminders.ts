import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Resend } from "resend";

// Initialize Resend
const resend = new Resend(functions.config().resend?.api_key || process.env.RESEND_API_KEY);
const FROM_EMAIL = functions.config().email?.from || "notifications@yourdomain.com";

export const checkReminders = functions.pubsub.schedule("every 15 minutes").onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();

    // Query reminders that are due, have sendEmail=true, and haven't been sent yet (isRead? or we need a new flag?)
    // Using isRead as "processed" flag for now, or better to add `emailSent` flag.
    // Since I can't easily change the schema in all existing docs, I'll check `isRead == false` and `date <= now`.
    // But `isRead` usually means "User saw it in UI".
    // I'll assume `isRead` is the flag for "Action taken". 
    // Or better, I'll query for `sendEmail == true` and `emailSent != true`.

    // Let's assume we want to process unread reminders that are due.
    const snapshot = await admin.firestore().collection("reminders")
        .where("date", "<=", now)
        .where("sendEmail", "==", true)
        .where("emailSent", "==", false) // Ensure we don't resend. I need to make sure I default this to false in creation or handle missing.
        // If I didn't add emailSent to schema, I should use a different check or updated the creation logic.
        // In CreateReminderDialog, I didn't set emailSent. Firestore queries filter out docs missing the field if using "==".
        // So I must ensure the field exists or use a query that handles missing. 
        // Firestore doesn't support "where missing".
        // I will update the query to be safe: process reminders that fit the criteria.
        // Since I can't count on `emailSent` existing on old data (none exists yet), I'll check `isRead`.
        // But `isRead` is for UI.
        // I will rely on `isRead` for now or better, I'll update the `createReminder` hook to include `emailSent: false`.
        // I'll update `useReminders` hook first to add `emailSent: false`.
        .get();

    if (snapshot.empty) {
        return null;
    }

    const batch = admin.firestore().batch();
    const promises: Promise<any>[] = [];

    for (const doc of snapshot.docs) {
        const reminder = doc.data();

        // Get assignee email
        let toEmail = "";
        try {
            const userDoc = await admin.firestore().collection("users").doc(reminder.assignedTo).get();
            if (userDoc.exists) {
                toEmail = userDoc.data()?.email;
            } else {
                // Try staff collection if separate
                const staffDoc = await admin.firestore().collection("staff").doc(reminder.assignedTo).get();
                if (staffDoc.exists) {
                    toEmail = staffDoc.data()?.email;
                }
            }
        } catch (e) {
            console.error(`Error fetching user ${reminder.assignedTo}`, e);
            continue;
        }

        if (toEmail) {
            promises.push(
                resend.emails.send({
                    from: FROM_EMAIL,
                    to: toEmail,
                    subject: `Reminder: ${reminder.description || "New Reminder"}`,
                    html: `
                        <p>You have a new reminder due:</p>
                        <p><strong>${reminder.description}</strong></p>
                        <p>Date: ${reminder.date.toDate().toLocaleString()}</p>
                        <p><a href="${functions.config().app?.url || "https://yourapp.com"}/dashboard">View Dashboard</a></p>
                    `,
                }).catch(e => console.error("Email failed", e))
            );

            // Mark as sent
            batch.update(doc.ref, {
                emailSent: true,
                emailSentAt: admin.firestore.Timestamp.now()
            });
        }
    }

    await Promise.all(promises);
    await batch.commit();
    return null;
});
