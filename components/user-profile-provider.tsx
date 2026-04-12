"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/auth-provider";
import { useImpersonation } from "@/lib/hooks/use-impersonation";

export interface UserProfile {
    uid: string;
    email: string;
    orgId: string;
    role: "superadmin" | "admin" | "staff" | "customer";
    createdAt: string;
    // Optional profile fields
    displayName?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    jobTitle?: string;
    photoURL?: string;
    actualRole?: "superadmin" | "admin" | "staff" | "customer";
    actualOrgId?: string;
    // RBAC Permissions (V2)
    permissions?: string[];
}

interface UserProfileContextType {
    profile: UserProfile | null;
    loading: boolean;
    refreshProfile: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType>({
    profile: null,
    loading: true,
    refreshProfile: async () => {},
});

export function UserProfileProvider({ children }: { children: ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const { isImpersonating, impersonatedOrgId } = useImpersonation();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Real-time profile listener using onSnapshot (leverages Firestore cache for instant delivery)
    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            setProfile(null);
            setLoading(false);
            return;
        }

        const docRef = doc(db, "users", user.uid);

        const unsubscribe = onSnapshot(
            docRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    let orgId = data.orgId || data.organizationId;
                    const actualOrgId = orgId;
                    const actualRole = data.role;

                    // If orgId missing, use uid as fallback (self-heal in background)
                    if (!orgId) {
                        orgId = user.uid;
                        // Fire-and-forget: repair orgId in background
                        repairMissingOrgId(user.uid, docRef).catch(console.error);
                    }

                    // Check if superadmin is impersonating a tenant
                    if (isImpersonating && impersonatedOrgId && data.role === "superadmin") {
                        orgId = impersonatedOrgId;
                    }

                    setProfile({
                        uid: user.uid,
                        ...data,
                        orgId,
                        role: isImpersonating && impersonatedOrgId ? "admin" : data.role,
                        actualRole: actualRole,
                        actualOrgId: actualOrgId,
                    } as UserProfile);
                } else {
                    // Auto-create profile for authenticated users without one
                    const newProfile = {
                        email: user.email || "",
                        orgId: user.uid,
                        role: "admin" as const,
                        createdAt: serverTimestamp(),
                    };
                    setDoc(docRef, newProfile).catch(console.error);
                    setProfile({ uid: user.uid, ...newProfile, createdAt: new Date().toISOString() } as UserProfile);
                }
                setLoading(false);
            },
            (error) => {
                console.error("UserProvider: Error in profile listener:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user, authLoading, isImpersonating, impersonatedOrgId]);

    // Background: Repair missing orgId
    const repairMissingOrgId = async (uid: string, userDocRef: ReturnType<typeof doc>) => {
        const { collection, query, where, getDocs, limit, updateDoc } = await import("firebase/firestore");
        const orgsRef = collection(db, "organizations");
        const q = query(orgsRef, where("ownerId", "==", uid), limit(1));

        const orgSnap = await getDocs(q);
        const orgId = orgSnap.empty ? uid : orgSnap.docs[0].id;
        await updateDoc(userDocRef, { orgId });
    };

    // Background: Sync Admin to Staff Collection (fire-and-forget, non-blocking)
    useEffect(() => {
        if (authLoading || !user || !profile) return;
        if (profile.role !== "admin" && profile.role !== "superadmin") return;
        if (isImpersonating) return;

        // Fire-and-forget
        (async () => {
            try {
                const staffRef = doc(db, "staff", user.uid);
                const staffSnap = await getDoc(staffRef);

                if (!staffSnap.exists()) {
                    await setDoc(staffRef, {
                        firstName: profile.displayName?.split(" ")[0] || "Admin",
                        lastName: profile.displayName?.split(" ").slice(1).join(" ") || "User",
                        email: profile.email,
                        phone: profile.phone || "",
                        roleId: "admin",
                        isAdmin: true,
                        status: "active",
                        orgId: profile.actualOrgId || profile.orgId,
                        departmentIds: [],
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        createdBy: user.uid,
                        profileImageUrl: profile.photoURL || user.photoURL,
                    });
                }
            } catch (error) {
                console.error("UserProvider: Error syncing admin to staff:", error);
            }
        })();
    }, [user?.uid, profile?.orgId, profile?.role, isImpersonating, authLoading]);

    // Background: Auto-sync claims (fire-and-forget, non-blocking)
    useEffect(() => {
        if (authLoading || !user || !profile) return;
        if (profile.role === "superadmin") return;
        if (isImpersonating) return;

        // Fire-and-forget
        (async () => {
            try {
                const tokenResult = await user.getIdTokenResult();
                const tokenOrgId = tokenResult.claims.orgId as string | undefined;
                const tokenRole = tokenResult.claims.role as string | undefined;

                const needsSync =
                    (profile.orgId && !tokenOrgId) ||
                    (profile.orgId && tokenOrgId !== profile.orgId) ||
                    (profile.role && !tokenRole);

                if (needsSync) {
                    const response = await fetch("/api/auth/set-claims", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            uid: user.uid,
                            orgId: profile.actualOrgId || profile.orgId,
                            role: profile.actualRole || profile.role,
                        }),
                    });

                    if (response.ok) {
                        await user.getIdToken(true);
                    }
                }
            } catch (error) {
                console.error("UserProvider: Error in claims sync:", error);
            }
        })();
    }, [user?.uid, profile?.orgId, profile?.role, authLoading, isImpersonating]);

    // Stable refreshProfile for consumers
    const refreshProfile = useCallback(async () => {
        // onSnapshot handles this automatically now — this is kept for API compat
        // Force a re-read by toggling loading briefly
        if (!user) return;
        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data();
            let orgId = data.orgId || data.organizationId || user.uid;
            if (isImpersonating && impersonatedOrgId && data.role === "superadmin") {
                orgId = impersonatedOrgId;
            }
            setProfile({
                uid: user.uid,
                ...data,
                orgId,
                role: isImpersonating && impersonatedOrgId ? "admin" : data.role,
                actualRole: data.role,
                actualOrgId: data.orgId || data.organizationId,
            } as UserProfile);
        }
    }, [user, isImpersonating, impersonatedOrgId]);

    return (
        <UserProfileContext.Provider value={{ profile, loading, refreshProfile: refreshProfile }}>
            {children}
        </UserProfileContext.Provider>
    );
}

export const useContextMenuUserProfile = () => useContext(UserProfileContext);
