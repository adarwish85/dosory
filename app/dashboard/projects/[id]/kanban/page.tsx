"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    closestCorners,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTasks, useProject } from "@/lib/hooks/use-projects";
import { useMilestones } from "@/lib/hooks/use-project-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Plus,
    Calendar,
    Clock,
    Lock,
    AlertCircle,
    CheckCircle2,
    Circle,
    Loader2,
    Flag,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Task, TaskStatus, TaskPriority } from "@/lib/types";
import { useTranslation } from "@/lib/i18n";

// Status column configuration
const COLUMNS: { id: TaskStatus; titleKey: string; color: string; icon: React.ReactNode }[] = [
    { id: "to_do", titleKey: "projects.status.toDo", color: "bg-gray-100", icon: <Circle className="h-4 w-4 text-gray-500" /> },
    { id: "in_progress", titleKey: "projects.status.inProgress", color: "bg-blue-50", icon: <Loader2 className="h-4 w-4 text-blue-500" /> },
    { id: "blocked", titleKey: "projects.status.blocked", color: "bg-red-50", icon: <Lock className="h-4 w-4 text-red-500" /> },
    { id: "done", titleKey: "projects.status.done", color: "bg-green-50", icon: <CheckCircle2 className="h-4 w-4 text-green-500" /> },
];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
    low: "bg-gray-100 text-gray-600",
    medium: "bg-blue-100 text-blue-600",
    high: "bg-orange-100 text-orange-600",
    urgent: "bg-red-100 text-red-600",
};

