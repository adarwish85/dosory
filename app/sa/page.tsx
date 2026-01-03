"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OverviewStats } from "@/lib/types/super-admin";
import { saFetch } from "@/lib/api/saFetch";
import { Building2, Users, FileText, DollarSign, Activity, ExternalLink, Settings, LayoutTemplate } from "lucide-react";
import Link from "next/link";

function StatCard({
    title,
    value,
    icon: Icon,
    loading,
}: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    loading?: boolean;
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {loading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{value}</div>}
            </CardContent>
        </Card>
    );
}

export default function SAOverviewPage() {
    const [stats, setStats] = useState<OverviewStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await saFetch<OverviewStats>("/api/sa/overview");
                setStats(data);
            } catch (e: unknown) {
                setError((e as Error).message);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const healthColor = {
        healthy: "bg-green-500",
        degraded: "bg-yellow-500",
        down: "bg-red-500",
    }[stats?.systemHealth || "healthy"];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Platform Overview</h1>
                <p className="text-muted-foreground">Monitor your SaaS platform health and metrics</p>
            </div>

            {/* Error State */}
            {error && (
                <Card className="border-red-500 bg-red-50 dark:bg-red-950">
                    <CardContent className="pt-6">
                        <p className="text-red-600">Error loading stats: {error}</p>
                    </CardContent>
                </Card>
            )}

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Tenants" value={stats?.totalTenants ?? 0} icon={Building2} loading={loading} />
                <StatCard title="Active Tenants" value={stats?.activeTenants ?? 0} icon={Building2} loading={loading} />
                <StatCard title="Total Users" value={stats?.totalUsers ?? 0} icon={Users} loading={loading} />
                <StatCard title="Website Pages" value={stats?.totalPages ?? 0} icon={FileText} loading={loading} />
            </div>

            {/* Secondary Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* MRR Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Monthly Recurring Revenue
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Skeleton className="h-10 w-32" />
                        ) : (
                            <div className="text-3xl font-bold text-green-600">
                                ${((stats?.mrr || 0) / 100).toLocaleString()}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* System Health Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">System Health</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center gap-3">
                        {loading ? (
                            <Skeleton className="h-10 w-24" />
                        ) : (
                            <>
                                <div className={`h-4 w-4 rounded-full ${healthColor}`} />
                                <span className="text-xl font-semibold capitalize">
                                    {stats?.systemHealth || "Unknown"}
                                </span>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Website Builder Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Website Builder</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-sm">Dosory Main Website</p>
                        <Link href="/sa/website-builder">
                            <Button size="sm">
                                <LayoutTemplate className="mr-2 h-4 w-4" />
                                Open Builder
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                    <Link href="/sa/tenants">
                        <Button variant="outline">
                            <Building2 className="mr-2 h-4 w-4" /> Manage Tenants
                        </Button>
                    </Link>
                    <Link href="/sa/users">
                        <Button variant="outline">
                            <Users className="mr-2 h-4 w-4" /> Manage Users
                        </Button>
                    </Link>
                    <Link href="/sa/billing-plans">
                        <Button variant="outline">
                            <DollarSign className="mr-2 h-4 w-4" /> Billing Plans
                        </Button>
                    </Link>
                    <Link href="/sa/modules">
                        <Button variant="outline">
                            <Settings className="mr-2 h-4 w-4" /> Modules
                        </Button>
                    </Link>
                    <Link href="/sa/security-audit">
                        <Button variant="outline">
                            <Activity className="mr-2 h-4 w-4" /> Audit Logs
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}
