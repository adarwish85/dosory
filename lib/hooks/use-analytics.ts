"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/auth-provider";
import { useUserProfile } from "@/components/hooks/use-user-profile";

interface RevenueData {
    month: string;
    revenue: number;
    invoiceCount: number;
}

interface SalesMetrics {
    totalRevenue: number;
    monthlyRevenue: number;
    outstandingAmount: number;
    paidInvoices: number;
    pendingInvoices: number;
    overdueInvoices: number;
    averageInvoiceValue: number;
    collectionRate: number;
}

interface CustomerMetrics {
    totalCustomers: number;
    newThisMonth: number;
    activeCustomers: number;
    customerGrowthRate: number;
}

export function useAnalytics() {
    const { user } = useAuth();
    const { profile } = useUserProfile();
    const [loading, setLoading] = useState(true);
    const [salesMetrics, setSalesMetrics] = useState<SalesMetrics | null>(null);
    const [customerMetrics, setCustomerMetrics] = useState<CustomerMetrics | null>(null);
    const [revenueByMonth, setRevenueByMonth] = useState<RevenueData[]>([]);

    useEffect(() => {
        if (!user || !profile?.orgId) return;

        async function fetchAnalytics() {
            setLoading(true);
            const orgId = profile!.orgId;
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfYear = new Date(now.getFullYear(), 0, 1);

            try {
                // PERFORMANCE FIX: Add limits to prevent fetching all documents
                // Fetch recent invoices only (last 500 max)
                const invoicesRef = collection(db, "invoices");
                const invoicesQuery = query(
                    invoicesRef,
                    where("orgId", "==", orgId),
                    orderBy("createdAt", "desc"),
                    limit(500) // Limit to prevent excessive reads
                );
                const invoicesSnap = await getDocs(invoicesQuery);

                let totalRevenue = 0;
                let monthlyRevenue = 0;
                let outstandingAmount = 0;
                let paidCount = 0;
                let pendingCount = 0;
                let overdueCount = 0;

                const monthlyData: Record<string, { revenue: number; count: number }> = {};

                invoicesSnap.docs.forEach((doc) => {
                    const inv = doc.data();
                    const total = inv.total || 0;
                    const amountPaid = inv.amountPaid || 0;
                    const createdAt = inv.createdAt?.toDate?.() || new Date();

                    totalRevenue += amountPaid;
                    outstandingAmount += total - amountPaid;

                    if (inv.status === "paid") paidCount++;
                    else if (inv.status === "overdue") overdueCount++;
                    else pendingCount++;

                    if (createdAt >= startOfMonth) {
                        monthlyRevenue += amountPaid;
                    }

                    // Group by month
                    const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
                    if (!monthlyData[monthKey]) {
                        monthlyData[monthKey] = { revenue: 0, count: 0 };
                    }
                    monthlyData[monthKey].revenue += amountPaid;
                    monthlyData[monthKey].count++;
                });

                const avgInvoice = invoicesSnap.size > 0 ? totalRevenue / invoicesSnap.size : 0;
                const collectionRate = totalRevenue > 0 ? (totalRevenue / (totalRevenue + outstandingAmount)) * 100 : 0;

                setSalesMetrics({
                    totalRevenue,
                    monthlyRevenue,
                    outstandingAmount,
                    paidInvoices: paidCount,
                    pendingInvoices: pendingCount,
                    overdueInvoices: overdueCount,
                    averageInvoiceValue: avgInvoice,
                    collectionRate,
                });

                // Format monthly data for chart
                const sortedMonths = Object.keys(monthlyData).sort().slice(-6);
                setRevenueByMonth(
                    sortedMonths.map((month) => ({
                        month: new Date(month + "-01").toLocaleDateString("en", { month: "short" }),
                        revenue: monthlyData[month].revenue,
                        invoiceCount: monthlyData[month].count,
                    }))
                );

                // Fetch Customers (limit to recent 200)
                const customersRef = collection(db, "customers");
                const customersQuery = query(
                    customersRef,
                    where("orgId", "==", orgId),
                    orderBy("createdAt", "desc"),
                    limit(200)
                );
                const customersSnap = await getDocs(customersQuery);

                let newThisMonth = 0;
                customersSnap.docs.forEach((doc) => {
                    const cust = doc.data();
                    const createdAt = cust.createdAt?.toDate?.() || new Date(0);
                    if (createdAt >= startOfMonth) newThisMonth++;
                });

                setCustomerMetrics({
                    totalCustomers: customersSnap.size,
                    newThisMonth,
                    activeCustomers: customersSnap.size, // Could filter by recent activity
                    customerGrowthRate: customersSnap.size > 0 ? (newThisMonth / customersSnap.size) * 100 : 0,
                });
            } catch (error) {
                console.error("Error fetching analytics:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchAnalytics();

        // NOTE: This runs on mount only. For live updates, consider implementing
        // a refresh button or periodic polling (every 5 minutes) instead of real-time
    }, [user, profile?.orgId]);

    return {
        loading,
        salesMetrics,
        customerMetrics,
        revenueByMonth,
    };
}
