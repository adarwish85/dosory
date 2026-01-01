"use client";

import { useMemo } from "react";
import { useProject, useTasks } from "@/lib/hooks/use-projects";
import { useExpenses } from "@/lib/hooks/use-expenses";
import { useMilestones, useTimesheets } from "@/lib/hooks/use-project-data";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
    FileText,
    CheckCircle2,
    Clock,
    Calendar,
    Target,
    TrendingUp,
    Users,
    DollarSign,
    AlertCircle,
} from "lucide-react";
import Link from "next/link";

export default function ProjectOverviewPage() {
    const params = useParams();
    const projectId = params.id as string;
    const { project, loading: projectLoading } = useProject(projectId);
    const { taskStats, tasks } = useTasks({ projectId });
    const { expenses } = useExpenses({ projectId });
    const { milestones } = useMilestones(projectId);
    const { logs: timesheets } = useTimesheets(projectId);

    // Calculate expense stats
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const billableExpenses = expenses.filter(e => e.billable).reduce((sum, exp) => sum + exp.amount, 0);
    const billedExpenses = expenses.filter(e => e.invoiceId).reduce((sum, exp) => sum + exp.amount, 0);
    const unbilledExpenses = billableExpenses - billedExpenses;

    // Calculate timesheet stats
    const timesheetStats = useMemo(() => {
        const totalSeconds = timesheets.reduce((sum, ts) => sum + (ts.duration || 0), 0);
        const billableSeconds = timesheets.filter(ts => ts.billable !== false).reduce((sum, ts) => sum + (ts.duration || 0), 0);
        const totalHours = totalSeconds / 3600;
        const billableHours = billableSeconds / 3600;
        const nonBillableHours = totalHours - billableHours;
        return { totalHours, billableHours, nonBillableHours };
    }, [timesheets]);

    // Calculate milestone stats
    const milestoneStats = useMemo(() => {
        const total = milestones.length;
        const completed = milestones.filter(m => m.status === "complete").length;
        const overdue = milestones.filter(m =>
            m.status !== "complete" &&
            m.dueDate &&
            new Date() > m.dueDate.toDate()
        ).length;
        const upcoming = milestones
            .filter(m => m.status !== "complete")
            .sort((a, b) => a.dueDate.seconds - b.dueDate.seconds)
            .slice(0, 3);
        return { total, completed, overdue, upcoming };
    }, [milestones]);

    if (projectLoading) {
        return <Skeleton className="h-[400px] w-full" />;
    }

    if (!project) return <div>Project not found</div>;

    // Safe deadline extraction
    const deadlineDate = project.deadline
        ? (typeof project.deadline.toDate === 'function' ? project.deadline.toDate() : null)
        : null;
    const daysLeft = deadlineDate
        ? Math.ceil((deadlineDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    const taskProgress = taskStats.total > 0
        ? Math.round(((taskStats.completed || 0) / taskStats.total) * 100)
        : 0;

    const milestoneProgress = milestoneStats.total > 0
        ? Math.round((milestoneStats.completed / milestoneStats.total) * 100)
        : 0;

    return (
        <div className="space-y-6">
            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500 rounded-lg">
                                <CheckCircle2 className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-xs text-blue-600 font-medium">Tasks</p>
                                <p className="text-xl font-bold text-blue-900">
                                    {taskStats.completed || 0}/{taskStats.total}
                                </p>
                            </div>
                        </div>
                        <Progress value={taskProgress} className="mt-3 h-1.5" />
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500 rounded-lg">
                                <Target className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-xs text-purple-600 font-medium">Milestones</p>
                                <p className="text-xl font-bold text-purple-900">
                                    {milestoneStats.completed}/{milestoneStats.total}
                                </p>
                            </div>
                        </div>
                        <Progress value={milestoneProgress} className="mt-3 h-1.5" />
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500 rounded-lg">
                                <Clock className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-xs text-green-600 font-medium">Hours Logged</p>
                                <p className="text-xl font-bold text-green-900">
                                    {timesheetStats.totalHours.toFixed(1)}h
                                </p>
                            </div>
                        </div>
                        <p className="text-xs text-green-600 mt-2">
                            {timesheetStats.billableHours.toFixed(1)}h billable
                        </p>
                    </CardContent>
                </Card>

                <Card className={`bg-gradient-to-br ${daysLeft < 0 ? "from-red-50 to-red-100 border-red-200" : daysLeft < 7 ? "from-amber-50 to-amber-100 border-amber-200" : "from-cyan-50 to-cyan-100 border-cyan-200"}`}>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${daysLeft < 0 ? "bg-red-500" : daysLeft < 7 ? "bg-amber-500" : "bg-cyan-500"}`}>
                                <Calendar className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className={`text-xs font-medium ${daysLeft < 0 ? "text-red-600" : daysLeft < 7 ? "text-amber-600" : "text-cyan-600"}`}>
                                    {daysLeft < 0 ? "Overdue" : "Days Left"}
                                </p>
                                <p className={`text-xl font-bold ${daysLeft < 0 ? "text-red-900" : daysLeft < 7 ? "text-amber-900" : "text-cyan-900"}`}>
                                    {Math.abs(daysLeft)}
                                </p>
                            </div>
                        </div>
                        <p className={`text-xs mt-2 ${daysLeft < 0 ? "text-red-600" : daysLeft < 7 ? "text-amber-600" : "text-cyan-600"}`}>
                            {deadlineDate ? format(deadlineDate, "MMM d, yyyy") : "No deadline"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Details & Description */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Project Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-y-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Project #</p>
                                    <p className="font-medium">{project.id.slice(0, 8)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Customer</p>
                                    <p className="font-medium text-primary">{project.customerName}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Billing Type</p>
                                    <p className="font-medium capitalize">{project.billingType}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Total Rate</p>
                                    <p className="font-medium">
                                        {project.billingType === "fixed"
                                            ? formatCurrency(project.projectRate || 0, project.currency || "USD")
                                            : `${formatCurrency(project.projectRate || 0, project.currency || "USD")}/hr`}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Status</p>
                                    <Badge variant={project.status === "finished" ? "default" : "secondary"} className="capitalize mt-1">
                                        {project.status.replace("_", " ")}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Date Created</p>
                                    <p className="font-medium">{project.createdAt ? format(project.createdAt.toDate(), "dd/MM/yyyy") : "-"}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Start Date</p>
                                    <p className="font-medium">{project.startDate ? format(project.startDate.toDate(), "dd/MM/yyyy") : "-"}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Deadline</p>
                                    <p className={`font-medium ${daysLeft < 0 ? "text-destructive" : ""}`}>
                                        {deadlineDate ? format(deadlineDate, "dd/MM/yyyy") : "-"}
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <h3 className="font-medium">Description</h3>
                                <div
                                    className="text-sm text-muted-foreground prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: project.description || "No description provided." }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Upcoming Milestones */}
                    {milestoneStats.upcoming.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <Target className="h-4 w-4 text-muted-foreground" />
                                        Upcoming Milestones
                                    </CardTitle>
                                    <Link href={`/dashboard/projects/${projectId}/milestones`} className="text-xs text-blue-600 hover:underline">
                                        View all
                                    </Link>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {milestoneStats.upcoming.map(milestone => {
                                    const dueDate = milestone.dueDate?.toDate();
                                    const isOverdue = dueDate && new Date() > dueDate;
                                    return (
                                        <div key={milestone.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: milestone.color || "#3b82f6" }}
                                                />
                                                <span className="font-medium text-sm">{milestone.name}</span>
                                            </div>
                                            <Badge variant={isOverdue ? "destructive" : "secondary"} className="text-xs">
                                                {isOverdue ? "Overdue" : format(dueDate!, "MMM d")}
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Column: Stats & Financial */}
                <div className="space-y-6">
                    {/* Expense Summary */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                Expense Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-muted-foreground">Total</p>
                                    <p className="font-bold text-lg">{formatCurrency(totalExpenses, project.currency)}</p>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-lg">
                                    <p className="text-xs text-blue-600">Billable</p>
                                    <p className="font-bold text-lg text-blue-900">{formatCurrency(billableExpenses, project.currency)}</p>
                                </div>
                                <div className="p-3 bg-green-50 rounded-lg">
                                    <p className="text-xs text-green-600">Billed</p>
                                    <p className="font-bold text-lg text-green-900">{formatCurrency(billedExpenses, project.currency)}</p>
                                </div>
                                <div className="p-3 bg-amber-50 rounded-lg">
                                    <p className="text-xs text-amber-600">Unbilled</p>
                                    <p className="font-bold text-lg text-amber-900">{formatCurrency(unbilledExpenses, project.currency)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Time Logged */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                Time Logged
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-gray-900">{timesheetStats.totalHours.toFixed(1)}</p>
                                    <p className="text-xs text-muted-foreground">Total Hours</p>
                                </div>
                                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-green-900">{timesheetStats.billableHours.toFixed(1)}</p>
                                    <p className="text-xs text-green-600">Billable</p>
                                </div>
                                <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-orange-900">{timesheetStats.nonBillableHours.toFixed(1)}</p>
                                    <p className="text-xs text-orange-600">Non-Billable</p>
                                </div>
                            </div>

                            {timesheets.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-xs text-muted-foreground mb-2">Recent Entries</p>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                        {timesheets.slice(0, 5).map(ts => (
                                            <div key={ts.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                                                <span className="truncate flex-1">{ts.note || "Time entry"}</span>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-xs">{(ts.duration / 3600).toFixed(1)}h</Badge>
                                                    <span className="text-xs text-muted-foreground">
                                                        {ts.startTime ? format(ts.startTime.toDate(), "MMM d") : ""}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <Link
                                        href={`/dashboard/projects/${projectId}/timesheets`}
                                        className="text-xs text-blue-600 hover:underline block mt-2"
                                    >
                                        View all time entries →
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Task Status Breakdown */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                Task Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {[
                                    { key: "not_started", label: "Not Started", color: "bg-gray-400" },
                                    { key: "in_progress", label: "In Progress", color: "bg-blue-500" },
                                    { key: "testing", label: "Testing", color: "bg-purple-500" },
                                    { key: "awaiting_feedback", label: "Awaiting Feedback", color: "bg-amber-500" },
                                    { key: "completed", label: "Completed", color: "bg-green-500" },
                                ].map(status => {
                                    const count = Number(taskStats[status.key]) || 0;
                                    const percent = taskStats.total > 0 ? (count / taskStats.total) * 100 : 0;
                                    return (
                                        <div key={status.key} className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full ${status.color}`} />
                                            <span className="text-sm flex-1">{status.label}</span>
                                            <span className="text-sm font-medium">{count}</span>
                                            <div className="w-20 bg-gray-100 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${status.color}`}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
