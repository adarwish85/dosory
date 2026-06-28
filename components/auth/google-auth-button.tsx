"use client";

import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

// Google SVG Icon
const GoogleIcon = () => (
    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
        <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
        />
        <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
        />
        <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
        />
        <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
        />
    </svg>
);

interface GoogleAuthButtonProps {
    mode: "signin" | "signup";
    onSuccess?: (user: { uid: string; email: string | null; displayName: string | null; isNewUser: boolean }) => void;
    onError?: (error: Error) => void;
    className?: string;
}

export function GoogleAuthButton({ mode, onSuccess, onError, className }: GoogleAuthButtonProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleGoogleAuth = async () => {
        setLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: "select_account" });

            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Check if user profile exists in Firestore
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const isNewUser = !userDoc.exists();

            if (onSuccess) {
                onSuccess({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    isNewUser,
                });
            } else {
                // Default behavior
                if (isNewUser) {
                    // New user needs to complete signup (create/join org)
                    router.push("/signup?provider=google");
                } else {
                    // Existing user - go to dashboard
                    router.push("/dashboard");
                }
            }
        } catch (error) {
            console.error("Google auth error:", error);
            if (onError) {
                onError(error instanceof Error ? error : new Error(String(error)));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            type="button"
            variant="outline"
            onClick={handleGoogleAuth}
            disabled={loading}
            className={`w-full flex items-center justify-center ${className || ""}`}
        >
            {loading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <GoogleIcon />}
            {mode === "signin" ? t("auth.google.signIn") : t("auth.google.signUp")}
        </Button>
    );
}
