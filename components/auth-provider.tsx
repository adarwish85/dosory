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
                    // Clear stale claims_synced flag after 5 minutes
                    const syncedTime = sessionStorage.getItem("claims_synced_time");
                    if (syncedTime && Date.now() - parseInt(syncedTime) > 5 * 60 * 1000) {
                        sessionStorage.removeItem("claims_synced");
                        sessionStorage.removeItem("claims_synced_time");
                    }

                    // Use CACHED token first (instant) — no network round-trip
                    let tokenResult = await firebaseUser.getIdTokenResult(false);
                    let currentClaims = tokenResult.claims;

                    // If orgId claim is missing, try to sync from Firestore
                    if (!currentClaims.orgId && !currentClaims.isSuperAdmin) {
                        // Only now force-refresh to check if server has newer claims
                        tokenResult = await firebaseUser.getIdTokenResult(true);
                        currentClaims = tokenResult.claims;
                    }

                    // Set user + claims immediately so downstream providers can start
                    setClaims(currentClaims);
                    setUser(firebaseUser);
                    setLoading(false);

                    // Background: If still missing claims, sync from Firestore (non-blocking)
                    if (!currentClaims.orgId && !currentClaims.isSuperAdmin) {
                        syncClaimsFromFirestore(firebaseUser).catch((err) =>
                            console.error("Background claims sync failed:", err)
                        );
                    }

                    return; // Skip the bottom setUser/setLoading (already done above)
                } catch (e) {
                    console.error("Failed to read token", e);
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

    // Non-blocking claims sync — runs in background, reloads only if needed
    const syncClaimsFromFirestore = async (firebaseUser: User) => {
        try {
            const { doc, getDoc } = await import("firebase/firestore");
            const { db } = await import("@/lib/firebase");
            const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

            if (userDoc.exists()) {
                const userData = userDoc.data();
                const profileOrgId = userData.orgId || userData.organizationId;
                const profileRole = userData.role || "staff";

                if (profileOrgId) {
                    const response = await fetch("/api/auth/set-claims", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${await firebaseUser.getIdToken()}`,
                        },
                        body: JSON.stringify({
                            uid: firebaseUser.uid,
                            orgId: profileOrgId,
                            role: profileRole,
                        }),
                    });

                    if (response.ok) {
                        const tokenResult = await firebaseUser.getIdTokenResult(true);
                        setClaims(tokenResult.claims);

                        // Reload only once to apply new claims to Firestore listeners
                        if (!sessionStorage.getItem("claims_synced")) {
                            sessionStorage.setItem("claims_synced", "true");
                            sessionStorage.setItem("claims_synced_time", Date.now().toString());
                            window.location.reload();
                        }
                    }
                }
            }
        } catch (syncError) {
            console.error("Error syncing claims:", syncError);
        }
    };

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
