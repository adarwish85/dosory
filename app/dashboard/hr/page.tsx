"use client";

import { useEmployees } from "@/lib/hooks/use-employees";
import { useDepartments } from "@/lib/hooks/use-hr-settings";
import { useLeaveRequests } from "@/lib/hooks/use-leaves";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserCheck, Clock, CalendarDays } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

export default function HRDashboardPage() {
    const { t } = useTranslation();
    const { employees, employeeStats, loading: employeesLoading } = useEmployees();
    const { departments, loading: departmentsLoading } = useDepartments();
    const { pendingCount, loading: leavesLoading } = useLeaveRequests({ status: "pending" });

    const loading = employeesLoading || departmentsLoading || leavesLoading;

    if (loading) {
        return (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardContent className="p-6">
                            <Skeleton className="h-24" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    const stats = [
        {
            name: t("hr.stats.totalEmployees"),
            value: employeeStats.total,
            icon: Users,
            href: "/dashboard/hr/employees",
            color: "bg-blue-500",
            description: t("hr.stats.activeOnLeave", { active: employeeStats.active, onLeave: employeeStats.onLeave }),
        },
        {
            name: t("hr.stats.departments"),
            value: departments.length,
            icon: UserCheck,
            href: "/dashboard/hr/settings/departments",
            color: "bg-green-500",
            description: t("hr.stats.organizationStructure"),
        },
        {
            name: t("hr.stats.pendingLeaves"),
            value: pendingCount,
            icon: CalendarDays,
            href: "/dashboard/hr/leaves",
            color: "bg-amber-500",
            description: t("hr.stats.awaitingApproval"),
        },
        {
            name: t("hr.stats.todaysAttendance"),
            value: "-",
            icon: Clock,
            href: "/dashboard/hr/attendance",
            color: "bg-purple-500",
            description: t("hr.stats.checkDailyLogs"),
        },
    ];

    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Link key={stat.name} href={stat.href}>
                            <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-500">{stat.name}</p>
                                            <p className="text-3xl font-bold">{stat.value}</p>
                                            <p className="text-xs text-gray-400 mt-1">{stat.description}</p>
                                        </div>
                                        <div className={`${stat.color} rounded-full p-3`}>
                                            <Icon className="h-6 w-6 text-white" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardContent className="p-6">
                        <h3 className="font-semibold mb-4">{t("hr.byType.title")}</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">{t("hr.employmentType.fullTime")}</span>
                                <span className="font-medium">{employeeStats.fullTime}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">{t("hr.employmentType.partTime")}</span>
                                <span className="font-medium">{employeeStats.partTime}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">{t("hr.employmentType.contractor")}</span>
                                <span className="font-medium">{employeeStats.contractor}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <h3 className="font-semibold mb-4">{t("hr.status.title")}</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    <span className="text-sm text-gray-600">{t("hr.status.active")}</span>
                                </span>
                                <span className="font-medium">{employeeStats.active}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                    <span className="text-sm text-gray-600">{t("hr.status.onLeave")}</span>
                                </span>
                                <span className="font-medium">{employeeStats.onLeave}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    <span className="text-sm text-gray-600">{t("hr.status.terminated")}</span>
                                </span>
                                <span className="font-medium">{employeeStats.terminated}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <h3 className="font-semibold mb-4">{t("hr.departments.title")}</h3>
                        <div className="space-y-2">
                            {departments.slice(0, 5).map((dept) => (
                                <div key={dept.id} className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">{dept.name}</span>
                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                        {t("hr.departments.employeeCount", { count: dept.employeeCount || 0 })}
                                    </span>
                                </div>
                            ))}
                            {departments.length === 0 && (
                                <p className="text-sm text-gray-400">{t("hr.departments.empty")}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
