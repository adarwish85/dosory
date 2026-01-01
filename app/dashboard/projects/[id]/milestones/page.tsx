"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { useMilestones } from "@/lib/hooks/use-project-data";
import { useTaskLists, useTasks } from "@/lib/hooks";
import { CreateMilestoneDialog } from "@/components/dashboard/projects/create-milestone-dialog";
import { Button } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
    AlertTriangle,
    ListTodo,
    GripVertical,
    Loader2,
    Check,
    X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
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
import { ImportTasksDialog } from "@/components/dashboard/projects/import-tasks-dialog";
import { EditTaskDialog } from "@/components/dashboard/tasks/edit-task-dialog";
import { EditTaskListDialog } from "@/components/dashboard/projects/edit-task-list-dialog";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
    horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LayoutGrid, List as ListIcon } from "lucide-react";
import { MilestoneListItem, MilestoneBoardColumn } from "@/components/dashboard/projects/milestone-components";

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
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: task.id,
        data: { task, type: "task" },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const isTaskComplete = task.status === "completed";
    const taskOverdue = task.dueDate && !isTaskComplete && isAfter(new Date(), task.dueDate.toDate());
    const afterMilestone = task.dueDate && isAfter(task.dueDate.toDate(), milestone.dueDate.toDate());

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
            <span className={cn("text-sm flex-1 truncate", isTaskComplete && "line-through")}>{task.name}</span>
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
    onImportTasks,
    onAddTask,
    onEditTask,
    onEditTaskList,
}: {
    list: TaskList;
    listTasks: Task[];
    milestone: Milestone;
    taskListProgress: { completed: number; total: number; percent: number };
    onDeleteTaskList: (id: string) => void;
    onToggleComplete: (task: Task) => void;
    onImportTasks: (taskListId: string) => void;
    onAddTask: (listId: string, name: string) => Promise<void>;
    onEditTask: (task: Task) => void;
    onEditTaskList: (list: TaskList) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: list.id,
        data: { list, type: "taskList" },
    });

    const [isAddingTask, setIsAddingTask] = useState(false);
    const [newTaskName, setNewTaskName] = useState("");
    const [submittingTask, setSubmittingTask] = useState(false);

    // Auto-focus input when adding task
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (isAddingTask && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isAddingTask]);

    const handleAddTask = async () => {
        if (!newTaskName.trim()) {
            setIsAddingTask(false);
            return;
        }

        setSubmittingTask(true);
        try {
            await onAddTask(list.id, newTaskName);
            setNewTaskName("");
            // Keep adding mode open for rapid entry? User said "inline input (fast)".
            // Often rapid entry means keeping it open. Let's keep it open but clear value.
            // Or maybe close it. Let's close it for now to be safe, or check UX.
            // Ideally: Type -> Enter -> Save -> Clear -> Ready for next.
            // Let's implement Type -> Enter -> Save -> Clear.
        } catch {
            // Error handled in parent
        } finally {
            setSubmittingTask(false);
            inputRef.current?.focus();
        }
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAddTask();
        } else if (e.key === "Escape") {
            setIsAddingTask(false);
            setNewTaskName("");
        }
    };

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className={cn("flex flex-col h-full", isDragging && "opacity-50")}>
            <div className="border rounded-lg p-3 bg-gray-50/50 flex flex-col h-full">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <button {...attributes} {...listeners} className="cursor-grab hover:text-gray-700">
                            <GripVertical className="h-4 w-4 text-gray-400" />
                        </button>
                        <ListTodo className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-sm">{list.name}</span>
                        <Badge variant="secondary" className="text-xs">
                            {taskListProgress.completed}/{taskListProgress.total}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs px-2 text-gray-500 hover:text-gray-900"
                            onClick={() => onImportTasks(list.id)}
                        >
                            <FolderPlus className="h-3 w-3 mr-1" /> Import
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <MoreHorizontal className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEditTaskList(list)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => confirm("Delete task list?") && onDeleteTaskList(list.id)}
                                >
                                    <Trash className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Tasks in this list - droppable zone */}
                <SortableContext items={listTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1 ml-6 min-h-[40px] flex-1">
                        {listTasks.map((task) => (
                            <div key={task.id} className="group relative">
                                <DraggableTaskItem
                                    task={task}
                                    milestone={milestone}
                                    onToggleComplete={onToggleComplete}
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                        e.stopPropagation(); // prevent drag?
                                        onEditTask(task);
                                    }}
                                >
                                    <Pencil className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </SortableContext>

                {/* Inline Add Task */}
                <div className="ml-6 mt-2">
                    {isAddingTask ? (
                        <div className="flex items-center gap-2">
                            <Input
                                ref={inputRef}
                                value={newTaskName}
                                onChange={(e) => setNewTaskName(e.target.value)}
                                onKeyDown={onKeyDown}
                                placeholder="Task name..."
                                className="h-8 text-sm"
                                disabled={submittingTask}
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={handleAddTask}
                                disabled={submittingTask}
                            >
                                {submittingTask ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Check className="h-4 w-4" />
                                )}
                            </Button>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                    setIsAddingTask(false);
                                    setNewTaskName("");
                                }}
                                disabled={submittingTask}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs text-muted-foreground hover:text-foreground h-8 px-2"
                            onClick={() => setIsAddingTask(true)}
                        >
                            <Plus className="h-3 w-3 mr-2" /> Add Task
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function MilestonesPage() {
    const params = useParams();
    const projectId = params.id as string;
    const { milestones, loading, deleteMilestone, updateMilestone, reorderMilestones } = useMilestones(projectId);
    const { taskLists, taskListsByMilestone, createTaskList, deleteTaskList, updateTaskList } = useTaskLists({
        projectId,
    });
    const { tasks, updateTask, createTask } = useTasks({ projectId });

    // View mode
    const [viewMode, setViewMode] = useState<"list" | "board">("list");

    // Drag state
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [activeTaskList, setActiveTaskList] = useState<TaskList | null>(null);
    const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null);

    // Edit dialog state
    const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editDueDate, setEditDueDate] = useState("");
    const [editColor, setEditColor] = useState("");

    // Create task list dialog
    const [creatingTaskListFor, setCreatingTaskListFor] = useState<string | null>(null);
    const [newTaskListName, setNewTaskListName] = useState("");
    const [creatingTaskList, setCreatingTaskList] = useState(false);

    // Edit task list state
    const [editingTaskList, setEditingTaskList] = useState<TaskList | null>(null);

    // Import Dialog State
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [importTargetListId, setImportTargetListId] = useState<string>("");
    const [importTargetMilestoneId, setImportTargetMilestoneId] = useState<string>("");

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

        milestones.forEach((m) => {
            const milestoneTasks = tasks.filter((t) => t.milestoneId === m.id);
            const completedTasks = milestoneTasks.filter((t) => t.status === "completed");
            const total = milestoneTasks.length;
            const completed = completedTasks.length;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
            progress[m.id] = { completed, total, percent };
        });

        return progress;
    }, [milestones, tasks]);

    // Auto-update milestone status based on progress
    useEffect(() => {
        milestones.forEach((m) => {
            const progress = milestoneProgress[m.id];
            if (!progress) return;

            // If 100% complete and not marked as complete, mark it
            if (progress.percent === 100 && progress.total > 0 && m.status !== "complete") {
                updateMilestone(m.id, { status: "complete" });
            }
            // If less than 100% and marked as complete, unmark it
            else if (progress.percent < 100 && m.status === "complete") {
                updateMilestone(m.id, { status: "incomplete" });
            }
        });
    }, [milestoneProgress, milestones, updateMilestone]);

    // Calculate progress for each task list
    const taskListProgress = useMemo(() => {
        const progress: Record<string, { completed: number; total: number; percent: number }> = {};

        taskLists.forEach((tl) => {
            const listTasks = tasks.filter((t) => t.taskListId === tl.id);
            const completedTasks = listTasks.filter((t) => t.status === "completed");
            const total = listTasks.length;
            const completed = completedTasks.length;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
            progress[tl.id] = { completed, total, percent };
        });

        return progress;
    }, [taskLists, tasks]);

    // Sort milestones
    const sortedMilestones = useMemo(
        () =>
            [...milestones].sort((a, b) => {
                // If both have order, use it
                if (typeof a.order === "number" && typeof b.order === "number") {
                    return a.order - b.order;
                }
                // Fallback to due date
                return a.dueDate.seconds - b.dueDate.seconds;
            }),
        [milestones]
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isOverdue = (date: any) => {
        return new Date() > date.toDate();
    };

    const toggleMilestone = (id: string) => {
        setExpandedMilestones((prev) => {
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

    const handleOpenImport = (listId: string, milestoneId: string) => {
        setImportTargetListId(listId);
        setImportTargetMilestoneId(milestoneId);
        setImportDialogOpen(true);
    };

    const handleAddTask = async (listId: string, name: string) => {
        const list = taskLists.find((tl) => tl.id === listId);
        if (!list) return;

        try {
            await createTask({
                name,
                projectId,
                milestoneId: list.milestoneId,
                taskListId: listId,
                status: "not_started",
                priority: "medium",
                assignees: [],
                followers: [],
                tags: [],
                isPublic: false,
                billable: false,
            });
            toast.success("Task created");
        } catch (error) {
            console.error("Error creating task:", error);
            toast.error("Failed to create task");
        }
    };

    const handleImportTasks = async (taskIds: string[]) => {
        if (!importTargetListId || !importTargetMilestoneId) return;

        try {
            for (const taskId of taskIds) {
                await updateTask(taskId, {
                    projectId,
                    milestoneId: importTargetMilestoneId,
                    taskListId: importTargetListId,
                });
            }
            toast.success(`Imported ${taskIds.length} tasks`);
        } catch {
            console.error("Failed to import tasks");
            toast.error("Failed to import tasks");
        }
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
        } catch {
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
            setExpandedMilestones((prev) => new Set([...prev, creatingTaskListFor]));
        } catch {
            toast.error("Failed to create task list");
        } finally {
            setCreatingTaskList(false);
        }
    };

    // Toggle task complete
    const toggleTaskComplete = async (task: Task) => {
        try {
            await updateTask(task.id, {
                status: task.status === "completed" ? "not_started" : "completed",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);
        } catch {
            toast.error("Failed to update task");
        }
    };

    // Handle drag start
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const taskData = active.data.current?.task as Task | undefined;
        const listData = active.data.current?.list as TaskList | undefined;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const milestoneData = active.data.current?.milestone as any;

        if (taskData) {
            setActiveTask(taskData);
        } else if (listData) {
            setActiveTaskList(listData);
        } else if (milestoneData) {
            setActiveMilestone(milestoneData);
        }
    };

    // Handle drag end - move task or list
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);
        setActiveTaskList(null);
        setActiveMilestone(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        if (activeId === overId) return;

        const activeData = active.data.current;

        // Handle Milestone Reordering (Board View)

        if (activeData?.type === "milestone") {
            const oldIndex = sortedMilestones.findIndex((m) => m.id === activeId);
            const newIndex = sortedMilestones.findIndex((m) => m.id === overId);

            if (oldIndex !== -1 && newIndex !== -1) {
                // Optimistic reorder could happen here if we had local state for order
                // For now, calculate new orders
                const newOrder = [...sortedMilestones];
                const [moved] = newOrder.splice(oldIndex, 1);
                newOrder.splice(newIndex, 0, moved);

                // Update orders in DB
                const updates = newOrder.map((m, index) => ({
                    id: m.id,
                    order: index,
                }));

                try {
                    await reorderMilestones(updates);
                    toast.success("Milestones reordered");
                } catch {
                    toast.error("Failed to reorder milestones");
                }
            }
            return;
        }

        // Handle Task List Reordering/Moving
        if (activeData?.type === "taskList") {
            const activeList = taskLists.find((tl) => tl.id === activeId);
            const overList = taskLists.find((tl) => tl.id === overId);

            // Dropping one list over another
            if (activeList && overList) {
                // Same milestone: just reorder potentially (UI sort, but for simplicity we rely on sort order update)
                // Different milestone: move the list
                if (activeList.milestoneId !== overList.milestoneId) {
                    await updateTaskList(activeId, { milestoneId: overList.milestoneId });
                    toast.success("Task list moved to new milestone");
                } else {
                    // Reordering within same milestone logic would go here
                    // For now, simple swap of order if needed, but Firestore hook sorts by order field
                    // Implementing full reorder requires updating all order fields.
                    // Let's implement basic swap for adjacent
                    // A better way is using dnd-kit's arrayMove and saving new order
                    // For this MVP, let's just support moving between milestones if dragged over a list in another milestone
                }
            }

            // Also support dropping a list onto a milestone card header (if we make milestone droppable)
            // But simply dragging list over another list is easiest
            return;
        }

        // Handle Task Moving (existing logic)
        // Find the task being dragged
        const draggedTask = tasks.find((t) => t.id === activeId);
        if (!draggedTask) return;

        // Determine the target task list
        let targetTaskListId: string | undefined;
        let targetMilestoneId: string | undefined;

        // Check if dropped on another task
        const overTask = tasks.find((t) => t.id === overId);
        if (overTask) {
            targetTaskListId = overTask.taskListId;
            targetMilestoneId = overTask.milestoneId;
        } else {
            // Dropped on a task list directly
            const overTaskList = taskLists.find((tl) => tl.id === overId);
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
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                        <p className="text-muted-foreground text-sm">Organize tasks into milestones and task lists.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setViewMode("list")}
                                className={cn(
                                    "p-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                                    viewMode === "list"
                                        ? "bg-white shadow-sm text-gray-900"
                                        : "text-gray-500 hover:text-gray-900"
                                )}
                            >
                                <ListIcon className="h-4 w-4" />
                                List
                            </button>
                            <button
                                onClick={() => setViewMode("board")}
                                className={cn(
                                    "p-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                                    viewMode === "board"
                                        ? "bg-white shadow-sm text-gray-900"
                                        : "text-gray-500 hover:text-gray-900"
                                )}
                            >
                                <LayoutGrid className="h-4 w-4" />
                                Board
                            </button>
                        </div>
                        <CreateMilestoneDialog projectId={projectId} />
                    </div>
                </div>

                {milestones.length === 0 ? (
                    <div className="text-center py-20 border rounded-lg bg-gray-50/50 border-dashed">
                        <Calendar className="h-10 w-10 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900">No milestones yet</h3>
                        <p className="text-sm text-gray-500 mt-1 mb-4">
                            Create a milestone to track major project phases.
                        </p>
                        <CreateMilestoneDialog projectId={projectId} />
                    </div>
                ) : (
                    <>
                        {viewMode === "list" ? (
                            <div className="space-y-4">
                                {sortedMilestones.map((milestone) => {
                                    const progress = milestoneProgress[milestone.id] || {
                                        completed: 0,
                                        total: 0,
                                        percent: 0,
                                    };
                                    const lists = taskListsByMilestone[milestone.id] || [];

                                    // Existing List Item Logic (moved into conditional)
                                    // Note: We need to see if we can refactor this into a component, but keeping inline to minimize diff complexity is safer for now
                                    // unless it's too huge. It is huge.
                                    // Let's keep it inline but clean it up.

                                    return (
                                        <MilestoneListItem
                                            key={milestone.id}
                                            milestone={milestone}
                                            progress={progress}
                                            lists={lists}
                                            tasks={tasks}
                                            TaskListComponent={TaskListDropZone}
                                            taskListProgress={taskListProgress}
                                            expandedMilestones={expandedMilestones}
                                            toggleMilestone={toggleMilestone}
                                            isOverdue={isOverdue(milestone.dueDate)}
                                            onToggleTaskComplete={toggleTaskComplete}
                                            onDeleteTaskList={deleteTaskList}
                                            onEditTaskList={setEditingTaskList}
                                            onEditTask={setEditingTask}
                                            onAddTask={handleAddTask}
                                            onImportTasks={handleOpenImport}
                                            onEditMilestone={openEditDialog}
                                            onDeleteMilestone={deleteMilestone}
                                            onUpdateMilestone={updateMilestone}
                                            setCreatingTaskListFor={setCreatingTaskListFor}
                                        />
                                    );
                                })}
                            </div>
                        ) : (
                            /* BOARD VIEW */
                            <div className="flex h-[calc(100vh-220px)] overflow-x-auto pb-4 gap-4 items-start">
                                <SortableContext
                                    items={sortedMilestones.map((m) => m.id)}
                                    strategy={horizontalListSortingStrategy}
                                >
                                    {sortedMilestones.map((milestone) => (
                                        <MilestoneBoardColumn
                                            key={milestone.id}
                                            milestone={milestone}
                                            progress={milestoneProgress[milestone.id]}
                                            lists={taskListsByMilestone[milestone.id] || []}
                                            tasks={tasks}
                                            TaskListComponent={TaskListDropZone}
                                            taskListProgress={taskListProgress}
                                            isOverdue={isOverdue(milestone.dueDate)}
                                            onToggleTaskComplete={toggleTaskComplete}
                                            onDeleteTaskList={deleteTaskList}
                                            onEditTaskList={setEditingTaskList}
                                            onEditTask={setEditingTask}
                                            onAddTask={handleAddTask}
                                            onImportTasks={handleOpenImport}
                                            onEditMilestone={openEditDialog}
                                            onDeleteMilestone={deleteMilestone}
                                            onUpdateMilestone={updateMilestone}
                                            setCreatingTaskListFor={setCreatingTaskListFor}
                                        />
                                    ))}
                                </SortableContext>
                            </div>
                        )}
                    </>
                )}

                {/* Drag Overlay */}
                <DragOverlay>
                    {activeTask && (
                        <div className="flex items-center gap-2 py-1.5 px-2 rounded bg-white shadow-lg border cursor-grabbing">
                            <GripVertical className="h-3.5 w-3.5 text-gray-400" />
                            {activeTask.status === "completed" ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                                <Circle className="h-4 w-4 text-gray-300" />
                            )}
                            <span className="text-sm">{activeTask.name}</span>
                        </div>
                    )}
                    {activeTaskList && (
                        <div className="border rounded-lg p-3 bg-white shadow-xl cursor-grabbing w-[300px]">
                            <div className="flex items-center gap-2 mb-2">
                                <GripVertical className="h-4 w-4 text-gray-400" />
                                <ListTodo className="h-4 w-4 text-gray-400" />
                                <span className="font-medium text-sm">{activeTaskList.name}</span>
                            </div>
                        </div>
                    )}
                    {activeMilestone && (
                        <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-white shadow-xl border cursor-grabbing w-64 rotate-2">
                            <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: activeMilestone.color || "#3b82f6" }}
                            />
                            <span className="font-semibold text-sm truncate">{activeMilestone.name}</span>
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
                            <Button variant="outline" onClick={() => setEditingMilestone(null)}>
                                Cancel
                            </Button>
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
                            <Button variant="outline" onClick={() => setCreatingTaskListFor(null)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateTaskList}
                                disabled={!newTaskListName.trim() || creatingTaskList}
                            >
                                {creatingTaskList && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <ImportTasksDialog
                    open={importDialogOpen}
                    onOpenChange={setImportDialogOpen}
                    currentProjectId={projectId}
                    targetTaskListId={importTargetListId}
                    onImport={handleImportTasks}
                />

                {editingTask && (
                    <EditTaskDialog
                        open={!!editingTask}
                        onOpenChange={(open) => !open && setEditingTask(null)}
                        task={editingTask}
                    />
                )}

                {editingTaskList && (
                    <EditTaskListDialog
                        open={!!editingTaskList}
                        onOpenChange={(open) => !open && setEditingTaskList(null)}
                        taskList={editingTaskList}
                    />
                )}
            </div>
        </DndContext>
    );
}
