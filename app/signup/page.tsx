"use client";

import { useState } from "react";
import Link from "next/link";

import { createUserWithEmailAndPassword, deleteUser } from "firebase/auth";
import { doc, setDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformLogo, usePlatformSettings } from "@/lib/hooks/use-platform-settings";
import { Building2, Users, Loader2, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

type SignupStep = "choice" | "create-org" | "join-org" | "join-submitted";

export default function SignupPage() {
    const { settings, loading } = usePlatformSettings();
    const [step, setStep] = useState<SignupStep>("choice");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [orgName, setOrgName] = useState("");
    const [subdomain, setSubdomain] = useState("");
    const [subdomainError, setSubdomainError] = useState("");
    const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
    const [checkingSubdomain, setCheckingSubdomain] = useState(false);
    const [joinSubdomain, setJoinSubdomain] = useState("");
    const [joinMessage, setJoinMessage] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    if (loading) {
        return <div className="flex h-screen items-center justify-center bg-gray-100">Loading...</div>;
    }

    if (settings.maintenanceMode) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
                <div className="mb-8">
                    <PlatformLogo size="large" textClassName="text-2xl text-gray-900" />
                </div>
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Under Maintenance</CardTitle>
                        <CardDescription>We are currently performing scheduled maintenance.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-500">Please check back later.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!settings.allowSignups) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
                <div className="mb-8">
                    <PlatformLogo size="large" textClassName="text-2xl text-gray-900" />
                </div>
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Signups Disabled</CardTitle>
                        <CardDescription>New account registration is currently disabled.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-500">
                            Please contact support for assistance or if you have an invitation.
                        </p>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <Link href="/login" className="text-blue-500 hover:underline">
                            Return to Login
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // Validate subdomain format
    const validateSubdomain = (value: string) => {
        const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
        setSubdomain(cleaned);

        if (cleaned.length < 3) {
            setSubdomainError("Subdomain must be at least 3 characters");
            setSubdomainAvailable(null);
            return;
        }
        if (cleaned.startsWith("-") || cleaned.endsWith("-")) {
            setSubdomainError("Subdomain cannot start or end with a hyphen");
            setSubdomainAvailable(null);
            return;
        }

        // Reserved subdomains
        const reserved = ["www", "app", "api", "admin", "mail", "ftp", "localhost", "test", "staging", "dev", "sa"];
        if (reserved.includes(cleaned)) {
            setSubdomainError("This subdomain is reserved");
            setSubdomainAvailable(null);
            return;
        }

        setSubdomainError("");
        checkSubdomainAvailability(cleaned);
    };

    // Check if subdomain is available (using doc ID since subdomain = orgId)
    const checkSubdomainAvailability = async (sub: string) => {
        setCheckingSubdomain(true);
        setSubdomainAvailable(null);
        try {
            // Since we use subdomain as org document ID, just check if doc exists
            const { getDoc } = await import("firebase/firestore");
            const orgRef = doc(db, "organizations", sub);
            const orgSnap = await getDoc(orgRef);
            setSubdomainAvailable(!orgSnap.exists());
        } catch (err) {
            console.error("Error checking subdomain:", err);
            // On error, allow submission (will fail if taken)
            setSubdomainAvailable(true);
        } finally {
            setCheckingSubdomain(false);
        }
    };

    // Handle creating a new organization
    const handleCreateOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!subdomainAvailable) {
            setError("Please choose an available subdomain");
            return;
        }

        setSubmitting(true);
        try {
            // 1. Create Auth User
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Create Organization with subdomain
            const orgId = subdomain; // Use subdomain as org ID for easy lookup
            const orgRef = doc(db, "organizations", orgId);
            await setDoc(orgRef, {
                name: orgName,
                subdomain: subdomain,
                createdAt: serverTimestamp(),
                ownerId: user.uid,
                status: settings.requireEmailVerification ? "pending_verification" : "active",
                plan: "trial",
                trialEndsAt: new Date(Date.now() + settings.defaultTrialDays * 24 * 60 * 60 * 1000).toISOString(),
            });

            // 3. Create User Profile
            const userRef = doc(db, "users", user.uid);
            await setDoc(userRef, {
                email: user.email,
                displayName: orgName,
                orgId: orgId,
                role: "admin",
                createdAt: serverTimestamp(),
            });

            // 4. Create Staff record for admin (using same ID)
            await setDoc(doc(db, "staff", user.email!.toLowerCase()), {
                authUid: user.uid,
                firstName: orgName.split(" ")[0] || "Admin",
                lastName: orgName.split(" ").slice(1).join(" ") || "User",
                email: user.email,
                roleId: "admin",
                isAdmin: true,
                status: "active",
                orgId: orgId,
                departmentIds: [],
                permissions: [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: user.uid,
            });

            // 5. Set custom claims for Firestore security rules
            const claimsResponse = await fetch("/api/auth/set-claims", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uid: user.uid,
                    orgId: orgId,
                    role: "admin",
                }),
            });

            if (!claimsResponse.ok) {
                console.warn("Failed to set custom claims:", await claimsResponse.text());
            }

            // 6. Force token refresh to pick up new claims
            await user.getIdToken(true);

            // 7. Send Welcome Email (fire-and-forget)
            const protocol = window.location.protocol;
            const host = window.location.host;
            const isLocal = host.includes("localhost");
            const rootDomain = isLocal ? "localhost:3000" : "dosory.com";
            const loginUrl = `${protocol}//${subdomain}.${rootDomain}/dashboard`;

            fetch("/api/email/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "welcome",
                    to: user.email,
                    userName: orgName.split(" ")[0] || "there",
                    orgName: orgName,
                    loginUrl,
                }),
            }).catch((err) => console.warn("Welcome email failed:", err));

            // Redirect to subdomain
            window.location.href = loginUrl;
        } catch (err: unknown) {
            // If we created a user but failed to setup Firestore, delete the user so they can try again
            if (auth.currentUser) {
                await deleteUser(auth.currentUser);
            }
            setError((err as Error).message);
            setSubmitting(false);
        }
    };

    // Handle joining an existing organization
    const handleJoinOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            // 1. Check if organization exists
            const orgRef = doc(db, "organizations", joinSubdomain.toLowerCase());
            const { getDoc } = await import("firebase/firestore");
            const orgSnap = await getDoc(orgRef);

            if (!orgSnap.exists()) {
                setError("Organization not found. Please check the subdomain.");
                setSubmitting(false);
                return;
            }

            // 2. Create Auth User
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 3. Create User Profile (pending - no orgId until approved)
            const userRef = doc(db, "users", user.uid);
            await setDoc(userRef, {
                email: user.email,
                role: "pending",
                createdAt: serverTimestamp(),
            });

            // 4. Create Join Request
            const joinRequestRef = doc(collection(db, "join_requests"));
            await setDoc(joinRequestRef, {
                userId: user.uid,
                userEmail: user.email,
                orgId: joinSubdomain.toLowerCase(),
                orgName: orgSnap.data().name,
                status: "pending",
                message: joinMessage || null,
                createdAt: serverTimestamp(),
            });

            // Show success message
            setStep("join-submitted");
        } catch (err: unknown) {
            setError((err as Error).message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="mb-8">
                <PlatformLogo size="large" textClassName="text-2xl text-gray-900" />
            </div>

            {/* Step: Choice */}
            {step === "choice" && (
                <Card className="w-full max-w-lg">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Get Started</CardTitle>
                        <CardDescription>How would you like to join?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <button
                            onClick={() => setStep("create-org")}
                            className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center gap-4 text-left"
                        >
                            <div className="p-3 bg-blue-100 rounded-full">
                                <Building2 className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Create New Organization</h3>
                                <p className="text-sm text-gray-500">Start fresh with your own company workspace</p>
                            </div>
                        </button>

                        <button
                            onClick={() => setStep("join-org")}
                            className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all flex items-center gap-4 text-left"
                        >
                            <div className="p-3 bg-green-100 rounded-full">
                                <Users className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Join Existing Organization</h3>
                                <p className="text-sm text-gray-500">
                                    Request to join a company that&apos;s already using the platform
                                </p>
                            </div>
                        </button>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <p className="text-sm text-gray-500">
                            Already have an account?{" "}
                            <Link href="/login" className="text-blue-500 hover:underline">
                                Login
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            )}

            {/* Step: Create Organization */}
            {step === "create-org" && (
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <button
                            onClick={() => setStep("choice")}
                            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
                        >
                            <ArrowLeft className="h-4 w-4" /> Back
                        </button>
                        <CardTitle>Create Your Organization</CardTitle>
                        <CardDescription>Set up your company workspace</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateOrg} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="orgName">Organization Name</Label>
                                <Input
                                    id="orgName"
                                    type="text"
                                    placeholder="Acme Corporation"
                                    value={orgName}
                                    onChange={(e) => setOrgName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="subdomain">Subdomain</Label>
                                <div className="flex items-center">
                                    <Input
                                        id="subdomain"
                                        type="text"
                                        placeholder="acme"
                                        value={subdomain}
                                        onChange={(e) => validateSubdomain(e.target.value)}
                                        className="rounded-r-none"
                                        required
                                    />
                                    <span className="bg-gray-100 border border-l-0 border-gray-300 px-3 py-2 rounded-r-md text-sm text-gray-500">
                                        .dosory.com
                                    </span>
                                </div>
                                {checkingSubdomain && (
                                    <p className="text-sm text-gray-500 flex items-center gap-1">
                                        <Loader2 className="h-3 w-3 animate-spin" /> Checking availability...
                                    </p>
                                )}
                                {subdomainError && <p className="text-sm text-red-500">{subdomainError}</p>}
                                {subdomainAvailable === true && !subdomainError && (
                                    <p className="text-sm text-green-600 flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> Available!
                                    </p>
                                )}
                                {subdomainAvailable === false && (
                                    <p className="text-sm text-red-500 flex items-center gap-1">
                                        <XCircle className="h-3 w-3" /> Already taken
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Your Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>

                            {error && <p className="text-sm text-red-500">{error}</p>}

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={submitting || !subdomainAvailable}
                                style={{ backgroundColor: settings.primaryColor }}
                            >
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Organization
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Step: Join Organization */}
            {step === "join-org" && (
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <button
                            onClick={() => setStep("choice")}
                            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
                        >
                            <ArrowLeft className="h-4 w-4" /> Back
                        </button>
                        <CardTitle>Join an Organization</CardTitle>
                        <CardDescription>Request access to an existing company</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleJoinOrg} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="joinSubdomain">Organization Subdomain</Label>
                                <div className="flex items-center">
                                    <Input
                                        id="joinSubdomain"
                                        type="text"
                                        placeholder="acme"
                                        value={joinSubdomain}
                                        onChange={(e) => setJoinSubdomain(e.target.value.toLowerCase())}
                                        className="rounded-r-none"
                                        required
                                    />
                                    <span className="bg-gray-100 border border-l-0 border-gray-300 px-3 py-2 rounded-r-md text-sm text-gray-500">
                                        .dosory.com
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Ask your administrator for the organization subdomain
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Your Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="message">Message to Admin (Optional)</Label>
                                <Input
                                    id="message"
                                    type="text"
                                    placeholder="I'm the new sales manager..."
                                    value={joinMessage}
                                    onChange={(e) => setJoinMessage(e.target.value)}
                                />
                            </div>

                            {error && <p className="text-sm text-red-500">{error}</p>}

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={submitting}
                                style={{ backgroundColor: settings.primaryColor }}
                            >
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Submit Request
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Step: Join Request Submitted */}
            {step === "join-submitted" && (
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <CardTitle>Request Submitted!</CardTitle>
                        <CardDescription>Your join request has been sent to the organization admin</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-sm text-gray-500 mb-4">
                            You&apos;ll be able to access the platform once your request is approved. The admin will
                            assign your role and permissions.
                        </p>
                        <p className="text-sm text-gray-600">Check your email for updates.</p>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <Button
                            variant="link"
                            className="text-blue-500 hover:underline"
                            onClick={() => {
                                const protocol = window.location.protocol;
                                const host = window.location.host;
                                const isLocal = host.includes("localhost");
                                const rootDomain = isLocal ? "localhost:3000" : "dosory.com";
                                window.location.href = `${protocol}//${joinSubdomain}.${rootDomain}/login`;
                            }}
                        >
                            Go to Login
                        </Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}
