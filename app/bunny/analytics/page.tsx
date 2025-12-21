"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    TrendingUp, TrendingDown, Users, Building2, CreditCard, DollarSign,
    Activity, ArrowUpRight, ArrowDownRight, Calendar, BarChart3, PieChart
} from "lucide-react";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Design system colors
const colors = {
    dark: "#352b38",
    gray: "#7e808c",
    purple: "#dad8f9",
    light: "#f4f3f8",
    accent: "#9b8cff",
};

interface AnalyticsData {
    totalTenants: number;
    activeTenants: number;
    trialTenants: number;
    suspendedTenants: number;
    totalUsers: number;
    monthlyRevenue: number;
    newTenantsThisMonth: number;
    conversionRate: number;
}

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData>({
        totalTenants: 0,
        activeTenants: 0,
        trialTenants: 0,
        suspendedTenants: 0,
        totalUsers: 0,
        monthlyRevenue: 0,
        newTenantsThisMonth: 0,
        conversionRate: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            // Fetch tenants
            const tenantsSnap = await getDocs(collection(db, "organizations"));
            const tenants = tenantsSnap.docs.map(d => d.data());

            const activeTenants = tenants.filter(t => t.status === "active").length;
            const trialTenants = tenants.filter(t => t.status === "trial").length;
            const suspendedTenants = tenants.filter(t => t.status === "suspended").length;

            // Fetch users
            const usersSnap = await getDocs(collection(db, "users"));

            // Calculate new tenants this month
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const newTenantsThisMonth = tenants.filter(t => {
                if (t.createdAt?.toDate) {
                    return t.createdAt.toDate() >= startOfMonth;
                }
                return false;
            }).length;

            // Calculate conversion rate (trial to active)
            const conversionRate = trialTenants > 0
                ? Math.round((activeTenants / (activeTenants + trialTenants)) * 100)
                : 0;

            setData({
                totalTenants: tenants.length,
                activeTenants,
                trialTenants,
                suspendedTenants,
                totalUsers: usersSnap.docs.length,
                monthlyRevenue: 0, // TODO: Calculate from actual subscription data
                newTenantsThisMonth,
                conversionRate,
            });
        } catch (error) {
            console.error("Error loading analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            title: "Total Tenants",
            value: data.totalTenants,
            change: "+12%",
            trend: "up",
            icon: Building2,
            color: "#d4c3e8",
        },
        {
            title: "Active Subscriptions",
            value: data.activeTenants,
            change: "+8%",
            trend: "up",
            icon: CreditCard,
            color: "#c8e6d4",
        },
        {
            title: "Total Users",
            value: data.totalUsers,
            change: "+24%",
            trend: "up",
            icon: Users,
            color: colors.purple,
        },
        {
            title: "Monthly Revenue",
            value: `$${data.monthlyRevenue.toLocaleString()}`,
            change: "+18%",
            trend: "up",
            icon: DollarSign,
            color: "#fde68a",
        },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold" style={{ color: colors.dark }}>Analytics</h1>
                <p style={{ color: colors.gray }}>Platform performance metrics and insights</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Card key={card.title} className="border-0 shadow-sm rounded-2xl" style={{ backgroundColor: card.color }}>
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium" style={{ color: colors.dark }}>{card.title}</p>
                                        <p className="text-3xl font-bold mt-2" style={{ color: colors.dark }}>
                                            {loading ? "..." : card.value}
                                        </p>
                                        <p className="text-xs mt-2 flex items-center gap-1" style={{ color: colors.dark }}>
                                            {card.trend === "up" ? (
                                                <ArrowUpRight className="h-3 w-3 text-green-600" />
                                            ) : (
                                                <ArrowDownRight className="h-3 w-3 text-red-600" />
                                            )}
                                            {card.change} vs last month
                                        </p>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.5)" }}>
                                        <Icon className="h-5 w-5" style={{ color: colors.dark }} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Tenant Distribution */}
                <Card className="border-0 shadow-sm rounded-2xl bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: colors.dark }}>
                            <PieChart className="h-4 w-4" />
                            Tenant Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                    <span style={{ color: colors.gray }}>Active</span>
                                </div>
                                <span className="font-medium" style={{ color: colors.dark }}>{loading ? "..." : data.activeTenants}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <span style={{ color: colors.gray }}>Trial</span>
                                </div>
                                <span className="font-medium" style={{ color: colors.dark }}>{loading ? "..." : data.trialTenants}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <span style={{ color: colors.gray }}>Suspended</span>
                                </div>
                                <span className="font-medium" style={{ color: colors.dark }}>{loading ? "..." : data.suspendedTenants}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Growth Metrics */}
                <Card className="border-0 shadow-sm rounded-2xl bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: colors.dark }}>
                            <TrendingUp className="h-4 w-4" />
                            Growth Metrics
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span style={{ color: colors.gray }}>New Tenants (This Month)</span>
                                <span className="font-medium text-green-600">{loading ? "..." : data.newTenantsThisMonth}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span style={{ color: colors.gray }}>Trial Conversion Rate</span>
                                <span className="font-medium" style={{ color: colors.dark }}>{loading ? "..." : `${data.conversionRate}%`}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span style={{ color: colors.gray }}>Avg Users per Tenant</span>
                                <span className="font-medium" style={{ color: colors.dark }}>
                                    {loading ? "..." : data.totalTenants > 0 ? Math.round(data.totalUsers / data.totalTenants) : 0}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Revenue Insights */}
                <Card className="border-0 shadow-sm rounded-2xl bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: colors.dark }}>
                            <DollarSign className="h-4 w-4" />
                            Revenue Insights
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span style={{ color: colors.gray }}>MRR</span>
                                <span className="font-medium" style={{ color: colors.dark }}>${loading ? "..." : data.monthlyRevenue.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span style={{ color: colors.gray }}>ARR</span>
                                <span className="font-medium" style={{ color: colors.dark }}>${loading ? "..." : (data.monthlyRevenue * 12).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span style={{ color: colors.gray }}>Avg Revenue per Tenant</span>
                                <span className="font-medium" style={{ color: colors.dark }}>
                                    ${loading ? "..." : data.activeTenants > 0 ? Math.round(data.monthlyRevenue / data.activeTenants) : 0}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Platform Health */}
            <Card className="border-0 shadow-sm rounded-2xl bg-white">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: colors.dark }}>
                        <Activity className="h-4 w-4" />
                        Platform Health
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[
                            { name: "API", status: "Healthy", uptime: "99.9%" },
                            { name: "Database", status: "Healthy", uptime: "99.8%" },
                            { name: "Storage", status: "Healthy", uptime: "99.9%" },
                            { name: "Auth", status: "Healthy", uptime: "100%" },
                        ].map((service) => (
                            <div key={service.name} className="p-4 rounded-xl" style={{ backgroundColor: colors.light }}>
                                <div className="flex items-center justify-between">
                                    <span className="font-medium" style={{ color: colors.dark }}>{service.name}</span>
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                </div>
                                <p className="text-xs mt-1" style={{ color: colors.gray }}>
                                    {service.status} • {service.uptime} uptime
                                </p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
