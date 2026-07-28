"use client";

import { useState } from "react";
import Link from "next/link";

import { createUserWithEmailAndPassword, deleteUser, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { provisionWithRetry } from "@/lib/provisioning/ensure-provisioned-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformLogo, usePlatformSettings } from "@/lib/hooks/use-platform-settings";
import { Building2, Users, Loader2, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

type SignupStep = "choice" | "create-org" | "join-org" | "join-submitted";

export default function SignupPage() {
    const { t } = useTranslation();
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
        return <div className="flex h-screen items-center justify-center bg-gray-100">{t("common.loading")}</div>;
    }

    if (settings.maintenanceMode) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
                <div className="mb-8">
                    <PlatformLogo size="large" textClassName="text-2xl text-gray-900" />
                </div>
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>{t("auth.signup.maintenanceTitle")}</CardTitle>
                        <CardDescription>{t("auth.signup.maintenanceDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-500">{t("auth.signup.maintenanceBody")}</p>
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
                        <CardTitle>{t("auth.signup.disabledTitle")}</CardTitle>
                        <CardDescription>{t("auth.signup.disabledDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-500">{t("auth.signup.disabledBody")}</p>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <Link href="/login" className="text-blue-500 hover:underline">
                            {t("auth.signup.returnToLogin")}
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
            setSubdomainError(t("auth.signup.subdomainTooShort"));
            setSubdomainAvailable(null);
            return;
        }
        if (cleaned.startsWith("-") || cleaned.endsWith("-")) {
            setSubdomainError(t("auth.signup.subdomainHyphen"));
            setSubdomainAvailable(null);
            return;
        }

        // Reserved subdomains
        const reserved = ["www", "app", "api", "admin", "mail", "ftp", "localhost", "test", "staging", "dev", "sa"];
        if (reserved.includes(cleaned)) {
            setSubdomainError(t("auth.signup.subdomainReserved"));
            setSubdomainAvailable(null);
            return;
        }

        setSubdomainError("");
        checkSubdomainAvailability(cleaned);
    };

    // Check if subdomain is available. Must go server-side: the `organizations` rules are
    // tenant-isolated, so an anonymous client read was denied and the old catch path wrongly
    // reported every subdomain "available" (letting users pick a taken one → cryptic error).
    const checkSubdomainAvailability = async (sub: string) => {
        setCheckingSubdomain(true);
        setSubdomainAvailable(null);
        try {
            const res = await fetch("/api/organizations/check-subdomain", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subdomain: sub }),
            });
            const data = await res.json().catch(() => ({}));
            setSubdomainAvailable(res.ok ? data.available === true : false);
        } catch (err) {
            console.error("Error checking subdomain:", err);
            // Fail closed: never claim available on error.
            setSubdomainAvailable(false);
        } finally {
            setCheckingSubdomain(false);
        }
    };

    // Handle creating a new organization
    const handleCreateOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!subdomainAvailable) {
            setError(t("auth.signup.chooseAvailableSubdomain"));
            return;
        }

        setSubmitting(true);
        try {
            // 0. Re-check availability server-side right before creating (the UI flag can be
            // stale / racing). Prevents creating an auth user and then failing the org write
            // with a confusing "Missing or insufficient permissions" when the subdomain is taken.
            const availRes = await fetch("/api/organizations/check-subdomain", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subdomain }),
            });
            const availData = await availRes.json().catch(() => ({}));
            if (!availRes.ok || availData.available !== true) {
                setSubdomainAvailable(false);
                setError(t("auth.signup.chooseAvailableSubdomain"));
                setSubmitting(false);
                return;
            }

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
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${await user.getIdToken()}`,
                },
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

            // 6b. Provision subscription + default settings server-side (A2 + A3).
            // Runs AFTER set-claims + token refresh so the bearer token carries the orgId
            // claim. Without the subscription doc every write 403s ("No subscription found");
            // without the seed the tenant lands bare.
            // F1: retried with backoff (the route is idempotent) — a single flaky fetch used
            // to strand a half-provisioned tenant. If it STILL fails, we no longer roll the
            // user back: claims + org already exist, and the dashboard's login-time
            // provisioning guard (useEnsureProvisioned) converges the tenant on next load.
            const provisionResult = await provisionWithRetry(user, orgId);
            if (!provisionResult.ok) {
                console.error("Provisioning incomplete after retries:", provisionResult.lastError);
            }

            // 7. Send Welcome Email (fire-and-forget)
            const protocol = window.location.protocol;
            const host = window.location.host;
            const isLocal = host.includes("localhost");
            const rootDomain = isLocal ? "localhost:3000" : "dosory.com";
            const loginUrl = `${protocol}//${subdomain}.${rootDomain}/dashboard`;

            // 6c. Email verification (fire-and-forget). Uses Firebase Auth's OWN email
            // infrastructure (independent of our Resend/SMTP wiring). Gated on the platform
            // setting; the continue URL lands the user on the branded /verify page, which then
            // routes into the dashboard. Signup already sets org status to pending_verification.
            if (settings.requireEmailVerification) {
                sendEmailVerification(user, {
                    url: `${protocol}//${subdomain}.${rootDomain}/verify`,
                }).catch((err) => console.warn("Verification email failed:", err));
            }

            fetch("/api/email/send", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${await user.getIdToken()}`,
                },
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
                setError(t("auth.signup.orgNotFound"));
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
                        <CardTitle className="text-2xl">{t("auth.signup.getStarted")}</CardTitle>
                        <CardDescription>{t("auth.signup.howToJoin")}</CardDescription>
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
                                <h3 className="font-semibold text-gray-900">{t("auth.signup.createNewOrg")}</h3>
                                <p className="text-sm text-gray-500">{t("auth.signup.createNewOrgDesc")}</p>
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
                                <h3 className="font-semibold text-gray-900">{t("auth.signup.joinExistingOrg")}</h3>
                                <p className="text-sm text-gray-500">{t("auth.signup.joinExistingOrgDesc")}</p>
                            </div>
                        </button>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <p className="text-sm text-gray-500">
                            {t("auth.signup.alreadyHaveAccount")}{" "}
                            <Link href="/login" className="text-blue-500 hover:underline">
                                {t("auth.signup.loginLink")}
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
                            <ArrowLeft className="h-4 w-4" /> {t("common.back")}
                        </button>
                        <CardTitle>{t("auth.signup.createOrgTitle")}</CardTitle>
                        <CardDescription>{t("auth.signup.createOrgDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateOrg} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="orgName">{t("auth.signup.orgNameLabel")}</Label>
                                <Input
                                    id="orgName"
                                    type="text"
                                    placeholder={t("auth.signup.orgNamePlaceholder")}
                                    value={orgName}
                                    onChange={(e) => setOrgName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="subdomain">{t("auth.signup.subdomainLabel")}</Label>
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
                                        <Loader2 className="h-3 w-3 animate-spin" />{" "}
                                        {t("auth.signup.checkingAvailability")}
                                    </p>
                                )}
                                {subdomainError && <p className="text-sm text-red-500">{subdomainError}</p>}
                                {subdomainAvailable === true && !subdomainError && (
                                    <p className="text-sm text-green-600 flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> {t("auth.signup.subdomainAvailable")}
                                    </p>
                                )}
                                {subdomainAvailable === false && (
                                    <p className="text-sm text-red-500 flex items-center gap-1">
                                        <XCircle className="h-3 w-3" /> {t("auth.signup.subdomainTaken")}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">{t("auth.signup.yourEmailLabel")}</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder={t("auth.signup.yourEmailPlaceholder")}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">{t("auth.signup.passwordLabel")}</Label>
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
                                {t("auth.signup.createOrgButton")}
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
                            <ArrowLeft className="h-4 w-4" /> {t("common.back")}
                        </button>
                        <CardTitle>{t("auth.signup.joinOrgTitle")}</CardTitle>
                        <CardDescription>{t("auth.signup.joinOrgDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleJoinOrg} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="joinSubdomain">{t("auth.signup.joinSubdomainLabel")}</Label>
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
                                <p className="text-xs text-gray-500">{t("auth.signup.askAdminSubdomain")}</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">{t("auth.signup.yourEmailLabel")}</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder={t("auth.signup.yourEmailPlaceholder")}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">{t("auth.signup.passwordLabel")}</Label>
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
                                <Label htmlFor="message">{t("auth.signup.messageToAdminLabel")}</Label>
                                <Input
                                    id="message"
                                    type="text"
                                    placeholder={t("auth.signup.messageToAdminPlaceholder")}
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
                                {t("auth.signup.submitRequest")}
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
                        <CardTitle>{t("auth.signup.requestSubmittedTitle")}</CardTitle>
                        <CardDescription>{t("auth.signup.requestSubmittedDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-sm text-gray-500 mb-4">{t("auth.signup.requestSubmittedBody")}</p>
                        <p className="text-sm text-gray-600">{t("auth.signup.checkEmailUpdates")}</p>
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
                            {t("auth.signup.goToLogin")}
                        </Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}
