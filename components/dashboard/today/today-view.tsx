"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { todayService } from "@/lib/services/today-service";
import { TodayDashboardData } from "@/lib/types/today";
import { FocusSection } from "./focus-section";
import { ActionsList } from "./actions-list";
import { MetricsGrid } from "./metrics-grid";
import { AlertsSection } from "./alerts-section";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function TodayView() {
    const { t } = useTranslation();
    const { profile, loading: profileLoading } = useUserProfile();
    const [data, setData] = useState<TodayDashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (profile && profile.uid && profile.orgId) {
                // Determine simplistic role for now, in real app use robust permissions
                const role = profile.role === "admin" || profile.role === "superadmin" ? "admin" : "staff";
                // profile.email is passed so the service can match assignee fields that hold
                // the email-keyed staff doc id as well as the auth uid — see
                // TodayService.assigneeIdsFor.
                const result = await todayService.getDashboardData(profile.uid, role, profile.orgId, profile.email);
                setData(result);
                setLoading(false);
            }
        };

        if (!profileLoading) {
            fetchData();
        }
    }, [profile, profileLoading]);

    if (profileLoading || loading || !data) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                        {data.greeting}, {profile?.firstName}
                    </h1>
                    <p className="text-gray-500 mt-1 flex items-center gap-2">
                        {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                    </p>
                </div>
                <div className="flex gap-2">
                    {/* BUG1 (2026-07-28): this button had no onClick/Link in any locale — pure
                        decoration. Routes to the same create-task flow as the Tasks page and
                        the RightSidebar quick action. asChild renders a real <a>, so it works
                        identically in EN/AR (RTL flips mr-2 via the app's rtl handling). */}
                    <Button asChild className="shadow-lg hover:shadow-xl transition-all bg-blue-600 hover:bg-blue-700">
                        <Link href="/dashboard/tasks/new">
                            <Plus className="h-4 w-4 mr-2" /> {t("dashboard.today.addTask")}
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Column (Left - 2/3) */}
                <div className="lg:col-span-2 space-y-8">
                    <FocusSection items={data.focusItems} />
                    <ActionsList items={data.actionItems} />
                </div>

                {/* Side Column (Right - 1/3) */}
                <div className="space-y-8">
                    <MetricsGrid metrics={data.metrics} />
                    <AlertsSection alerts={data.alerts} />

                    {/* Activity Feed Placeholder */}
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4 tracking-wider">
                            {t("dashboard.today.recentActivity")}
                        </h3>
                        <div className="space-y-4">
                            {data.feed.map((item) => (
                                <div key={item.id} className="flex gap-3 text-sm">
                                    <div className="h-8 w-8 rounded-full bg-gray-200 shrink-0 flex items-center justify-center font-bold text-xs">
                                        {item.actorName.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-gray-900">
                                            <span className="font-semibold">{item.actorName}</span> {item.action}
                                            {/* `target` is empty when `action` is already a complete
                                                phrase naming the entity — rendering it unconditionally
                                                appended a stray noun ("…created project Acme site project"). */}
                                            {item.target && (
                                                <span className="font-medium text-blue-600"> {item.target}</span>
                                            )}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {item.timestamp
                                                .toDate()
                                                .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {data.feed.length === 0 && (
                                <p className="text-gray-400 italic">{t("dashboard.today.noRecentActivity")}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-5 w-48" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-40" />
                        <div className="grid grid-cols-3 gap-4">
                            <Skeleton className="h-40 rounded-xl" />
                            <Skeleton className="h-40 rounded-xl" />
                            <Skeleton className="h-40 rounded-xl" />
                        </div>
                    </div>
                    <Skeleton className="h-96 rounded-xl" />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-32 rounded-xl" />
                    <Skeleton className="h-32 rounded-xl" />
                    <Skeleton className="h-64 rounded-xl" />
                </div>
            </div>
        </div>
    );
}
