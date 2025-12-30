"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/auth-provider";
import { useUserProfile } from "@/components/hooks/use-user-profile";

export interface StaffPermissions {
    permissions: string[];
    isAdmin: boolean;
    roleId: string;
    loading: boolean;
}

/**
 * Hook to get current user's permissions from their staff document
 * Admins have all permissions, staff have only assigned permissions
 */
export function usePermissions(): StaffPermissions {
    const { user } = useAuth();
    const { profile, loading: profileLoading } = useUserProfile();
    const [permissions, setPermissions] = useState<string[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [roleId, setRoleId] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPermissions() {
            if (!user || profileLoading) {
                return;
            }

            // Superadmin and admin have all permissions
            if (profile?.role === "superadmin" || profile?.role === "admin") {
                setIsAdmin(true);
                setPermissions([]); // Empty means all permissions for admin
                setRoleId("admin");
                setLoading(false);
                return;
            }

            if (!profile?.orgId) {
                setLoading(false);
                return;
            }

            try {
                // For staff, find their staff document by authUid
                const staffRef = collection(db, "staff");
                const q = query(staffRef, where("authUid", "==", user.uid), where("orgId", "==", profile.orgId));
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    const staffDoc = snapshot.docs[0].data();
                    setPermissions(staffDoc.permissions || []);
                    setIsAdmin(staffDoc.isAdmin || false);
                    setRoleId(staffDoc.roleId || "employee");
                } else if (user.email) {
                    // Fallback: Try finding by email
                    const emailQuery = query(
                        staffRef,
                        where("email", "==", user.email.toLowerCase()),
                        where("orgId", "==", profile.orgId)
                    );
                    const emailSnapshot = await getDocs(emailQuery);

                    if (!emailSnapshot.empty) {
                        const staffDoc = emailSnapshot.docs[0].data();
                        setPermissions(staffDoc.permissions || []);
                        setIsAdmin(staffDoc.isAdmin || false);
                        setRoleId(staffDoc.roleId || "employee");
                    } else {
                        console.warn("No staff document found for user:", user.uid);
                        setPermissions([]);
                        setIsAdmin(false);
                    }
                } else {
                    console.warn("No staff document found for user (no email):", user.uid);
                    setPermissions([]);
                    setIsAdmin(false);
                }
            } catch (error) {
                console.error("Error fetching permissions:", error);
                setPermissions([]);
            } finally {
                setLoading(false);
            }
        }

        if (!profileLoading) {
            fetchPermissions();
        }
    }, [user, profile, profileLoading]);

    return { permissions, isAdmin, roleId, loading };
}

/**
 * Check if user has a specific permission
 * Admins always return true
 */
export function hasPermission(permissions: string[], isAdmin: boolean, requiredPermission: string): boolean {
    if (isAdmin) return true;
    return permissions.includes(requiredPermission);
}

/**
 * Check if user can access a module (has any view permission for it)
 * Example: canAccessModule(perms, isAdmin, "customers") checks for "customers-view"
 */
export function canAccessModule(permissions: string[], isAdmin: boolean, module: string): boolean {
    if (isAdmin) return true;
    return permissions.includes(`${module}-view`);
}
