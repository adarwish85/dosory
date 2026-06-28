"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, CheckCircle, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";

export default function SetupSuperAdminPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSetSuperAdmin = async () => {
        if (!user) {
            setError(t("auth.setupSuperAdmin.mustBeLoggedIn"));
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                role: "superadmin",
            });
            setDone(true);

            // Redirect after 2 seconds
            setTimeout(() => {
                router.push("/sa");
            }, 2000);
        } catch (err) {
            console.error("Error setting role:", err);
            setError(t("auth.setupSuperAdmin.updateFailed"));
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <Card className="max-w-md">
                    <CardContent className="p-8 text-center">
                        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                        <p>{t("auth.setupSuperAdmin.pleaseLogIn")}</p>
                        <Button className="mt-4" onClick={() => router.push("/login")}>
                            {t("auth.setupSuperAdmin.goToLogin")}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                    <Shield className="h-16 w-16 text-purple-600 mx-auto mb-4" />
                    <CardTitle>{t("auth.setupSuperAdmin.title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {done ? (
                        <div className="text-center">
                            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                            <p className="text-green-600 font-medium">{t("auth.setupSuperAdmin.roleUpdated")}</p>
                            <p className="text-gray-500 text-sm mt-2">{t("auth.setupSuperAdmin.redirecting")}</p>
                        </div>
                    ) : (
                        <>
                            <p className="text-gray-600 text-center">
                                {t("auth.setupSuperAdmin.instruction")}
                            </p>
                            <p className="text-sm text-gray-500 text-center">{t("auth.setupSuperAdmin.currentUser", { email: user.email ?? "" })}</p>

                            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

                            <Button
                                className="w-full bg-purple-600 hover:bg-purple-700"
                                onClick={handleSetSuperAdmin}
                                disabled={loading}
                            >
                                {loading ? t("auth.setupSuperAdmin.settingUp") : t("auth.setupSuperAdmin.makeMeSuperAdmin")}
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
