import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { sendEmail } from "@/lib/email";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";

export async function POST(req: NextRequest) {
    try {
        // A1: blasts every tenant across all orgs — Super Admin only.
        const authResult = await requireSuperAdmin(req);
        if (!authResult.success) return authResult.response;

        const body = await req.json();
        const { subject, html, targetAudience } = body;

        if (!subject || !html) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Fetch tenants based on audience
        let query = adminDb.collection("organizations");

        if (targetAudience !== "all") {
            // @ts-expect-error - reassigning a CollectionReference to a narrowed Query type
            query = query.where("status", "==", targetAudience);
        }

        const snapshot = await query.get();
        const tenants = snapshot.docs.map((doc) => doc.data());

        let sentCount = 0;
        const promises = [];

        // Collect all unique emails
        const emails = new Set<string>();
        tenants.forEach((t) => {
            if (t.email) emails.add(t.email);
        });

        // Send emails
        for (const email of Array.from(emails)) {
            promises.push(
                sendEmail(email, subject, html)
                    .then((success) => {
                        if (success) sentCount++;
                    })
                    .catch((err) => console.error(`Failed to send to ${email}`, err))
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
