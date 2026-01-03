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
                    const tokenResult = await firebaseUser.getIdTokenResult(true);
                    setClaims(tokenResult.claims);

                    // Optional: If orgId is missing but we expect it (e.g. after registration),
                    // we could poll or wait. For now, we just expose what we have.
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
