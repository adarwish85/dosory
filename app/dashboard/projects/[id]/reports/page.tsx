"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useTasks, useProject } from "@/lib/hooks/use-projects";
import { useMilestones } from "@/lib/hooks/use-project-data";
import { useAssignableStaff } from "@/lib/hooks/use-staff";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    BarChart3,
    Download,
    CheckCircle2,
    Clock,
    AlertCircle,
    Users,
    Target,
    TrendingUp,
    Calendar,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import type { Task, TaskStatus } from "@/lib/types";
import { useTranslation } from "@/lib/i18n";

// Status colors
const STATUS_COLORS: Record<TaskStatus, string> = {
    to_do: "bg-gray-100 text-gray-700",
    in_progress: "bg-blue-100 text-blue-700",
    blocked: "bg-red-100 text-red-700",
    done: "bg-green-100 text-green-700",
};

export default function ProjectReportsPage() {
    const { t } = useTranslation();
    const params = useParams();
    const projectId = params.id as string;
    const { tasks, loading: tasksLoading } = useTasks({ projectId });
    const { milestones, loading: milestonesLoading } = useMilestones(projectId);
    const { project, loading: projectLoading } = useProject(projectId);
    const { staff } = useAssignableStaff();

    const loading = tasksLoading || milestonesLoading || projectLoading;

    // Calculate stats
    const stats = useMemo(() => {
        const now = new Date();
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((t) => t.status === "done").length;
        const overdueTasks = tasks.filter((t) => t.dueDate && t.dueDate.toDate() < now && t.status !== "done");
        const blockedTasks = tasks.filter((t) => t.status === "blocked");
        const inProgressTasks = tasks.filter((t) => t.status === "in_progress");

        // Tasks by status
        const byStatus = {
            pending: tasks.filter((t) => t.status === "to_do").length,
            in_progress: inProgressTasks.length,
            blocked: blockedTasks.length,
            done: completedTasks,
        };

        // Tasks by assignee
        const byAssignee: Record<string, { total: number; completed: number; name: string }> = {};
        tasks.forEach((task) => {
            task.assignees.forEach((assigneeId) => {
                if (!byAssignee[assigneeId]) {
                    const staffMember = staff.find((s) => s.id === assigneeId);
                    byAssignee[assigneeId] = {
                        total: 0,
                        completed: 0,
                        name: staffMember?.firstName ? `${staffMember.firstName} ${staffMember.lastName}` : assigneeId,
                    };
                }
                byAssignee[assigneeId].total++;
                if (task.status === "done") {
                    byAssignee[assigneeId].completed++;
                }
            });
        });

        // Milestone progress
        const milestoneProgress = milestones.map((m) => {
            const milestoneTasks = tasks.filter((t) => t.milestoneId === m.id);
            const completed = milestoneTasks.filter((t) => t.status === "done").length;
            return {
                id: m.id,
                name: m.name,
                total: milestoneTasks.length,
                completed,
                percentage: milestoneTasks.length > 0 ? Math.round((completed / milestoneTasks.length) * 100) : 0,
                dueDate: m.dueDate.toDate(),
                isOverdue: m.status !== "complete" && m.dueDate.toDate() < now,
            };
        });

        return {
            totalTasks,
            completedTasks,
            completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            overdueTasks,
            blockedTasks,
            byStatus,
            byAssignee,
            milestoneProgress,
            estimatedHours: tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0),
            actualHours: tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0),
        };
    }, [tasks, milestones, staff]);

    // Export to CSV
    const exportToCSV = (type: "tasks" | "overdue" | "workload") => {
        let csvContent = "";
        let filename = "";

        if (type === "tasks") {
            csvContent = "Task Name,Status,Priority,Assignees,Due Date,Estimated Hours,Actual Hours\n";
            tasks.forEach((task) => {
                const row = [
                    `"${task.name.replace(/"/g, '""')}"`,
                    task.status,
                    task.priority,
                    task.assignees.join("; "),
                    task.dueDate ? format(task.dueDate.toDate(), "yyyy-MM-dd") : "",
                    task.estimatedHours || "",
                    task.actualHours || "",
                ].join(",");
                csvContent += row + "\n";
            });
            filename = `${project?.name || "project"}_tasks_${format(new Date(), "yyyy-MM-dd")}.csv`;
        } else if (type === "overdue") {
            csvContent = "Task Name,Due Date,Days Overdue,Assignees,Priority\n";
            stats.overdueTasks.forEach((task) => {
                const daysOverdue = differenceInDays(new Date(), task.dueDate!.toDate());
                const row = [
                    `"${task.name.replace(/"/g, '""')}"`,
                    format(task.dueDate!.toDate(), "yyyy-MM-dd"),
                    daysOverdue,
                    task.assignees.join("; "),
                    task.priority,
                ].join(",");
                csvContent += row + "\n";
            });
            filename = `${project?.name || "project"}_overdue_${format(new Date(), "yyyy-MM-dd")}.csv`;
        } else if (type === "workload") {
            csvContent = "Team Member,Total Tasks,Completed,Completion Rate\n";
            Object.values(stats.byAssignee).forEach((data) => {
                const row = [
                    `"${data.name}"`,
                    data.total,
                    data.completed,
                    `${Math.round((data.completed / data.total) * 100)}%`,
                ].join(",");
                csvContent += row + "\n";
            });
            filename = `${project?.name || "project"}_workload_${format(new Date(), "yyyy-MM-dd")}.csv`;
        }

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        toast.success(t("projects.reports.exportedToast", { filename }));
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-32" />
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-24" />
                    ))}
                </div>
                <Skeleton className="h-64" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">{t("projects.reports.title")}</h2>
                    <p className="text-muted-foreground">
                        {t("projects.reports.subtitle", { name: project?.name ?? "" })}
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Target className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.completionRate}%</p>
                                <p className="text-sm text-muted-foreground">{t("projects.reports.completed")}</p>
                            </div>
                        </div>
                        <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${stats.completionRate}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {stats.completedTasks}/{stats.totalTasks}
                                </p>
                                <p className="text-sm text-muted-foreground">{t("projects.reports.tasksDone")}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <AlertCircle className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.overdueTasks.length}</p>
                                <p className="text-sm text-muted-foreground">{t("projects.reports.overdue")}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Clock className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {stats.actualHours}/{stats.estimatedHours}h
                                </p>
                                <p className="text-sm text-muted-foreground">{t("projects.reports.hoursTracked")}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Reports */}
            <Tabs defaultValue="status">
                <TabsList>
                    <TabsTrigger value="status">{t("projects.reports.tabByStatus")}</TabsTrigger>
                    <TabsTrigger value="milestones">{t("projects.reports.tabMilestones")}</TabsTrigger>
                    <TabsTrigger value="overdue">{t("projects.reports.overdue")}</TabsTrigger>
                    <TabsTrigger value="workload">{t("projects.reports.tabWorkload")}</TabsTrigger>
                </TabsList>

                <TabsContent value="status" className="mt-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>{t("projects.reports.tasksByStatusTitle")}</CardTitle>
                                <CardDescription>{t("projects.reports.tasksByStatusDesc")}</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => exportToCSV("tasks")}>
                                <Download className="h-4 w-4 mr-2" />
                                {t("projects.reports.exportCsv")}
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {Object.entries(stats.byStatus).map(([status, count]) => (
                                    <div key={status} className="flex items-center gap-4">
                                        <Badge className={STATUS_COLORS[status as TaskStatus]}>
                                            {t(`projects.reports.taskStatus.${status}`)}
                                        </Badge>
                                        <div className="flex-1">
                                            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${status === "done" ? "bg-green-500" : status === "blocked" ? "bg-red-500" : "bg-blue-500"}`}
                                                    style={{
                                                        width: `${stats.totalTasks > 0 ? (count / stats.totalTasks) * 100 : 0}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <span className="font-medium w-12 text-right">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="milestones" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("projects.reports.milestoneProgressTitle")}</CardTitle>
                            <CardDescription>{t("projects.reports.milestoneProgressDesc")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("projects.reports.milestone")}</TableHead>
                                        <TableHead>{t("projects.reports.dueDate")}</TableHead>
                                        <TableHead>{t("projects.reports.tasks")}</TableHead>
                                        <TableHead>{t("projects.reports.progress")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stats.milestoneProgress.map((m) => (
                                        <TableRow key={m.id}>
                                            <TableCell className="font-medium">
                                                {m.name}
                                                {m.isOverdue && (
                                                    <Badge variant="destructive" className="ml-2 text-xs">
                                                        {t("projects.reports.overdue")}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>{format(m.dueDate, "MMM d, yyyy")}</TableCell>
                                            <TableCell>
                                                {m.completed}/{m.total}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[100px]">
                                                        <div
                                                            className="h-full bg-green-500 rounded-full"
                                                            style={{ width: `${m.percentage}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm">{m.percentage}%</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {stats.milestoneProgress.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                                {t("projects.reports.noMilestones")}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="overdue" className="mt-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>{t("projects.reports.overdueTasksTitle")}</CardTitle>
                                <CardDescription>{t("projects.reports.overdueTasksDesc")}</CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => exportToCSV("overdue")}
                                disabled={stats.overdueTasks.length === 0}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                {t("projects.reports.exportCsv")}
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("projects.reports.task")}</TableHead>
                                        <TableHead>{t("projects.reports.dueDate")}</TableHead>
                                        <TableHead>{t("projects.reports.daysOverdue")}</TableHead>
                                        <TableHead>{t("projects.reports.priority")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stats.overdueTasks.map((task) => (
                                        <TableRow key={task.id}>
                                            <TableCell className="font-medium">{task.name}</TableCell>
                                            <TableCell>{format(task.dueDate!.toDate(), "MMM d, yyyy")}</TableCell>
                                            <TableCell className="text-red-600">
                                                {t("projects.reports.daysCount", {
                                                    count: differenceInDays(new Date(), task.dueDate!.toDate()),
                                                })}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={task.priority === "urgent" ? "destructive" : "secondary"}
                                                >
                                                    {t(`projects.reports.taskPriority.${task.priority}`)}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {stats.overdueTasks.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                                {t("projects.reports.noOverdue")}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="workload" className="mt-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>{t("projects.reports.tabWorkload")}</CardTitle>
                                <CardDescription>{t("projects.reports.workloadDesc")}</CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => exportToCSV("workload")}
                                disabled={Object.keys(stats.byAssignee).length === 0}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                {t("projects.reports.exportCsv")}
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("projects.reports.teamMember")}</TableHead>
                                        <TableHead>{t("projects.reports.totalTasks")}</TableHead>
                                        <TableHead>{t("projects.reports.completed")}</TableHead>
                                        <TableHead>{t("projects.reports.completionRate")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(stats.byAssignee)
                                        .sort((a, b) => b[1].total - a[1].total)
                                        .map(([id, data]) => (
                                            <TableRow key={id}>
                                                <TableCell className="font-medium">{data.name}</TableCell>
                                                <TableCell>{data.total}</TableCell>
                                                <TableCell>{data.completed}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[100px]">
                                                            <div
                                                                className="h-full bg-green-500 rounded-full"
                                                                style={{
                                                                    width: `${Math.round((data.completed / data.total) * 100)}%`,
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-sm">
                                                            {Math.round((data.completed / data.total) * 100)}%
                                                        </span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    {Object.keys(stats.byAssignee).length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                                {t("projects.reports.noTasksAssigned")}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
