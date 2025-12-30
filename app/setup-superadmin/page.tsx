"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, CheckCircle, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SetupSuperAdminPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSetSuperAdmin = async () => {
        if (!user) {
            setError("You must be logged in");
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
                router.push("/bunny");
            }, 2000);
        } catch (err) {
            console.error("Error setting role:", err);
            setError("Failed to update role. Try refreshing and logging in again.");
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
                        <p>Please log in first</p>
                        <Button className="mt-4" onClick={() => router.push("/login")}>
                            Go to Login
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
                    <CardTitle>Super Admin Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {done ? (
                        <div className="text-center">
                            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                            <p className="text-green-600 font-medium">Role updated to Super Admin!</p>
                            <p className="text-gray-500 text-sm mt-2">Redirecting to admin dashboard...</p>
                        </div>
                    ) : (
                        <>
                            <p className="text-gray-600 text-center">
                                Click the button below to set your account as Super Admin.
                            </p>
                            <p className="text-sm text-gray-500 text-center">Current user: {user.email}</p>

                            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

                            <Button
                                className="w-full bg-purple-600 hover:bg-purple-700"
                                onClick={handleSetSuperAdmin}
                                disabled={loading}
                            >
                                {loading ? "Setting up..." : "Make Me Super Admin"}
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
