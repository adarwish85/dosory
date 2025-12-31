"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useTasks, useProject } from "@/lib/hooks/use-projects"; // Re-exporting or correct import
import { useMilestones } from "@/lib/hooks/use-project-data";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function GanttPage() {
    const params = useParams();
    const projectId = params.id as string;
    const { tasks, loading: tasksLoading } = useTasks({ projectId });
    const { milestones, loading: milestonesLoading } = useMilestones(projectId);
    const { project } = useProject(projectId);
    const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
    const [isChecked, setIsChecked] = useState(true);

    const ganttTasks: Task[] = useMemo(() => {
        if (!tasks.length && !milestones.length) return [];

        const projectTask: Task = {
            start: project?.startDate?.toDate() || new Date(),
            end: project?.deadline?.toDate() || new Date(),
            name: project?.name || "Project",
            id: "project_root",
            type: "project",
            progress: 0, // specific field for Project tasks
            isDisabled: true,
            styles: { progressColor: "#ffbb54", progressSelectedColor: "#ff9e0d" },
        };

        const mTasks: Task[] = milestones.map(m => ({
            start: m.dueDate.toDate(),
            end: m.dueDate.toDate(),
            name: m.name,
            id: m.id,
            type: "milestone",
            progress: m.status === "complete" ? 100 : 0,
            isDisabled: true,
            styles: { progressColor: m.color || "#22d3ee", progressSelectedColor: m.color || "#22d3ee" },
            project: "project_root"
        }));

        const tTasks: Task[] = tasks.map(t => {
            const start = t.startDate ? t.startDate.toDate() : new Date();
            const end = t.dueDate ? t.dueDate.toDate() : new Date(start.getTime() + 86400000); // Default 1 day
            return {
                start,
                end,
                name: t.name,
                id: t.id,
                type: "task",
                progress: t.status === "completed" ? 100 : t.status === "in_progress" ? 50 : 0,
                isDisabled: false,
                project: "project_root", // Link to project root for collapsing
                dependencies: undefined
            };
        });

        // Add root project task at the beginning or wrap
        // For simplicity, just listing tasks and milestones:
        // return [...mTasks, ...tTasks];
        // But gantt-react likes a hierarchy if we want collapsing.
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
                <h3 className="font-semibold px-2">Gantt View</h3>
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
                            onDateChange={(task, children) => {
                                // TODO: Update task dates backend
                                console.log("Date changed", task);
                            }}
                            onProgressChange={(task, children) => {
                                // TODO: Update task progress status backend
                                console.log("Progress changed", task);
                            }}
                            onDoubleClick={(task) => {
                                // TODO: Open task edit dialog
                                console.log("Double clicked", task);
                            }}
                            listCellWidth={isChecked ? "155px" : ""}
                            columnWidth={viewMode === ViewMode.Month ? 300 : viewMode === ViewMode.Week ? 250 : 65}
                            barFill={50}
                        />
                    </div>
                </div>
            </Card>
        </div>
    );
}
