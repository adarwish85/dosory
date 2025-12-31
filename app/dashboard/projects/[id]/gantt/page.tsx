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

export default function GanttPage() {
    const params = useParams();
    const projectId = params.id as string;
    const { tasks, loading: tasksLoading, updateTask, updateTaskStatus } = useTasks({ projectId });
    const { milestones, loading: milestonesLoading, updateMilestone } = useMilestones(projectId);
    const { project } = useProject(projectId);
    const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
    const [isChecked] = useState(true);

    // Map progress to status
    const progressToStatus = useCallback((progress: number): TaskStatus => {
        if (progress >= 100) return "completed";
        if (progress > 0) return "in_progress";
        return "not_started";
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
                toast.success(`Milestone "${task.name}" updated`);
            } else if (task.type === "task") {
                await updateTask(task.id, {
                    startDate: task.start,
                    dueDate: task.end,
                });
                toast.success(`Task "${task.name}" dates updated`);
            }
        } catch (error) {
            console.error("Failed to update dates:", error);
            toast.error("Failed to update dates");
        }
    }, [updateTask, updateMilestone]);

    // Handle progress change from Gantt drag
    const handleProgressChange = useCallback(async (task: GanttTask) => {
        try {
            if (task.type !== "task") return;

            const newStatus = progressToStatus(task.progress);
            await updateTaskStatus(task.id, newStatus);
            toast.success(`Task "${task.name}" progress updated to ${Math.round(task.progress)}%`);
        } catch (error) {
            console.error("Failed to update progress:", error);
            toast.error("Failed to update progress");
        }
    }, [updateTaskStatus, progressToStatus]);

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
            name: project?.name || "Project",
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
            if (t.status === "completed") progress = 100;
            else if (t.status === "in_progress") progress = 50;
            else if (t.status === "testing") progress = 75;
            else if (t.status === "awaiting_feedback") progress = 90;

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
    }, [tasks, milestones, project]);


    if (tasksLoading || milestonesLoading) {
        return <Skeleton className="h-[500px] w-full" />;
    }

    if (ganttTasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] border rounded-lg bg-gray-50/50 border-dashed text-muted-foreground">
                <Calendar className="h-10 w-10 mb-2 opacity-20" />
                <p>No tasks or milestones to display on Gantt.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-2 rounded border">
                <div className="px-2">
                    <h3 className="font-semibold">Gantt View</h3>
                    <p className="text-xs text-muted-foreground">Drag tasks to change dates • Drag progress bar to update status</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">View:</span>
                    <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                        <SelectTrigger className="w-[120px] h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ViewMode.Day}>Day</SelectItem>
                            <SelectItem value={ViewMode.Week}>Week</SelectItem>
                            <SelectItem value={ViewMode.Month}>Month</SelectItem>
                            <SelectItem value={ViewMode.Year}>Year</SelectItem>
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
                    <span>In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span>Completed</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-cyan-400" />
                    <span>Milestone</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-yellow-500" />
                    <span>Project</span>
                </div>
            </div>
        </div>
    );
}
