"use client";

import { useTasks } from "@/lib/hooks/use-projects";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import Link from "next/link";
import { WidgetSkeleton } from "./WidgetSkeleton";
import { useTranslation } from "@/lib/i18n";
import type { WidgetSettings, DataDensity } from "@/lib/hooks/use-dashboard-layout";

interface TasksWidgetProps {
    settings: WidgetSettings;
    density: DataDensity;
}

export function TasksWidget({ settings, density }: TasksWidgetProps) {
    const { t } = useTranslation();
    const { tasks, loading, taskStats } = useTasks();
    const limit = settings.limit || 5;
    const today = startOfDay(new Date());

    // Get overdue and upcoming tasks
    const overdueTasks = tasks.filter((t) => {
        if (t.status === "done") return false;
        if (!t.dueDate) return false;
        try {
            const dueDate = t.dueDate.toDate();
            return isBefore(dueDate, today);
        } catch {
            return false;
        }
    });

    const upcomingTasks = tasks.filter((t) => t.status !== "done").slice(0, limit);

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "-";
        try {
            return format(timestamp.toDate(), "MMM d");
        } catch {
            return "-";
        }
    };

    const isOverdue = (timestamp: any) => {
        if (!timestamp) return false;
        try {
            return isBefore(timestamp.toDate(), today);
        } catch {
            return false;
        }
    };

    if (loading) {
        return <WidgetSkeleton variant="list" />;
    }

    return (
        <div className="h-full flex flex-col">
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{taskStats?.total || 0}</div>
                    <div className="text-xs text-gray-500">{t("dashboard.tasks.total")}</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{taskStats?.completed || 0}</div>
                    <div className="text-xs text-gray-500">{t("dashboard.tasks.done")}</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{overdueTasks.length}</div>
                    <div className="text-xs text-gray-500">{t("dashboard.tasks.overdue")}</div>
                </div>
            </div>

            {/* Task List */}
            <div className="flex-1 space-y-2 overflow-auto">
                {upcomingTasks.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">{t("dashboard.tasks.empty")}</div>
                ) : (
                    upcomingTasks.map((task) => (
                        <Link
                            key={task.id}
                            href={`/dashboard/tasks/${task.id}`}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 group"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                {task.status === "done" ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                ) : isOverdue(task.dueDate) ? (
                                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                                ) : (
                                    <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                                )}
                                <span className="text-sm truncate group-hover:text-blue-600">{task.name}</span>
                            </div>
                            <span
                                className={`text-xs shrink-0 ${isOverdue(task.dueDate) ? "text-red-500 font-medium" : "text-gray-400"}`}
                            >
                                {formatDate(task.dueDate)}
                            </span>
                        </Link>
                    ))
                )}
            </div>

            {/* View All Link */}
            <Link href="/dashboard/tasks" className="text-sm text-blue-600 hover:underline text-center mt-2 block">
                {t("dashboard.tasks.viewAll")}
            </Link>
        </div>
    );
}
