"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    orgId?: string;
    role?: string;
    refreshClaims?: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    orgId: undefined,
    role: undefined,
    refreshClaims: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [claims, setClaims] = useState<{ orgId?: string; role?: string; [key: string]: unknown }>({});

    useEffect(() => {
        // Listen to Firebase Auth state changes
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    // Force refresh token to get latest custom claims (like orgId)
                    let tokenResult = await firebaseUser.getIdTokenResult(true);
                    let currentClaims = tokenResult.claims;

                    // If orgId claim is missing, try to sync from Firestore
                    if (!currentClaims.orgId && !currentClaims.isSuperAdmin) {
                        console.log("🔄 Token missing orgId claim, syncing from Firestore...");

                        try {
                            // Fetch user profile from Firestore
                            const { doc, getDoc } = await import("firebase/firestore");
                            const { db } = await import("@/lib/firebase");
                            const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

                            if (userDoc.exists()) {
                                const userData = userDoc.data();
                                const profileOrgId = userData.orgId || userData.organizationId;
                                const profileRole = userData.role || "staff";

                                if (profileOrgId) {
                                    console.log(`   Found orgId=${profileOrgId}, role=${profileRole} in Firestore`);

                                    // Call API to set claims
                                    const response = await fetch("/api/auth/set-claims", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            uid: firebaseUser.uid,
                                            orgId: profileOrgId,
                                            role: profileRole,
                                        }),
                                    });

                                    if (response.ok) {
                                        console.log("✅ Claims set, refreshing token...");
                                        // Force another token refresh to get the new claims
                                        tokenResult = await firebaseUser.getIdTokenResult(true);
                                        currentClaims = tokenResult.claims;
                                        console.log("✅ Token refreshed with claims:", {
                                            orgId: currentClaims.orgId,
                                            role: currentClaims.role,
                                        });
                                    } else {
                                        console.warn("⚠️ Failed to set claims:", await response.text());
                                    }
                                }
                            }
                        } catch (syncError) {
                            console.error("Error syncing claims:", syncError);
                            // Continue anyway - user may still be able to access some features
                        }
                    }

                    setClaims(currentClaims);
                } catch (e) {
                    console.error("Failed to refresh token", e);
                }
            } else {
                setClaims({});
            }
            setUser(firebaseUser);
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    // Helper to force refresh claims manually (e.g. after role change)
    const refreshClaims = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const tokenResult = await user.getIdTokenResult(true);
            setClaims(tokenResult.claims);
        } catch (e) {
            console.error("Failed to force refresh token", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                // Expose claims directly
                orgId: claims.orgId as string | undefined,
                role: claims.role as string | undefined,
                refreshClaims,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
