"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { SuperAdminRole } from '@/lib/rbac/super-admin';

/**
 * Hook to get Super Admin status from Firebase custom claims.
 * 
 * SINGLE SOURCE OF TRUTH: Firebase Auth Custom Claims
 * 
 * Returns the isSuperAdmin and superRole from the current user's ID token.
 * NOTE: Claims are cached in the token. After claims are changed,
 * the user must log out and back in, OR call refreshClaims().
 */
export function useSuperAdmin() {
    const { user } = useAuth();
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [role, setRole] = useState<SuperAdminRole>(SuperAdminRole.ContentAdmin);
    const [loading, setLoading] = useState(true);

    const refreshClaims = async () => {
        if (!user) {
            setIsSuperAdmin(false);
            setRole(SuperAdminRole.ContentAdmin);
            setLoading(false);
            return;
        }

        try {
            // Force refresh to get latest claims from Firebase
            const tokenResult = await user.getIdTokenResult(true);
            const claims = tokenResult.claims;

            setIsSuperAdmin(claims.isSuperAdmin === true);
            setRole((claims.superRole as SuperAdminRole) || SuperAdminRole.ContentAdmin);
        } catch (error) {
            console.error("[useSuperAdmin] Failed to get claims:", error);
            setIsSuperAdmin(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshClaims();
    }, [user]);

    return { isSuperAdmin, role, loading, refreshClaims };
}
