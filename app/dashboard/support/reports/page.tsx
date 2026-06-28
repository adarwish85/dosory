"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { TicketStatsService, TicketStats } from "@/lib/services/ticket-stats-service";
import { useTranslation } from "@/lib/i18n";

export default function SupportReportsPage() {
    const { t } = useTranslation();
    const { profile } = useUserProfile();
    const [stats, setStats] = useState<TicketStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.orgId) return;

        const fetchStats = async () => {
            try {
                const data = await TicketStatsService.getStats(profile.orgId);
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [profile?.orgId]);

    if (loading) return <div className="p-8 text-center">{t("support.reports.loading")}</div>;
    if (!stats) return <div className="p-8 text-center">{t("support.reports.loadFailed")}</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/support">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold tracking-tight">{t("support.reports.title")}</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{t("support.reports.ticketStatus")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {Object.entries(stats.byStatus).map(([status, count]) => (
                                <div key={status} className="flex justify-between items-center">
                                    <span className="capitalize text-gray-600">{status.replace(/_/g, " ")}</span>
                                    <span className="font-bold">{count}</span>
                                </div>
                            ))}
                            {Object.keys(stats.byStatus).length === 0 && <div className="text-gray-500">{t("support.reports.noData")}</div>}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t("support.reports.ticketPriority")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {Object.entries(stats.byPriority).map(([priority, count]) => (
                                <div key={priority} className="flex justify-between items-center">
                                    <span className="capitalize text-gray-600">{priority}</span>
                                    <span className="font-bold">{count}</span>
                                </div>
                            ))}
                            {Object.keys(stats.byPriority).length === 0 && <div className="text-gray-500">{t("support.reports.noData")}</div>}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t("support.reports.slaCompliance")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-green-600">{t("support.reports.onTrack")}</span>
                                <span className="font-bold">{stats.slaCompliance.onTrack}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-yellow-600">{t("support.reports.atRisk")}</span>
                                <span className="font-bold">{stats.slaCompliance.atRisk}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-red-600">{t("support.reports.breached")}</span>
                                <span className="font-bold">{stats.slaCompliance.breached}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("support.reports.overview")}</CardTitle>
                    <CardDescription>{t("support.reports.totalManaged")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold">{stats.total}</div>
                </CardContent>
            </Card>
        </div>
    );
}
