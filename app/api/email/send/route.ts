import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend';
import { WelcomeEmail } from '@/lib/email/templates/WelcomeEmail';
import { TeamInviteEmail } from '@/lib/email/templates/TeamInviteEmail';
import { PasswordResetEmail } from '@/lib/email/templates/PasswordResetEmail';

type EmailType = 'welcome' | 'team-invite' | 'password-reset';

interface WelcomePayload {
    type: 'welcome';
    to: string;
    userName: string;
    orgName: string;
    loginUrl: string;
}

interface TeamInvitePayload {
    type: 'team-invite';
    to: string;
    inviterName: string;
    orgName: string;
    role: string;
    inviteUrl: string;
}

interface PasswordResetPayload {
    type: 'password-reset';
    to: string;
    userName: string;
    resetUrl: string;
}

type EmailPayload = WelcomePayload | TeamInvitePayload | PasswordResetPayload;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as EmailPayload;

        // Validate required fields
        if (!body.type || !body.to) {
            return NextResponse.json(
                { error: 'Missing required fields: type, to' },
                { status: 400 }
            );
        }

        let result;

        switch (body.type) {
            case 'welcome': {
                const { to, userName, orgName, loginUrl } = body as WelcomePayload;
                result = await sendEmail({
                    to,
                    subject: `Welcome to ${orgName}!`,
                    react: WelcomeEmail({ userName, orgName, loginUrl }),
                });
                break;
            }

            case 'team-invite': {
                const { to, inviterName, orgName, role, inviteUrl } = body as TeamInvitePayload;
                result = await sendEmail({
                    to,
                    subject: `You've been invited to join ${orgName}`,
                    react: TeamInviteEmail({ inviterName, orgName, role, inviteUrl }),
                });
                break;
            }

            case 'password-reset': {
                const { to, userName, resetUrl } = body as PasswordResetPayload;
                result = await sendEmail({
                    to,
                    subject: 'Reset your password',
                    react: PasswordResetEmail({ userName, resetUrl }),
                });
                break;
            }

            default:
                return NextResponse.json(
                    { error: `Unknown email type: ${(body as any).type}` },
                    { status: 400 }
                );
        }

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, id: result.id });

    } catch (error) {
        console.error('Email API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
