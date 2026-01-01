"use client";

import { useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { useMilestones } from "@/lib/hooks/use-project-data";
import { useTaskLists, useTasks } from "@/lib/hooks";
import { CreateMilestoneDialog } from "@/components/dashboard/projects/create-milestone-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { format, isAfter } from "date-fns";
import {
    Calendar,
    MoreHorizontal,
    Pencil,
    Trash,
    CheckCircle2,
    Circle,
    Plus,
    FolderPlus,
    ChevronDown,
    ChevronRight,
    AlertTriangle,
    ListTodo,
    GripVertical,
    Loader2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Milestone, TaskList, Task } from "@/lib/types";
import {
    DndContext,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Draggable Task Item Component
function DraggableTaskItem({
    task,
    milestone,
    onToggleComplete,
}: {
    task: Task;
    milestone: Milestone;
    onToggleComplete: (task: Task) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id, data: { task, type: "task" } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const isTaskComplete = task.status === "completed";
    const taskOverdue = task.dueDate &&
        !isTaskComplete &&
        isAfter(new Date(), task.dueDate.toDate());
    const afterMilestone = task.dueDate &&
        isAfter(task.dueDate.toDate(), milestone.dueDate.toDate());

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white group",
                isTaskComplete && "opacity-60",
                isDragging && "opacity-50 bg-blue-50 shadow-lg"
            )}
        >
            <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <GripVertical className="h-3.5 w-3.5 text-gray-400" />
            </button>
            <button onClick={() => onToggleComplete(task)} className="shrink-0">
                {isTaskComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                    <Circle className="h-4 w-4 text-gray-300" />
                )}
            </button>
            <span className={cn(
                "text-sm flex-1 truncate",
                isTaskComplete && "line-through"
            )}>
                {task.name}
            </span>
            {afterMilestone && !isTaskComplete && (
                <span title="Due after milestone">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                </span>
            )}
            {taskOverdue && (
                <Badge variant="destructive" className="text-[10px] px-1 py-0">
                    Overdue
                </Badge>
            )}
        </div>
    );
}

