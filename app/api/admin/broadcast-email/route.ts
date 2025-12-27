import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { subject, html, targetAudience } = body;

        if (!subject || !html) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Fetch tenants based on audience
        let query = adminDb.collection("organizations");

        if (targetAudience !== 'all') {
            // @ts-ignore
            query = query.where('status', '==', targetAudience);
        }

        const snapshot = await query.get();
        const tenants = snapshot.docs.map(doc => doc.data());

        let sentCount = 0;
        const promises = [];

        // Collect all unique emails
        const emails = new Set<string>();
        tenants.forEach(t => {
            if (t.email) emails.add(t.email);
        });

        // Send emails
        for (const email of Array.from(emails)) {
            promises.push(
                sendEmail(email, subject, html)
                    .then(success => {
                        if (success) sentCount++;
                    })
                    .catch(err => console.error(`Failed to send to ${email}`, err))
            );
        }

        // Wait for all (in parallel)
        await Promise.all(promises);

        return NextResponse.json({ success: true, count: sentCount });
    } catch (error) {
        console.error("Error sending broadcast:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
