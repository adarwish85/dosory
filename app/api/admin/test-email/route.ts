import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";

export async function POST(request: NextRequest) {
    try {
        // A1: arbitrary subject/HTML to any address — Super Admin only (was an open relay).
        const authResult = await requireSuperAdmin(request);
        if (!authResult.success) return authResult.response;

        const body = await request.json();
        const { to, subject, html } = body;

        if (!to || !subject || !html) {
            return NextResponse.json({ error: "Missing required fields: to, subject, html" }, { status: 400 });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
            return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
        }

        const success = await sendEmail(to, subject, html);

        if (success) {
            return NextResponse.json({ success: true, message: "Test email sent" });
        } else {
            return NextResponse.json({ error: "Failed to send email. Check SMTP settings." }, { status: 500 });
        }
    } catch (error) {
        console.error("Error sending test email:", error);
        return NextResponse.json({ error: (error as Error).message || "Failed to send test email" }, { status: 500 });
    }
}
