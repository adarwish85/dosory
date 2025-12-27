"use client";

import { useEffect, useState } from "react";
import { collection, query, getDocs, doc, getDoc, orderBy, limit, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";

export interface Tenant {
    id: string;
    name: string;
    email: string;
    plan: "free" | "starter" | "professional" | "enterprise";
    status: "active" | "trial" | "suspended" | "cancelled";
    userCount: number;
    createdAt: string;
    trialEndsAt?: string;
    subscriptionEndsAt?: string;
}

export interface AdminStats {
    totalTenants: number;
    activeTenants: number;
    trialTenants: number;
    totalUsers: number;
    monthlyRevenue: number;
    activeSubscriptions: number;
}

export interface PlatformSubscription {
    id: string;
    tenantId: string;
    tenantName: string;
    plan: string;
    status: "active" | "trial" | "expired" | "cancelled";
    amount: number;
    currency: string;
    startDate: string;
    endDate: string;
}

// Hook to fetch all tenants (organizations)
export function useTenants() {
    const { profile } = useUserProfile();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTenants = async () => {
        if (profile?.role !== "superadmin") {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const tenantsRef = collection(db, "organizations");
            const q = query(tenantsRef, orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);

            const tenantsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            })) as Tenant[];

            setTenants(tenantsData);
        } catch (error) {
            console.error("Error fetching tenants:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTenants();
    }, [profile]);

    return { tenants, loading, refetch: fetchTenants };
}

// Hook to fetch platform-wide admin statistics
export function useAdminStats() {
    const { profile } = useUserProfile();
    const [stats, setStats] = useState<AdminStats>({
        totalTenants: 0,
        activeTenants: 0,
        trialTenants: 0,
        totalUsers: 0,
        monthlyRevenue: 0,
        activeSubscriptions: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            if (profile?.role !== "superadmin") {
                setLoading(false);
                return;
            }

            try {
                // Fetch organizations count
                const orgsRef = collection(db, "organizations");
                const orgsSnapshot = await getDocs(orgsRef);
                const totalTenants = orgsSnapshot.size;

                // Count active and trial tenants
                let activeTenants = 0;
                let trialTenants = 0;
                orgsSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.status === "active") activeTenants++;
                    if (data.status === "trial") trialTenants++;
                });

                // Fetch total users count
                const usersRef = collection(db, "users");
                const usersSnapshot = await getDocs(usersRef);
                const totalUsers = usersSnapshot.size;

                // Fetch subscriptions
                const subsRef = collection(db, "platformSubscriptions");
                const activeSubsQuery = query(subsRef, where("status", "==", "active"));
                const activeSubsSnapshot = await getDocs(activeSubsQuery);
                const activeSubscriptions = activeSubsSnapshot.size;

                // Calculate monthly revenue
                let monthlyRevenue = 0;

                if (activeSubsSnapshot.size > 0) {
                    activeSubsSnapshot.docs.forEach(doc => {
                        monthlyRevenue += doc.data().amount || 0;
                    });
                } else {
                    // Fallback: Estimate based on plan types if no subscription records
                    // Enterprise: $299, Professional: $99, Starter: $29 (Example pricing)
                    orgsSnapshot.docs.forEach(doc => {
                        const data = doc.data();
                        if (data.status === "active") {
                            if (data.plan === "enterprise") monthlyRevenue += 299;
                            else if (data.plan === "professional") monthlyRevenue += 99;
                            else if (data.plan === "starter") monthlyRevenue += 29;
                        }
                    });
                }

                setStats({
                    totalTenants,
                    activeTenants,
                    trialTenants,
                    totalUsers,
                    monthlyRevenue,
                    activeSubscriptions,
                });
            } catch (error) {
                console.error("Error fetching admin stats:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchStats();
    }, [profile]);

    return { stats, loading };
}

// Hook to fetch platform subscriptions
export function usePlatformSubscriptions() {
    const { profile } = useUserProfile();
    const [subscriptions, setSubscriptions] = useState<PlatformSubscription[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSubscriptions() {
            if (profile?.role !== "superadmin") {
                setLoading(false);
                return;
            }

            try {
                const subsRef = collection(db, "platformSubscriptions");
                const q = query(subsRef, orderBy("startDate", "desc"));
                const snapshot = await getDocs(q);

                const subsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    startDate: doc.data().startDate?.toDate?.()?.toISOString() || "",
                    endDate: doc.data().endDate?.toDate?.()?.toISOString() || "",
                })) as PlatformSubscription[];

                setSubscriptions(subsData);
            } catch (error) {
                console.error("Error fetching subscriptions:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchSubscriptions();
    }, [profile]);

    return { subscriptions, loading };
}
