"use client";

import { useAdminStats } from "@/lib/hooks/use-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, CreditCard, DollarSign, TrendingUp, Activity, MoreHorizontal } from "lucide-react";

// Design system colors
const colors = {
    dark: "#352b38",
    gray: "#7e808c",
    purple: "#dad8f9",
    light: "#f4f3f8",
    accent: "#9b8cff",
};

export default function AdminDashboard() {
    const { stats, loading } = useAdminStats();

    const statCards = [
        {
            title: "Total applicants",
            value: `+${stats.totalTenants}`,
            icon: Building2,
            color: "#d4c3e8",
            iconColor: colors.dark,
            change: "+24%",
        },
        {
            title: "Interviewed",
            value: `+${stats.activeSubscriptions}`,
            icon: CreditCard,
            color: "#c8e6d4",
            iconColor: "#2d5a3d",
            change: "+14%",
        },
        {
            title: "Job offers",
            value: `+${stats.totalUsers}`,
            icon: Users,
            color: colors.purple,
            iconColor: colors.dark,
            change: "+30%",
        },
    ];

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {statCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Card key={card.title} className="border-0 shadow-sm rounded-2xl" style={{ backgroundColor: card.color }}>
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium" style={{ color: card.iconColor }}>{card.title}</p>
                                        <p className="text-4xl font-bold mt-2" style={{ color: card.iconColor }}>
                                            {loading ? "..." : card.value}
                                        </p>
                                        <p className="text-xs mt-2 flex items-center gap-1" style={{ color: card.iconColor }}>
                                            <TrendingUp className="h-3 w-3" />
                                            {card.change} vs last week
                                        </p>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.5)" }}>
                                        <Icon className="h-5 w-5" style={{ color: card.iconColor }} />
                                    </div>
                                </div>
                                {/* Mini bar chart placeholder */}
                                <div className="flex items-end gap-1 mt-4 h-12">
                                    {[40, 65, 45, 70, 55, 80, 60, 75].map((h, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 rounded-t-sm opacity-60"
                                            style={{
                                                height: `${h}%`,
                                                backgroundColor: card.iconColor,
                                            }}
                                        />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                {/* Platform Insight Card */}
                <Card className="row-span-2 border-0 shadow-sm rounded-2xl" style={{ backgroundColor: "white" }}>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium" style={{ color: colors.dark }}>Platform Insight</CardTitle>
                            <MoreHorizontal className="h-4 w-4" style={{ color: colors.gray }} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[
                                { name: "Active Tenants", value: stats.activeTenants, percent: 60, color: "#352b38" },
                                { name: "Trial Users", value: stats.trialTenants, percent: 25, color: colors.purple },
                                { name: "Enterprise", value: 0, percent: 10, color: "#7e808c" },
                                { name: "Starter", value: 0, percent: 5, color: "#d4c3e8" },
                            ].map((item) => (
                                <div key={item.name} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: item.color + "20" }}>
                                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-sm" style={{ color: colors.dark }}>{item.name}</span>
                                    </div>
                                    <div className="w-24 h-2 rounded-full" style={{ backgroundColor: colors.light }}>
                                        <div
                                            className="h-full rounded-full"
                                            style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                                        />
                                    </div>
                                    <span className="text-sm font-medium w-12 text-right" style={{ color: colors.dark }}>
                                        {loading ? "..." : item.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-0 shadow-sm rounded-2xl" style={{ backgroundColor: "white" }}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium" style={{ color: colors.dark }}>Tenant Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span style={{ color: colors.gray }}>Active</span>
                                <span className="font-medium" style={{ color: "#22c55e" }}>{loading ? "..." : stats.activeTenants}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span style={{ color: colors.gray }}>Trial</span>
                                <span className="font-medium" style={{ color: "#eab308" }}>{loading ? "..." : stats.trialTenants}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span style={{ color: colors.gray }}>Total</span>
                                <span className="font-medium" style={{ color: colors.dark }}>{loading ? "..." : stats.totalTenants}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm rounded-2xl" style={{ backgroundColor: "white" }}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium" style={{ color: colors.dark }}>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-4">
                            <Activity className="h-8 w-8 mx-auto mb-2" style={{ color: colors.gray }} />
                            <p className="text-sm" style={{ color: colors.gray }}>Activity will appear here</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm rounded-2xl" style={{ backgroundColor: "white" }}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium" style={{ color: colors.dark }}>System Health</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span style={{ color: colors.gray }}>API</span>
                                <span className="text-sm flex items-center gap-1" style={{ color: "#22c55e" }}>
                                    <Activity className="h-3 w-3" /> Healthy
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span style={{ color: colors.gray }}>Database</span>
                                <span className="text-sm flex items-center gap-1" style={{ color: "#22c55e" }}>
                                    <Activity className="h-3 w-3" /> Healthy
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span style={{ color: colors.gray }}>Storage</span>
                                <span className="text-sm flex items-center gap-1" style={{ color: "#22c55e" }}>
                                    <Activity className="h-3 w-3" /> Healthy
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