// Draggable Task Card Component
function TaskCard({ task, isDragging }: { task: Task; isDragging?: boolean }) {
    const { t } = useTranslation();
    const isOverdue = task.dueDate && task.dueDate.toDate() < new Date() && task.status !== "done";

    return (
        <Card className={`mb-2 cursor-grab active:cursor-grabbing ${isDragging ? "opacity-50 rotate-3" : ""} ${task.isBlocked ? "border-red-300" : ""}`}>
            <CardContent className="p-3">
                <div className="space-y-2">
                    {/* Task Name */}
                    <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm line-clamp-2">{task.name}</p>
                        {task.isBlocked && <Lock className="h-4 w-4 text-red-500 flex-shrink-0" />}
                    </div>

                    {/* Priority & Tags */}
                    <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className={PRIORITY_COLORS[task.priority]}>
                            <Flag className="h-3 w-3 mr-1" />
                            {t(`projects.priority.${task.priority}`)}
                        </Badge>
                        {task.tags?.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                            </Badge>
                        ))}
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                            {task.dueDate && (
                                <div className={`flex items-center gap-1 ${isOverdue ? "text-red-500" : ""}`}>
                                    <Calendar className="h-3 w-3" />
                                    {format(task.dueDate.toDate(), "MMM d")}
                                    {isOverdue && <AlertCircle className="h-3 w-3" />}
                                </div>
                            )}
                            {task.estimatedHours && (
                                <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {task.estimatedHours}h
                                </div>
                            )}
                        </div>

                        {/* Assignees */}
                        {task.assignees.length > 0 && (
                            <div className="flex -space-x-1">
                                {task.assignees.slice(0, 3).map((assignee, i) => (
                                    <Avatar key={i} className="h-5 w-5 border-2 border-white">
                                        <AvatarFallback className="text-[10px]">
                                            {assignee.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                ))}
                                {task.assignees.length > 3 && (
                                    <div className="h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px]">
                                        +{task.assignees.length - 3}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Checklist Progress */}
                    {task.checklist && task.checklist.length > 0 && (
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500 rounded-full"
                                    style={{
                                        width: `${(task.checklist.filter((c) => c.completed).length / task.checklist.length) * 100}%`,
                                    }}
                                />
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {task.checklist.filter((c) => c.completed).length}/{task.checklist.length}
                            </span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// Sortable Task Wrapper
function SortableTask({ task }: { task: Task }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: task.id,
        data: { task },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <TaskCard task={task} isDragging={isDragging} />
        </div>
    );
}

// Column Component
function KanbanColumn({
    column,
    tasks,
    milestoneFilter,
}: {
    column: typeof COLUMNS[0];
    tasks: Task[];
    milestoneFilter: string | null;
}) {
    const { t } = useTranslation();
    const filteredTasks = milestoneFilter
        ? tasks.filter((t) => t.milestoneId === milestoneFilter)
        : tasks;

    return (
        <div className={`flex-1 min-w-[280px] max-w-[320px] rounded-lg ${column.color} p-3`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    {column.icon}
                    <h3 className="font-semibold text-sm">{t(column.titleKey)}</h3>
                    <Badge variant="secondary" className="text-xs">
                        {filteredTasks.length}
                    </Badge>
                </div>
            </div>

            <div className="space-y-2 min-h-[100px]">
                <SortableContext items={filteredTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    {filteredTasks.map((task) => (
                        <SortableTask key={task.id} task={task} />
                    ))}
                </SortableContext>

                {filteredTasks.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                        {t("projects.kanban.noTasks")}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function KanbanPage() {
    const { t } = useTranslation();
    const params = useParams();
    const projectId = params.id as string;
    const { tasks, loading: tasksLoading, updateTaskStatus } = useTasks({ projectId });
    const { milestones, loading: milestonesLoading } = useMilestones(projectId);
    const { project } = useProject(projectId);

    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [milestoneFilter, setMilestoneFilter] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const task = event.active.data.current?.task as Task | undefined;
        if (task) {
            setActiveTask(task);
        }
    }, []);

    const handleDragEnd = useCallback(
        async (event: DragEndEvent) => {
            const { active, over } = event;
            setActiveTask(null);

            if (!over) return;

            const taskId = active.id as string;
            const task = tasks.find((t) => t.id === taskId);
            if (!task) return;

            // Determine which column the task was dropped on
            const overId = over.id as string;
            let newStatus: TaskStatus | null = null;

            // Check if dropped directly on a column
            if (COLUMNS.some((col) => col.id === overId)) {
                newStatus = overId as TaskStatus;
            } else {
                // Dropped on another task - find which column that task is in
                const overTask = tasks.find((t) => t.id === overId);
                if (overTask) {
                    newStatus = overTask.status;
                }
            }

            if (!newStatus || newStatus === task.status) return;

            // Check if task is blocked and trying to mark as done
            if (newStatus === "done" && task.isBlocked) {
                toast.error(t("projects.kanban.toast.blocked"));
                return;
            }

            try {
                await updateTaskStatus(taskId, newStatus);
                const columnKey = COLUMNS.find((c) => c.id === newStatus)?.titleKey;
                toast.success(t("projects.kanban.toast.moved", { status: columnKey ? t(columnKey) : "" }));
            } catch (error) {
                console.error("Failed to update task status:", error);
                toast.error(t("projects.kanban.toast.moveFailed"));
            }
        },
        [tasks, updateTaskStatus, t]
    );

    // Group tasks by status
    const tasksByStatus = COLUMNS.reduce(
        (acc, col) => {
            acc[col.id] = tasks.filter((t) => t.status === col.id);
            return acc;
        },
        {} as Record<TaskStatus, Task[]>
    );

    if (tasksLoading || milestonesLoading) {
        return (
            <div className="flex gap-4 overflow-x-auto pb-4">
                {COLUMNS.map((col) => (
                    <Skeleton key={col.id} className="min-w-[280px] h-[400px]" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
                <div>
                    <h2 className="font-semibold">{t("projects.kanban.title")}</h2>
                    <p className="text-sm text-muted-foreground">
                        {t("projects.kanban.subtitle")}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Select
                        value={milestoneFilter || "all"}
                        onValueChange={(v) => setMilestoneFilter(v === "all" ? null : v)}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder={t("projects.kanban.filterByMilestone")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t("projects.kanban.allMilestones")}</SelectItem>
                            {milestones.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                    {m.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Kanban Board */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {COLUMNS.map((column) => (
                        <KanbanColumn
                            key={column.id}
                            column={column}
                            tasks={tasksByStatus[column.id] || []}
                            milestoneFilter={milestoneFilter}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeTask && <TaskCard task={activeTask} isDragging />}
                </DragOverlay>
            </DndContext>

            {/* Stats */}
            <div className="flex gap-4 text-sm text-muted-foreground bg-gray-50 p-3 rounded-lg">
                <div>
                    <span className="font-medium text-foreground">{tasks.length}</span> {t("projects.kanban.stats.totalTasks")}
                </div>
                <div>
                    <span className="font-medium text-green-600">{tasksByStatus.done?.length || 0}</span> {t("projects.status.completed")}
                </div>
                <div>
                    <span className="font-medium text-red-600">{tasksByStatus.blocked?.length || 0}</span> {t("projects.kanban.stats.blocked")}
                </div>
                <div>
                    <span className="font-medium text-orange-600">
                        {tasks.filter((t) => t.dueDate && t.dueDate.toDate() < new Date() && t.status !== "done").length}
                    </span>{" "}
                    {t("projects.kanban.stats.overdue")}
                </div>
            </div>
        </div>
    );
}
