"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
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
    // Added: actual role when impersonating
    actualRole?: "superadmin" | "admin" | "staff" | "customer";
    actualOrgId?: string;
}

export function useUserProfile() {
    const { user } = useAuth();
    const { isImpersonating, impersonatedOrgId, originalRole } = useImpersonation();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProfile() {
            if (!user) {
                setProfile(null);
                setLoading(false);
                return;
            }

            try {
                const docRef = doc(db, "users", user.uid);
                console.log("Fetching user profile...");
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    console.log("User profile exists.");
                    const data = docSnap.data();
                    let orgId = data.orgId || data.organizationId;
                    const actualOrgId = orgId;
                    const actualRole = data.role;

                    // Self-healing: If orgId is missing, try to find it or fix it
                    if (!orgId) {
                        console.log("Missing orgId, attempting self-repair...");
                        // 1. Try to find an organization owned by this user
                        const { collection, query, where, getDocs, limit, updateDoc } = await import("firebase/firestore");
                        const orgsRef = collection(db, "organizations");
                        const q = query(orgsRef, where("ownerId", "==", user.uid), limit(1));

                        console.log("Querying organizations for self-repair...");
                        try {
                            const orgSnap = await getDocs(q);
                            if (!orgSnap.empty) {
                                orgId = orgSnap.docs[0].id;
                                console.log("Found owned organization, linking:", orgId);
                            } else {
                                // 2. Fallback: Use UID as orgId (default for single-user tenants)
                                orgId = user.uid;
                                console.log("No organization found, defaulting to UID:", orgId);
                            }

                            console.log("Updating profile with new orgId...");
                            await updateDoc(docRef, { orgId });
                        } catch (repairError) {
                            console.error("Self-repair failed:", repairError);
                            // Fallthrough so we at least return the profile, even if partial
                        }
                    }

                    // Check if superadmin is impersonating a tenant
                    if (isImpersonating && impersonatedOrgId && data.role === "superadmin") {
                        console.log("Impersonation active - overriding orgId to:", impersonatedOrgId);
                        orgId = impersonatedOrgId;
                    }

                    setProfile({
                        uid: user.uid,
                        ...data,
                        orgId,
                        // When impersonating, act as admin of that org but keep track of actual role
                        role: isImpersonating && impersonatedOrgId ? "admin" : data.role,
                        actualRole: actualRole,
                        actualOrgId: actualOrgId
                    } as UserProfile);
                } else {
                    console.log("Profile not found, creating new one...");
                    // Auto-create profile for authenticated users without one
                    const newProfile = {
                        email: user.email || "",
                        orgId: user.uid, // Use uid as default orgId for new users
                        role: "admin" as const,
                        createdAt: serverTimestamp(),
                    };

                    await setDoc(docRef, newProfile);
                    setProfile({ uid: user.uid, ...newProfile, createdAt: new Date().toISOString() } as UserProfile);
                    console.log("Created new user profile");
                }
            } catch (error) {
                console.error("Error fetching user profile:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchProfile();
    }, [user, isImpersonating, impersonatedOrgId]);

    // Sync Admin to Staff Collection (only if NOT impersonating)
    useEffect(() => {
        async function syncAdminToStaff() {
            if (!user || !profile || (profile.role !== "admin" && profile.role !== "superadmin")) return;
            // Don't sync when impersonating
            if (isImpersonating) return;

            try {
                const staffRef = doc(db, "staff", user.uid);
                const staffSnap = await getDoc(staffRef);

                if (!staffSnap.exists()) {
                    console.log("Syncing admin to staff collection...");
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
                        profileImageUrl: profile.photoURL || user.photoURL
                    });
                    console.log("Admin synced to staff.");
                }
            } catch (error) {
                console.error("Error syncing admin to staff:", error);
            }
        }

        if (profile) {
            syncAdminToStaff();
        }
    }, [user, profile, isImpersonating]);

    return { profile, loading };
}
