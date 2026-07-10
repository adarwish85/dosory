"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { applyActionCode, sendEmailVerification, onAuthStateChanged, reload } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformLogo } from "@/lib/hooks/use-platform-settings";
import { Loader2, CheckCircle2, MailCheck, AlertTriangle } from "lucide-react";

type State = "checking" | "verified" | "unverified" | "signed-out" | "error";

function VerifyInner() {
    const params = useSearchParams();
    const [state, setState] = useState<State>("checking");
    const [message, setMessage] = useState("");
    const [resending, setResending] = useState(false);

    useEffect(() => {
        const mode = params.get("mode");
        const oobCode = params.get("oobCode");

        // Firebase email-action link: apply the verification code directly.
        if (mode === "verifyEmail" && oobCode) {
            applyActionCode(auth, oobCode)
                .then(() => setState("verified"))
                .catch(() => {
                    setState("error");
                    setMessage("This verification link is invalid or has already been used.");
                });
            return;
        }

        // Otherwise reflect the current user's verification status.
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setState("signed-out");
                return;
            }
            try {
                await reload(user);
            } catch {
                /* ignore refresh errors */
            }
            setState(user.emailVerified ? "verified" : "unverified");
        });
        return () => unsub();
    }, [params]);

    const handleResend = async () => {
        const user = auth.currentUser;
        if (!user) return;
        setResending(true);
        setMessage("");
        try {
            await sendEmailVerification(user, { url: `${window.location.origin}/verify` });
            setMessage("Verification email sent. Check your inbox (and spam folder).");
        } catch {
            setMessage("Could not send the email right now. Please try again shortly.");
        }
        setResending(false);
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
            <div className="mb-8">
                <PlatformLogo size="large" textClassName="text-2xl text-gray-900" />
            </div>
            <Card className="w-full max-w-md">
                {state === "checking" && (
                    <CardContent className="flex items-center justify-center gap-2 py-12 text-gray-500">
                        <Loader2 className="h-5 w-5 animate-spin" /> Checking your verification status…
                    </CardContent>
                )}

                {state === "verified" && (
                    <>
                        <CardHeader className="text-center">
                            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
                            <CardTitle className="mt-2">Email verified</CardTitle>
                            <CardDescription>
                                Your email address has been confirmed. You&apos;re all set.
                            </CardDescription>
                        </CardHeader>
                        <CardFooter className="justify-center">
                            <Link href="/dashboard">
                                <Button>Continue to dashboard</Button>
                            </Link>
                        </CardFooter>
                    </>
                )}

                {state === "unverified" && (
                    <>
                        <CardHeader className="text-center">
                            <MailCheck className="mx-auto h-12 w-12 text-blue-600" />
                            <CardTitle className="mt-2">Verify your email</CardTitle>
                            <CardDescription>
                                We sent a verification link to your email. Click it to confirm your address, then return
                                here.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-center">
                            {message && <p className="text-sm text-green-600">{message}</p>}
                            <Button onClick={handleResend} disabled={resending} className="w-full">
                                {resending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Resend verification email
                            </Button>
                            <Link href="/dashboard" className="block text-sm text-blue-500 hover:underline">
                                Skip for now
                            </Link>
                        </CardContent>
                    </>
                )}

                {state === "signed-out" && (
                    <>
                        <CardHeader className="text-center">
                            <CardTitle>Verify your email</CardTitle>
                            <CardDescription>Sign in to check or resend your verification link.</CardDescription>
                        </CardHeader>
                        <CardFooter className="justify-center">
                            <Link href="/login">
                                <Button>Go to sign in</Button>
                            </Link>
                        </CardFooter>
                    </>
                )}

                {state === "error" && (
                    <>
                        <CardHeader className="text-center">
                            <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
                            <CardTitle className="mt-2">Verification failed</CardTitle>
                            <CardDescription>{message}</CardDescription>
                        </CardHeader>
                        <CardFooter className="justify-center gap-3">
                            <Link href="/login">
                                <Button variant="outline">Sign in</Button>
                            </Link>
                        </CardFooter>
                    </>
                )}
            </Card>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-gray-100 text-gray-500">Loading…</div>
            }
        >
            <VerifyInner />
        </Suspense>
    );
}
