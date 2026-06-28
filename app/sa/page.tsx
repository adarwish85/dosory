"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OverviewStats } from "@/lib/types/super-admin";
import { saFetch } from "@/lib/api/saFetch";
import { Building2, Users, FileText, DollarSign, Activity, ExternalLink, Settings, LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

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
    const { t } = useTranslation();
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
                <h1 className="text-3xl font-bold tracking-tight">{t("sa.overview.title")}</h1>
                <p className="text-muted-foreground">{t("sa.overview.subtitle")}</p>
            </div>

            {/* Error State */}
            {error && (
                <Card className="border-red-500 bg-red-50 dark:bg-red-950">
                    <CardContent className="pt-6">
                        <p className="text-red-600">{t("sa.overview.errorLoadingStats", { error })}</p>
                    </CardContent>
                </Card>
            )}

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title={t("sa.overview.totalTenants")} value={stats?.totalTenants ?? 0} icon={Building2} loading={loading} />
                <StatCard title={t("sa.overview.activeTenants")} value={stats?.activeTenants ?? 0} icon={Building2} loading={loading} />
                <StatCard title={t("sa.overview.totalUsers")} value={stats?.totalUsers ?? 0} icon={Users} loading={loading} />
                <StatCard title={t("sa.overview.websitePages")} value={stats?.totalPages ?? 0} icon={FileText} loading={loading} />
            </div>

            {/* Secondary Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* MRR Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t("sa.overview.mrr")}
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
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t("sa.overview.systemHealth")}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center gap-3">
                        {loading ? (
                            <Skeleton className="h-10 w-24" />
                        ) : (
                            <>
                                <div className={`h-4 w-4 rounded-full ${healthColor}`} />
                                <span className="text-xl font-semibold capitalize">
                                    {stats?.systemHealth || t("sa.overview.unknown")}
                                </span>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Website Builder Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t("sa.overview.websiteBuilder")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-sm">{t("sa.overview.mainWebsite")}</p>
                        <Link href="/sa/website-builder">
                            <Button size="sm">
                                <LayoutTemplate className="mr-2 h-4 w-4" />
                                {t("sa.overview.openBuilder")}
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>{t("sa.overview.quickActions")}</CardTitle>
                    <CardDescription>{t("sa.overview.quickActionsDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                    <Link href="/sa/tenants">
                        <Button variant="outline">
                            <Building2 className="mr-2 h-4 w-4" /> {t("sa.overview.manageTenants")}
                        </Button>
                    </Link>
                    <Link href="/sa/users">
                        <Button variant="outline">
                            <Users className="mr-2 h-4 w-4" /> {t("sa.overview.manageUsers")}
                        </Button>
                    </Link>
                    <Link href="/sa/billing-plans">
                        <Button variant="outline">
                            <DollarSign className="mr-2 h-4 w-4" /> {t("sa.overview.billingPlans")}
                        </Button>
                    </Link>
                    <Link href="/sa/modules">
                        <Button variant="outline">
                            <Settings className="mr-2 h-4 w-4" /> {t("sa.overview.modules")}
                        </Button>
                    </Link>
                    <Link href="/sa/security-audit">
                        <Button variant="outline">
                            <Activity className="mr-2 h-4 w-4" /> {t("sa.overview.auditLogs")}
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}
