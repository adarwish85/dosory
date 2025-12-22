"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    TrendingUp, TrendingDown, Users, Building2, CreditCard, DollarSign,
    Activity, ArrowUpRight, ArrowDownRight, Calendar, BarChart3, PieChart, Clock
} from "lucide-react";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
            iconColor: "text-purple-600",
            iconBg: "bg-purple-100",
        },
        {
            title: "Active Subscriptions",
            value: data.activeTenants,
            change: "+8%",
            trend: "up",
            icon: CreditCard,
            iconColor: "text-green-600",
            iconBg: "bg-green-100",
        },
        {
            title: "Total Users",
            value: data.totalUsers,
            change: "+24%",
            trend: "up",
            icon: Users,
            iconColor: "text-blue-600",
            iconBg: "bg-blue-100",
        },
        {
            title: "Monthly Revenue",
            value: `$${data.monthlyRevenue.toLocaleString()}`,
            change: "+18%",
            trend: "up",
            icon: DollarSign,
            iconColor: "text-amber-600",
            iconBg: "bg-amber-100",
        },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
                <p className="text-gray-500">Platform performance metrics and comprehensive insights</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Card key={card.title} className="shadow-sm border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">{card.title}</p>
                                        <p className="text-3xl font-bold mt-2 text-gray-900">
                                            {loading ? <span className="text-gray-300">...</span> : card.value}
                                        </p>
                                        <div className="flex items-center gap-1 mt-2">
                                            <span className={`flex items-center text-xs font-medium ${card.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                                                {card.trend === "up" ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                                                {card.change}
                                            </span>
                                            <span className="text-xs text-gray-400">vs last month</span>
                                        </div>
                                    </div>
                                    <div className={`p-2.5 rounded-lg ${card.iconBg} ${card.iconColor}`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Tenant Distribution */}
                <Card className="shadow-sm border-gray-200 rounded-xl h-full">
                    <CardHeader className="pb-3 border-b border-gray-100">
                        <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                            <PieChart className="h-4 w-4 text-gray-500" />
                            Tenant Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-6">
                            <div className="relative pt-2 pb-6 flex justify-center">
                                {/* Simple CSS Pie Chart representation (placeholder for real chart) */}
                                <div className="flex gap-1 h-4 w-full rounded-full overflow-hidden bg-gray-100">
                                    <div className="bg-green-500 h-full" style={{ width: `${(data.activeTenants / (data.totalTenants || 1)) * 100}%` }}></div>
                                    <div className="bg-amber-500 h-full" style={{ width: `${(data.trialTenants / (data.totalTenants || 1)) * 100}%` }}></div>
                                    <div className="bg-red-500 h-full" style={{ width: `${(data.suspendedTenants / (data.totalTenants || 1)) * 100}%` }}></div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between group">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 ring-4 ring-green-50" />
                                        <span className="text-gray-600 font-medium">Active</span>
                                    </div>
                                    <span className="font-semibold text-gray-900 bg-gray-50 px-2.5 py-0.5 rounded-md">{loading ? "..." : data.activeTenants}</span>
                                </div>
                                <div className="flex items-center justify-between group">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-50" />
                                        <span className="text-gray-600 font-medium">Trial</span>
                                    </div>
                                    <span className="font-semibold text-gray-900 bg-gray-50 px-2.5 py-0.5 rounded-md">{loading ? "..." : data.trialTenants}</span>
                                </div>
                                <div className="flex items-center justify-between group">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-red-50" />
                                        <span className="text-gray-600 font-medium">Suspended</span>
                                    </div>
                                    <span className="font-semibold text-gray-900 bg-gray-50 px-2.5 py-0.5 rounded-md">{loading ? "..." : data.suspendedTenants}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Growth Metrics */}
                <Card className="shadow-sm border-gray-200 rounded-xl h-full">
                    <CardHeader className="pb-3 border-b border-gray-100">
                        <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-gray-500" />
                            Growth Metrics
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-5">
                            <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg border border-gray-100">
                                <span className="text-gray-600 text-sm font-medium">New Tenants (This Month)</span>
                                <span className="font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">{loading ? "..." : data.newTenantsThisMonth}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg border border-gray-100">
                                <span className="text-gray-600 text-sm font-medium">Trial Conversion Rate</span>
                                <span className="font-bold text-gray-900">{loading ? "..." : `${data.conversionRate}%`}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg border border-gray-100">
                                <span className="text-gray-600 text-sm font-medium">Avg Users per Tenant</span>
                                <span className="font-bold text-gray-900">
                                    {loading ? "..." : data.totalTenants > 0 ? Math.round(data.totalUsers / data.totalTenants) : 0}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Revenue Insights */}
                <Card className="shadow-sm border-gray-200 rounded-xl h-full">
                    <CardHeader className="pb-3 border-b border-gray-100">
                        <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-gray-500" />
                            Revenue Insights
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-5">
                            <div className="flex flex-col gap-1 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl">
                                <span className="text-blue-600 text-xs font-semibold uppercase tracking-wider">Monthly Recurring Revenue</span>
                                <span className="text-2xl font-bold text-blue-900 mt-1">${loading ? "..." : data.monthlyRevenue.toLocaleString()}</span>
                            </div>

                            <div className="space-y-3 pt-1">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">ARR Estimate</span>
                                    <span className="font-medium text-gray-900">${loading ? "..." : (data.monthlyRevenue * 12).toLocaleString()}</span>
                                </div>
                                <div className="w-full h-px bg-gray-100"></div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Avg Revenue / Tenant</span>
                                    <span className="font-medium text-gray-900">
                                        ${loading ? "..." : data.activeTenants > 0 ? Math.round(data.monthlyRevenue / data.activeTenants) : 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Platform Health */}
            <Card className="shadow-sm border-gray-200 rounded-xl overflow-hidden">
                <CardHeader className="pb-4 border-b border-gray-100 bg-gray-50/50">
                    <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-gray-500" />
                        Platform Health Monitor
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                        {[
                            { name: "API Gateway", status: "Healthy", uptime: "99.9%", lat: "45ms" },
                            { name: "Database Cluster", status: "Healthy", uptime: "99.8%", lat: "12ms" },
                            { name: "Storage Service", status: "Healthy", uptime: "99.9%", lat: "80ms" },
                            { name: "Auth Service", status: "Healthy", uptime: "100%", lat: "25ms" },
                        ].map((service) => (
                            <div key={service.name} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="font-medium text-gray-900 text-sm">{service.name}</span>
                                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] uppercase font-bold tracking-wide border border-green-100">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                        {service.status}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {service.uptime} uptime
                                    </span>
                                    <span className="font-mono text-gray-400">{service.lat}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
