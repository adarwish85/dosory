"use client";

import { useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { useTasks, useProject } from "@/lib/hooks/use-projects";
import { useMilestones } from "@/lib/hooks/use-project-data";
import { Gantt, Task as GanttTask, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { TaskStatus } from "@/lib/types";
import { useTranslation } from "@/lib/i18n";

export default function GanttPage() {
    const { t } = useTranslation();
    const params = useParams();
    const projectId = params.id as string;
    const { tasks, loading: tasksLoading, updateTask, updateTaskStatus } = useTasks({ projectId });
    const { milestones, loading: milestonesLoading, updateMilestone } = useMilestones(projectId);
    const { project } = useProject(projectId);
    const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
    const [isChecked] = useState(true);

    // Map progress to status
    const progressToStatus = useCallback((progress: number): TaskStatus => {
        if (progress >= 100) return "done";
        if (progress > 0) return "in_progress";
        return "to_do";
    }, []);

    // Handle date change from Gantt drag
    const handleDateChange = useCallback(async (task: GanttTask) => {
        try {
            // Skip project root
            if (task.id === "project_root") return;

            // Check if it's a milestone or task
            if (task.type === "milestone") {
                await updateMilestone(task.id, {
                    dueDate: task.start
                });
                toast.success(t("projects.gantt.toast.milestoneUpdated", { name: task.name }));
            } else if (task.type === "task") {
                await updateTask(task.id, {
                    startDate: task.start,
                    dueDate: task.end,
                });
                toast.success(t("projects.gantt.toast.taskDatesUpdated", { name: task.name }));
            }
        } catch (error) {
            console.error("Failed to update dates:", error);
            toast.error(t("projects.gantt.toast.datesFailed"));
        }
    }, [updateTask, updateMilestone, t]);

    // Handle progress change from Gantt drag
    const handleProgressChange = useCallback(async (task: GanttTask) => {
        try {
            if (task.type !== "task") return;

            const newStatus = progressToStatus(task.progress);
            await updateTaskStatus(task.id, newStatus);
            toast.success(t("projects.gantt.toast.progressUpdated", { name: task.name, percent: Math.round(task.progress) }));
        } catch (error) {
            console.error("Failed to update progress:", error);
            toast.error(t("projects.gantt.toast.progressFailed"));
        }
    }, [updateTaskStatus, progressToStatus, t]);

    // Handle double click to edit
    const handleDoubleClick = useCallback((task: GanttTask) => {
        if (task.type === "project") return;

        // Open task in new tab or show edit dialog
        if (task.type === "task") {
            window.open(`/dashboard/tasks?taskId=${task.id}`, "_blank");
        }
    }, []);

    const ganttTasks: GanttTask[] = useMemo(() => {
        if (!tasks.length && !milestones.length) return [];

        const projectTask: GanttTask = {
            start: project?.startDate?.toDate() || new Date(),
            end: project?.deadline?.toDate() || new Date(),
            name: project?.name || t("projects.legend.project"),
            id: "project_root",
            type: "project",
            progress: project?.progress || 0,
            isDisabled: true,
            styles: { progressColor: "#ffbb54", progressSelectedColor: "#ff9e0d" },
        };

        const mTasks: GanttTask[] = milestones.map(m => ({
            start: m.dueDate.toDate(),
            end: m.dueDate.toDate(),
            name: m.name,
            id: m.id,
            type: "milestone",
            progress: m.status === "complete" ? 100 : 0,
            isDisabled: false, // Enable dragging for milestones
            styles: { progressColor: m.color || "#22d3ee", progressSelectedColor: m.color || "#22d3ee" },
            project: "project_root"
        }));

        const tTasks: GanttTask[] = tasks.map(t => {
            const start = t.startDate ? t.startDate.toDate() : new Date();
            const end = t.dueDate ? t.dueDate.toDate() : new Date(start.getTime() + 86400000);

            // Ensure end is after start
            const validEnd = end > start ? end : new Date(start.getTime() + 86400000);

            // Calculate progress based on status
            let progress = 0;
            if (t.status === "done") progress = 100;
            else if (t.status === "in_progress") progress = 50;

            return {
                start,
                end: validEnd,
                name: t.name,
                id: t.id,
                type: "task" as const,
                progress,
                isDisabled: false, // Enable dragging
                project: "project_root",
                dependencies: undefined,
                styles: {
                    progressColor: progress === 100 ? "#22c55e" : "#3b82f6",
                    progressSelectedColor: progress === 100 ? "#16a34a" : "#2563eb",
                    backgroundColor: progress === 100 ? "#dcfce7" : "#dbeafe",
                    backgroundSelectedColor: progress === 100 ? "#bbf7d0" : "#bfdbfe",
                }
            };
        });

        return [projectTask, ...mTasks, ...tTasks].sort((a, b) => a.start.getTime() - b.start.getTime());
    }, [tasks, milestones, project, t]);


    if (tasksLoading || milestonesLoading) {
        return <Skeleton className="h-[500px] w-full" />;
    }

    if (ganttTasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] border rounded-lg bg-gray-50/50 border-dashed text-muted-foreground">
                <Calendar className="h-10 w-10 mb-2 opacity-20" />
                <p>{t("projects.gantt.empty")}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-2 rounded border">
                <div className="px-2">
                    <h3 className="font-semibold">{t("projects.gantt.title")}</h3>
                    <p className="text-xs text-muted-foreground">{t("projects.gantt.subtitle")}</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{t("projects.gantt.viewLabel")}</span>
                    <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                        <SelectTrigger className="w-[120px] h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ViewMode.Day}>{t("projects.gantt.viewMode.day")}</SelectItem>
                            <SelectItem value={ViewMode.Week}>{t("projects.gantt.viewMode.week")}</SelectItem>
                            <SelectItem value={ViewMode.Month}>{t("projects.gantt.viewMode.month")}</SelectItem>
                            <SelectItem value={ViewMode.Year}>{t("projects.gantt.viewMode.year")}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <div style={{ minWidth: "1000px" }}>
                        <Gantt
                            tasks={ganttTasks}
                            viewMode={viewMode}
                            onDateChange={handleDateChange}
                            onProgressChange={handleProgressChange}
                            onDoubleClick={handleDoubleClick}
                            listCellWidth={isChecked ? "155px" : ""}
                            columnWidth={viewMode === ViewMode.Month ? 300 : viewMode === ViewMode.Week ? 250 : 65}
                            barFill={50}
                        />
                    </div>
                </div>
            </Card>

            {/* Legend */}
            <div className="flex items-center gap-6 text-xs text-muted-foreground p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-500" />
                    <span>{t("projects.status.inProgress")}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span>{t("projects.status.completed")}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-cyan-400" />
                    <span>{t("projects.legend.milestone")}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-yellow-500" />
                    <span>{t("projects.legend.project")}</span>
                </div>
            </div>
        </div>
    );
}