// Task List Drop Zone Component
function TaskListDropZone({
    list,
    listTasks,
    milestone,
    taskListProgress,
    onDeleteTaskList,
    onToggleComplete,
}: {
    list: TaskList;
    listTasks: Task[];
    milestone: Milestone;
    taskListProgress: { completed: number; total: number; percent: number };
    onDeleteTaskList: (id: string) => void;
    onToggleComplete: (task: Task) => void;
}) {
    return (
        <div className="border rounded-lg p-3 bg-gray-50/50">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <ListTodo className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-sm">{list.name}</span>
                    <Badge variant="secondary" className="text-xs">
                        {taskListProgress.completed}/{taskListProgress.total}
                    </Badge>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreHorizontal className="h-3 w-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => confirm("Delete task list?") && onDeleteTaskList(list.id)}
                        >
                            <Trash className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Tasks in this list - droppable zone */}
            <SortableContext items={listTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {listTasks.length > 0 ? (
                    <div className="space-y-1 ml-6 min-h-[40px]">
                        {listTasks.map(task => (
                            <DraggableTaskItem
                                key={task.id}
                                task={task}
                                milestone={milestone}
                                onToggleComplete={onToggleComplete}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground ml-6 italic py-2 border-2 border-dashed border-gray-200 rounded text-center">
                        Drop tasks here
                    </p>
                )}
            </SortableContext>
        </div>
    );
}

export default function MilestonesPage() {
    const params = useParams();
    const projectId = params.id as string;
    const { milestones, loading, deleteMilestone, updateMilestone } = useMilestones(projectId);
    const { taskLists, taskListsByMilestone, createTaskList, deleteTaskList } = useTaskLists({ projectId });
    const { tasks, updateTask } = useTasks({ projectId });

    // Drag state
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    // Edit dialog state
    const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editDueDate, setEditDueDate] = useState("");
    const [editColor, setEditColor] = useState("");

    // Create task list dialog
    const [creatingTaskListFor, setCreatingTaskListFor] = useState<string | null>(null);
    const [newTaskListName, setNewTaskListName] = useState("");
    const [creatingTaskList, setCreatingTaskList] = useState(false);

    // Expanded milestones
    const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Calculate progress for each milestone
    const milestoneProgress = useMemo(() => {
        const progress: Record<string, { completed: number; total: number; percent: number }> = {};

        milestones.forEach(m => {
            const milestoneTasks = tasks.filter(t => t.milestoneId === m.id);
            const completedTasks = milestoneTasks.filter(t => t.status === "completed");
            const total = milestoneTasks.length;
            const completed = completedTasks.length;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
            progress[m.id] = { completed, total, percent };
        });

        return progress;
    }, [milestones, tasks]);

    // Calculate progress for each task list
    const taskListProgress = useMemo(() => {
        const progress: Record<string, { completed: number; total: number; percent: number }> = {};

        taskLists.forEach(tl => {
            const listTasks = tasks.filter(t => t.taskListId === tl.id);
            const completedTasks = listTasks.filter(t => t.status === "completed");
            const total = listTasks.length;
            const completed = completedTasks.length;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
            progress[tl.id] = { completed, total, percent };
        });

        return progress;
    }, [taskLists, tasks]);

    // Sort milestones by due date
    const sortedMilestones = useMemo(() =>
        [...milestones].sort((a, b) => a.dueDate.seconds - b.dueDate.seconds),
        [milestones]
    );

    const isOverdue = (date: any) => {
        return new Date() > date.toDate();
    };

    const toggleMilestone = (id: string) => {
        setExpandedMilestones(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Open edit dialog
    const openEditDialog = (milestone: Milestone) => {
        setEditingMilestone(milestone);
        setEditName(milestone.name);
        setEditDescription(milestone.description || "");
        setEditDueDate(format(milestone.dueDate.toDate(), "yyyy-MM-dd"));
        setEditColor(milestone.color || "#3b82f6");
    };

    // Save milestone edits
    const saveEdit = async () => {
        if (!editingMilestone) return;
        try {
            await updateMilestone(editingMilestone.id, {
                name: editName,
                description: editDescription,
                dueDate: new Date(editDueDate),
                color: editColor,
            });
            toast.success("Milestone updated");
            setEditingMilestone(null);
        } catch (error) {
            toast.error("Failed to update milestone");
        }
    };

    // Create new task list
    const handleCreateTaskList = async () => {
        if (!creatingTaskListFor || !newTaskListName.trim()) return;
        setCreatingTaskList(true);
        try {
            await createTaskList({
                name: newTaskListName.trim(),
                milestoneId: creatingTaskListFor,
                projectId,
            });
            toast.success("Task list created");
            setCreatingTaskListFor(null);
            setNewTaskListName("");
            // Auto-expand the milestone
            setExpandedMilestones(prev => new Set([...prev, creatingTaskListFor]));
        } catch (error) {
            toast.error("Failed to create task list");
        } finally {
            setCreatingTaskList(false);
        }
    };

    // Get tasks for a task list
    const getTasksForList = useCallback((taskListId: string) => {
        return tasks.filter(t => t.taskListId === taskListId);
    }, [tasks]);

    // Toggle task complete
    const toggleTaskComplete = async (task: Task) => {
        try {
            await updateTask(task.id, {
                status: task.status === "completed" ? "not_started" : "completed",
            } as any);
        } catch {
            toast.error("Failed to update task");
        }
    };

    // Handle drag start
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const taskData = active.data.current?.task as Task | undefined;
        if (taskData) {
            setActiveTask(taskData);
        }
    };

    // Handle drag end - move task to new list
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // If dropped on the same task, do nothing
        if (activeId === overId) return;

        // Find the task being dragged
        const draggedTask = tasks.find(t => t.id === activeId);
        if (!draggedTask) return;

        // Determine the target task list
        let targetTaskListId: string | undefined;
        let targetMilestoneId: string | undefined;

        // Check if dropped on another task
        const overTask = tasks.find(t => t.id === overId);
        if (overTask) {
            targetTaskListId = overTask.taskListId;
            targetMilestoneId = overTask.milestoneId;
        } else {
            // Dropped on a task list directly
            const overTaskList = taskLists.find(tl => tl.id === overId);
            if (overTaskList) {
                targetTaskListId = overTaskList.id;
                targetMilestoneId = overTaskList.milestoneId;
            }
        }

        // If task is being moved to a different list
        if (targetTaskListId && targetTaskListId !== draggedTask.taskListId) {
            try {
                await updateTask(activeId, {
                    taskListId: targetTaskListId,
                    milestoneId: targetMilestoneId,
                } as any);
                toast.success("Task moved");
            } catch {
                toast.error("Failed to move task");
            }
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-[120px] w-full rounded-lg" />
                ))}
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Milestones</h2>
                        <p className="text-muted-foreground text-sm">Organize tasks into milestones and task lists. Drag tasks to move between lists.</p>
                    </div>
                    <CreateMilestoneDialog projectId={projectId} />
                </div>

                {milestones.length === 0 ? (
                    <div className="text-center py-20 border rounded-lg bg-gray-50/50 border-dashed">
                        <Calendar className="h-10 w-10 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900">No milestones yet</h3>
                        <p className="text-sm text-gray-500 mt-1 mb-4">Create a milestone to track major project phases.</p>
                        <CreateMilestoneDialog projectId={projectId} />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sortedMilestones.map((milestone) => {
                            const isCompleted = milestone.status === "complete";
                            const overdue = !isCompleted && isOverdue(milestone.dueDate);
                            const isExpanded = expandedMilestones.has(milestone.id);
                            const progress = milestoneProgress[milestone.id] || { completed: 0, total: 0, percent: 0 };
                            const lists = taskListsByMilestone[milestone.id] || [];

                            return (
                                <Card key={milestone.id} className={cn(
                                    "transition-all",
                                    isCompleted ? "bg-gray-50/50 border-gray-200" : "bg-white"
                                )}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 flex-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 shrink-0"
                                                    onClick={() => toggleMilestone(milestone.id)}
                                                >
                                                    {isExpanded ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <div
                                                    className="w-3 h-3 rounded-full shrink-0"
                                                    style={{ backgroundColor: milestone.color || "#3b82f6" }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <CardTitle className="text-base font-semibold truncate">
                                                        {milestone.name}
                                                    </CardTitle>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                        <span className={cn("flex items-center gap-1", overdue && "text-red-600")}>
                                                            <Calendar className="h-3 w-3" />
                                                            {format(milestone.dueDate.toDate(), "MMM d, yyyy")}
                                                        </span>
                                                        <span>{progress.completed}/{progress.total} tasks</span>
                                                        {lists.length > 0 && (
                                                            <span className="flex items-center gap-1">
                                                                <ListTodo className="h-3 w-3" />
                                                                {lists.length} list{lists.length !== 1 ? "s" : ""}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant={isCompleted ? "default" : overdue ? "destructive" : "secondary"}
                                                    className={isCompleted ? "bg-green-500" : ""}
                                                >
                                                    {isCompleted ? "Complete" : overdue ? "Overdue" : `${progress.percent}%`}
                                                </Badge>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => openEditDialog(milestone)}>
                                                            <Pencil className="mr-2 h-4 w-4" /> Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setCreatingTaskListFor(milestone.id)}>
                                                            <FolderPlus className="mr-2 h-4 w-4" /> Add Task List
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => updateMilestone(milestone.id, {
                                                                status: isCompleted ? "incomplete" : "complete"
                                                            })}
                                                        >
                                                            {isCompleted ? "Mark Incomplete" : "Mark Complete"}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-red-600"
                                                            onClick={() => confirm("Delete milestone?") && deleteMilestone(milestone.id)}
                                                        >
                                                            <Trash className="mr-2 h-4 w-4" /> Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>

                                        {/* Progress bar */}
                                        <div className="mt-3 ml-11">
                                            <Progress
                                                value={isCompleted ? 100 : progress.percent}
                                                className="h-1.5"
                                                style={{
                                                    "--progress-foreground": milestone.color || "#3b82f6"
                                                } as any}
                                            />
                                        </div>
                                    </CardHeader>

                                    {/* Expanded content - Task Lists */}
                                    {isExpanded && (
                                        <CardContent className="pt-0 ml-11">
                                            {lists.length === 0 ? (
                                                <div className="text-center py-6 border rounded-lg border-dashed bg-gray-50/50">
                                                    <FolderPlus className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                                    <p className="text-sm text-muted-foreground mb-2">No task lists yet</p>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCreatingTaskListFor(milestone.id)}
                                                    >
                                                        <Plus className="mr-2 h-4 w-4" /> Create Task List
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {lists.map(list => {
                                                        const listProgress = taskListProgress[list.id] || { completed: 0, total: 0, percent: 0 };
                                                        const listTasks = getTasksForList(list.id);

                                                        return (
                                                            <TaskListDropZone
                                                                key={list.id}
                                                                list={list}
                                                                listTasks={listTasks}
                                                                milestone={milestone}
                                                                taskListProgress={listProgress}
                                                                onDeleteTaskList={deleteTaskList}
                                                                onToggleComplete={toggleTaskComplete}
                                                            />
                                                        );
                                                    })}

                                                    {/* Add task list button */}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="w-full text-muted-foreground"
                                                        onClick={() => setCreatingTaskListFor(milestone.id)}
                                                    >
                                                        <Plus className="mr-2 h-4 w-4" /> Add Task List
                                                    </Button>
                                                </div>
                                            )}
                                        </CardContent>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Drag Overlay */}
                <DragOverlay>
                    {activeTask && (
                        <div className="flex items-center gap-2 py-1.5 px-2 rounded bg-white shadow-lg border">
                            <GripVertical className="h-3.5 w-3.5 text-gray-400" />
                            {activeTask.status === "completed" ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                                <Circle className="h-4 w-4 text-gray-300" />
                            )}
                            <span className="text-sm">{activeTask.name}</span>
                        </div>
                    )}
                </DragOverlay>

                {/* Edit Milestone Dialog */}
                <Dialog open={!!editingMilestone} onOpenChange={(open) => !open && setEditingMilestone(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Milestone</DialogTitle>
                            <DialogDescription>Update milestone details.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Name</label>
                                <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Description</label>
                                <Textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Due Date</label>
                                    <Input
                                        type="date"
                                        value={editDueDate}
                                        onChange={(e) => setEditDueDate(e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Color</label>
                                    <div className="flex gap-2 mt-1">
                                        <Input
                                            type="color"
                                            value={editColor}
                                            onChange={(e) => setEditColor(e.target.value)}
                                            className="w-12 h-9 p-1"
                                        />
                                        <Input
                                            value={editColor}
                                            onChange={(e) => setEditColor(e.target.value)}
                                            className="flex-1"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingMilestone(null)}>Cancel</Button>
                            <Button onClick={saveEdit}>Save Changes</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Create Task List Dialog */}
                <Dialog open={!!creatingTaskListFor} onOpenChange={(open) => !open && setCreatingTaskListFor(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Task List</DialogTitle>
                            <DialogDescription>
                                Add a new task list to organize tasks within this milestone.
                            </DialogDescription>
                        </DialogHeader>
                        <div>
                            <label className="text-sm font-medium">Name</label>
                            <Input
                                value={newTaskListName}
                                onChange={(e) => setNewTaskListName(e.target.value)}
                                placeholder="e.g., UI Tasks, Backend Tasks"
                                className="mt-1"
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setCreatingTaskListFor(null)}>Cancel</Button>
                            <Button onClick={handleCreateTaskList} disabled={!newTaskListName.trim() || creatingTaskList}>
                                {creatingTaskList && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DndContext>
    );
}
