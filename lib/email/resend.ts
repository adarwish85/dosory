import { Resend } from "resend";

// Lazy-initialize Resend client to avoid build-time errors
let resendClient: Resend | null = null;

function getResendClient(): Resend {
    if (!resendClient) {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            throw new Error("RESEND_API_KEY environment variable is not set");
        }
        resendClient = new Resend(apiKey);
    }
    return resendClient;
}

export interface SendEmailOptions {
    to: string | string[];
    subject: string;
    react: React.ReactElement;
    from?: string;
    replyTo?: string;
}

/**
 * Send an email using Resend
 * @param options - Email options including to, subject, and react component
 * @returns Result with id or error
 */
export async function sendEmail({
    to,
    subject,
    react,
    from = "Dosory <noreply@dosory.com>",
    replyTo,
}: SendEmailOptions) {
    try {
        const resend = getResendClient();
        const { data, error } = await resend.emails.send({
            from,
            to: Array.isArray(to) ? to : [to],
            subject,
            react,
            replyTo,
        });

        if (error) {
            console.error("Email send error:", error);
            return { success: false, error: error.message };
        }

        return { success: true, id: data?.id };
    } catch (err) {
        console.error("Email send exception:", err);
        return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
}

export { getResendClient as resend };
