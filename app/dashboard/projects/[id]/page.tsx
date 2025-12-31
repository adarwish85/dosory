"use client";

import { useProject, useTasks, useProjects } from "@/lib/hooks/use-projects"; // Re-exporting hooks or importing from correct path
import { useExpenses } from "@/lib/hooks/use-expenses";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, FileText, CheckCircle2, Clock, PieChart, Info } from "lucide-react";

export default function ProjectOverviewPage() {
    const params = useParams();
    const projectId = params.id as string;
    const { project, loading: projectLoading } = useProject(projectId);
    const { taskStats } = useTasks({ projectId });
    const { expenses } = useExpenses({ projectId });

    // Calculate expense stats
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const billableExpenses = expenses.filter(e => e.billable).reduce((sum, exp) => sum + exp.amount, 0);
    const billedExpenses = expenses.filter(e => e.invoiceId).reduce((sum, exp) => sum + exp.amount, 0); // Assuming invoiceId means billed
    const unbilledExpenses = billableExpenses - billedExpenses;

    if (projectLoading) {
        return <Skeleton className="h-[400px] w-full" />;
    }

    if (!project) return <div>Project not found</div>;

    // Safe deadline extraction - handle both Timestamp and Date objects
    const deadlineDate = project.deadline
        ? (typeof project.deadline.toDate === 'function' ? project.deadline.toDate() : new Date(project.deadline))
        : null;
    const daysLeft = deadlineDate
        ? Math.ceil((deadlineDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    return (
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
                                <p className="font-medium capitalize">{project.status.replace("_", " ")}</p>
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
            </div>

            {/* Right Column: Stats & Expenses */}
            <div className="space-y-6">
                {/* Progress Card */}
                <div className="grid grid-cols-2 gap-4">
                    <Card>
                        <CardContent className="p-4 pt-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium">{taskStats.total - (taskStats.completed || 0)} Open Tasks</span>
                                    <span className="text-muted-foreground">
                                        {taskStats.total > 0 ? Math.round(((taskStats.completed || 0) / taskStats.total) * 100) : 0}%
                                    </span>
                                </div>
                                <Progress value={taskStats.total > 0 ? ((taskStats.completed || 0) / taskStats.total) * 100 : 0} />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 pt-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium">{daysLeft > 0 ? daysLeft : 0} Days Left</span>
                                    <span className="text-muted-foreground">
                                        {/* Simple visualization for time elapsed, can be improved */}
                                        Time
                                    </span>
                                </div>
                                <Progress value={Math.max(0, Math.min(100, 100))} className="bg-muted" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Expense Summary */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            Expenses
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                            <div>
                                <p className="text-xs text-muted-foreground">Total Expenses</p>
                                <p className="font-bold text-sm">{formatCurrency(totalExpenses, project.currency)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground text-blue-500">Billable</p>
                                <p className="font-bold text-sm">{formatCurrency(billableExpenses, project.currency)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground text-green-500">Billed</p>
                                <p className="font-bold text-sm">{formatCurrency(billedExpenses, project.currency)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground text-red-500">Unbilled</p>
                                <p className="font-bold text-sm">{formatCurrency(unbilledExpenses, project.currency)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Logged Hours Placeholder (need useTimesheets properly connected) */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            Total Logged Hours
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px] flex items-center justify-center border rounded border-dashed text-muted-foreground text-sm">
                            Chart Component Placeholder
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
