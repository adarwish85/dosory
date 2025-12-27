"use client";

import { useAdminStats } from "@/lib/hooks/use-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Building2, Users, CreditCard, DollarSign,
    MoreHorizontal, ArrowUp, ArrowDown, Activity,
    CheckCircle2, AlertTriangle, Clock, ExternalLink
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
    const { stats, loading } = useAdminStats();

    // Mock data for UI development - replace with real stats where available
    const cards = [
        {
            title: "Total Tenants",
            value: stats.totalTenants.toLocaleString(),
            change: "+12%",
            trend: "up",
            icon: Building2,
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
        },
        {
            title: "Active Trials",
            value: stats.trialTenants.toString(),
            change: "+5%",
            trend: "up",
            icon: Clock,
            iconBg: "bg-orange-50",
            iconColor: "text-orange-600",
        },
        {
            title: "MRR",
            value: `$${stats.monthlyRevenue.toLocaleString()}`,
            change: "+3.2%",
            trend: "up",
            icon: DollarSign,
            iconBg: "bg-green-50",
            iconColor: "text-green-600",
        },
        {
            title: "Enterprise Conversions",
            value: "12",
            subtext: "Last 30d",
            icon: CheckCircle2,
            iconBg: "bg-purple-50",
            iconColor: "text-purple-600",
        },
    ];

    const recentTenants = [
        { name: "Acme Corp", plan: "Enterprise", revenue: "$24,000/yr", status: "Active", joined: "Oct 24, 2023", logo: "A", color: "bg-blue-100 text-blue-700" },
        { name: "Globex Inc", plan: "Trial", revenue: "-", status: "Trial", joined: "Oct 22, 2023", logo: "G", color: "bg-orange-100 text-orange-700" },
        { name: "Stark Ind", plan: "Pro Plan", revenue: "$4,800/yr", status: "Active", joined: "Oct 20, 2023", logo: "S", color: "bg-purple-100 text-purple-700" },
        { name: "Oscorp", plan: "Expired", revenue: "$0", status: "Churned", joined: "Sep 15, 2023", logo: "O", color: "bg-red-100 text-red-700" },
    ];

    return (
        <div className="space-y-6">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Admin Overview</h2>
                    <p className="text-gray-500">Track growth metrics and manage tenant subscriptions.</p>
                </div>
                <div className="flex items-center bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                    <button className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">Last 7 Days</button>
                    <button className="px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-900 rounded-md shadow-sm">Last 30 Days</button>
                    <button className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">Custom</button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card, i) => {
                    const Icon = card.icon;
                    return (
                        <Card key={i} className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <div className={cn("p-2 rounded-lg", card.iconBg)}>
                                        <Icon className={cn("h-5 w-5", card.iconColor)} />
                                    </div>
                                    {card.change && (
                                        <div className={cn(
                                            "flex items-center text-xs font-medium px-2 py-1 rounded-full",
                                            card.trend === "up" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                                        )}>
                                            {card.trend === "up" ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                                            {card.change}
                                        </div>
                                    )}
                                    {card.subtext && (
                                        <span className="text-xs text-gray-400 font-medium">{card.subtext}</span>
                                    )}
                                </div>
                                <div className="mt-4">
                                    <p className="text-sm font-medium text-gray-500">{card.title}</p>
                                    <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                        {loading ? "..." : card.value}
                                    </h3>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart Column (2/3 width) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Subscription Growth Chart */}
                    <Card className="border border-gray-100 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="text-base font-bold text-gray-900">Subscription Growth</CardTitle>
                                <p className="text-sm text-gray-500">Revenue trend over the last 6 months</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4 text-gray-400" />
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[250px] w-full flex items-end justify-between px-4 pt-10 pb-2 gap-4">
                                {/* CSS-only Bar Chart */}
                                {["MAY", "JUN", "JUL", "AUG", "SEP", "OCT"].map((month, i) => {
                                    const heights = ["40%", "55%", "45%", "65%", "80%", "95%"];
                                    return (
                                        <div key={month} className="flex flex-col items-center gap-2 flex-1 group cursor-pointer">
                                            <div
                                                className="w-full max-w-[40px] bg-blue-100 hover:bg-blue-600 rounded-t-sm transition-all relative group-hover:shadow-lg"
                                                style={{ height: heights[i] }}
                                            >
                                                {/* Tooltip on hover */}
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                    ${(parseInt(heights[i]) * 1000).toLocaleString()}
                                                </div>
                                            </div>
                                            <span className="text-xs font-medium text-gray-400">{month}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Tenant Activity */}
                    <Card className="border border-gray-100 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base font-bold text-gray-900">Recent Tenant Activity</CardTitle>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="h-8 text-xs">Filter</Button>
                                <Button variant="outline" size="sm" className="h-8 text-xs">Export</Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-6">Company</th>
                                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-6">Plan Status</th>
                                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-6">Revenue</th>
                                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-6">Joined</th>
                                            <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 px-6">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {recentTenants.map((tenant, i) => (
                                            <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg", tenant.color)}>
                                                            {tenant.logo}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900 text-sm">{tenant.name}</p>
                                                            <p className="text-xs text-gray-500">tech.com</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className={cn(
                                                        "px-2.5 py-1 rounded-full text-xs font-medium border",
                                                        tenant.status === "Active" ? "bg-green-50 text-green-700 border-green-100" :
                                                            tenant.status === "Trial" ? "bg-orange-50 text-orange-700 border-orange-100" :
                                                                "bg-gray-100 text-gray-700 border-gray-200"
                                                    )}>
                                                        {tenant.plan}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-sm text-gray-600 font-medium">
                                                    {tenant.revenue}
                                                </td>
                                                <td className="py-4 px-6 text-sm text-gray-500">
                                                    {tenant.joined}
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600">
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 border-t border-gray-100 text-center">
                                <Link href="/bunny/tenants" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1">
                                    View all tenants <ExternalLink className="h-3 w-3" />
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column (1/3 width) */}
                <div className="space-y-6">
                    {/* Plan Distribution */}
                    <Card className="border border-gray-100 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base font-bold text-gray-900">Plan Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-center py-4 relative">
                                {/* Donut Chart Simulation with CSS Conic Gradient */}
                                <div
                                    className="w-48 h-48 rounded-full"
                                    style={{
                                        background: `conic-gradient(
                                            #0ea5e9 0% 55%, 
                                            #eab308 55% 75%, 
                                            #e5e7eb 75% 100%
                                        )`
                                    }}
                                >
                                    <div className="w-32 h-32 bg-white rounded-full absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center justify-center shadow-inner">
                                        <span className="text-3xl font-bold text-gray-900">1.2k</span>
                                        <span className="text-xs text-gray-500 uppercase tracking-wide">Tenants</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3 mt-4">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                        <span className="text-gray-600">Enterprise</span>
                                    </div>
                                    <span className="font-bold text-gray-900">55%</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                        <span className="text-gray-600">Pro Plan</span>
                                    </div>
                                    <span className="font-bold text-gray-900">20%</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                                        <span className="text-gray-600">Starter</span>
                                    </div>
                                    <span className="font-bold text-gray-900">25%</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Center */}
                    <Card className="border border-gray-100 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base font-bold text-gray-900">Action Center</CardTitle>
                            <div className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">3</div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                                <div className="flex gap-3">
                                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-red-900">License Expiry Risk</p>
                                        <p className="text-xs text-red-700 mt-1">3 Enterprise licenses expiring in &lt; 48 hours.</p>
                                        <button className="text-xs font-medium text-red-800 hover:underline mt-2">View details</button>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                                <div className="flex gap-3">
                                    <Users className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-blue-900">New Support Tickets</p>
                                        <p className="text-xs text-blue-700 mt-1">5 high-priority tickets from Enterprise clients.</p>
                                        <button className="text-xs font-medium text-blue-800 hover:underline mt-2">Open Helpdesk</button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* System Health */}
                    <Card className="border border-gray-100 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-bold text-gray-900">System Health</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">API Usage</span>
                                    <span className="font-bold text-gray-900">84%</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-500 w-[84%] rounded-full"></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">Database Load</span>
                                    <span className="font-bold text-gray-900">42%</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 w-[42%] rounded-full"></div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
