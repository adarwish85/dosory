"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformLogo } from "@/lib/hooks/use-platform-settings";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");
    const [resetting, setResetting] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setInfo("");
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push("/dashboard");
        } catch {
            // Friendly + non-enumerating: don't reveal whether the email exists.
            setError("Invalid email or password.");
        }
    };

    const handleForgotPassword = async () => {
        setError("");
        setInfo("");
        if (!email) {
            setError('Enter your email above, then click "Forgot password?".');
            return;
        }
        setResetting(true);
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (err: unknown) {
            const code = (err as { code?: string }).code;
            if (code === "auth/invalid-email") {
                setError("Please enter a valid email address.");
                setResetting(false);
                return;
            }
            // For anything else (incl. user-not-found) fall through to the generic
            // success message so we don't reveal whether the account exists.
        }
        setInfo(`If an account exists for ${email}, a password reset link is on its way.`);
        setResetting(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            {/* Platform Logo */}
            <div className="mb-8">
                <PlatformLogo size="large" textClassName="text-2xl text-gray-900" />
            </div>

            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Login</CardTitle>
                    <CardDescription>Enter your credential to access your account.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                <button
                                    type="button"
                                    onClick={handleForgotPassword}
                                    disabled={resetting}
                                    className="text-sm text-blue-500 hover:underline disabled:opacity-50"
                                >
                                    {resetting ? "Sending…" : "Forgot password?"}
                                </button>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        {info && <p className="text-sm text-green-600">{info}</p>}
                        <Button type="submit" className="w-full">
                            Login
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-sm text-gray-500">
                        Don&apos;t have an account?{" "}
                        <Link href="/signup" className="text-blue-500 hover:underline">
                            Sign up
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
