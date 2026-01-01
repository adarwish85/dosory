"use client";

import { Milestone, Task, TaskList } from "@/lib/types";
import { format } from "date-fns";
import {
    Calendar,
    ChevronDown,
    ChevronRight,
    FolderPlus,
    GripVertical,
    ListTodo,
    MoreHorizontal,
    Pencil,
    Plus,
    Trash,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
// We need to import TaskListDropZone from page.tsx? No, that's circular or impossible if it's not exported.
// We should probably move TaskListDropZone to a separate file too.
// For now, let's assume TaskListDropZone is passed as a prop or slot?
// Or we move TaskListDropZone to this file as well.
// Checking page.tsx: TaskListDropZone is defined in page.tsx lines ~139.
// I should move TaskListDropZone here too.

// Let's define the interface for props clearly.

interface MilestoneItemProps {
    milestone: Milestone;
    progress: { completed: number; total: number; percent: number };
    lists: TaskList[];
    tasks: Task[]; // All tasks, to be filtered
    taskListProgress: Record<string, { completed: number; total: number; percent: number }>;
    isOverdue: boolean;
    isExpanded?: boolean;
    onToggleExpand?: (id: string) => void;
    // For passing raw sets/functions if needed, but we used isExpanded above.
    // However, the page is passing expandedMilestones Set and toggleMilestone function.
    // Let's stick to the props we defined: isExpanded and onToggleExpand.
    // But page.tsx passes `expandedMilestones={expandedMilestones}` and `toggleMilestone={toggleMilestone}`.
    // I should align them.
    expandedMilestones?: Set<string>;
    toggleMilestone?: (id: string) => void;

    // Actions
    onToggleTaskComplete: (task: Task) => void;
    onDeleteTaskList: (id: string) => void;
    onEditTaskList: (list: TaskList) => void;
    onEditTask: (task: Task) => void;
    onAddTask: (listId: string, name: string) => Promise<void>;
    onImportTasks: (listId: string, milestoneId: string) => void;
    onEditMilestone: (m: Milestone) => void;
    onDeleteMilestone: (id: string) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onUpdateMilestone: (id: string, data: any) => void;
    setCreatingTaskListFor: (id: string) => void;

    // Components
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TaskListComponent: React.ComponentType<any>;
}

export function MilestoneListItem({
    milestone,
    progress,
    lists,
    tasks,
    taskListProgress,
    isOverdue,
    isExpanded,
    onToggleExpand,
    expandedMilestones,
    toggleMilestone,
    TaskListComponent,
    ...actions
}: MilestoneItemProps) {
    const isCompleted = milestone.status === "complete";
    // Derived state if using the Set/Function directly
    const expanded = isExpanded ?? (expandedMilestones ? expandedMilestones.has(milestone.id) : false);
    const handleToggle = onToggleExpand ?? toggleMilestone;

    return (
        <Card className={cn("transition-all", isCompleted ? "bg-gray-50/50 border-gray-200" : "bg-white")}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => handleToggle?.(milestone.id)}
                        >
                            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                        <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: milestone.color || "#3b82f6" }}
                        />
                        <div className="flex-1 min-w-0">
                            <CardTitle className="text-base font-semibold truncate">{milestone.name}</CardTitle>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className={cn("flex items-center gap-1", isOverdue && "text-red-600")}>
                                    <Calendar className="h-3 w-3" />
                                    {format(milestone.dueDate.toDate(), "MMM d, yyyy")}
                                </span>
                                <span>
                                    {progress.completed}/{progress.total} tasks
                                </span>
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
                            variant={isCompleted ? "default" : isOverdue ? "destructive" : "secondary"}
                            className={isCompleted ? "bg-green-500" : ""}
                        >
                            {isCompleted ? "Complete" : isOverdue ? "Overdue" : `${progress.percent}%`}
                        </Badge>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => actions.onEditMilestone(milestone)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => actions.setCreatingTaskListFor(milestone.id)}>
                                    <FolderPlus className="mr-2 h-4 w-4" /> Add Task List
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() =>
                                        actions.onUpdateMilestone(milestone.id, {
                                            status: isCompleted ? "incomplete" : "complete",
                                        })
                                    }
                                >
                                    {isCompleted ? "Mark Incomplete" : "Mark Complete"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() =>
                                        confirm("Delete milestone?") && actions.onDeleteMilestone(milestone.id)
                                    }
                                >
                                    <Trash className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="mt-3 ml-11">
                    <Progress
                        value={isCompleted ? 100 : progress.percent}
                        className="h-1.5"
                        style={
                            {
                                "--progress-foreground": milestone.color || "#3b82f6",
                            } as React.CSSProperties
                        }
                    />
                </div>
            </CardHeader>

            {expanded && (
                <CardContent className="pt-0 ml-11">
                    {lists.length === 0 ? (
                        <div className="text-center py-6 border rounded-lg border-dashed bg-gray-50/50">
                            <FolderPlus className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm text-muted-foreground mb-2">No task lists yet</p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => actions.setCreatingTaskListFor(milestone.id)}
                            >
                                <Plus className="mr-2 h-4 w-4" /> Create Task List
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <SortableContext items={lists.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                                {lists.map((list) => {
                                    const listProgress = taskListProgress[list.id] || {
                                        completed: 0,
                                        total: 0,
                                        percent: 0,
                                    };
                                    // Filter tasks for this list
                                    const listTasks = tasks.filter((t) => t.taskListId === list.id);

                                    return (
                                        <TaskListComponent
                                            key={list.id}
                                            list={list}
                                            listTasks={listTasks}
                                            milestone={milestone}
                                            taskListProgress={listProgress}
                                            onDeleteTaskList={actions.onDeleteTaskList}
                                            onToggleComplete={actions.onToggleTaskComplete}
                                            onImportTasks={(listId: string) =>
                                                actions.onImportTasks(listId, milestone.id)
                                            }
                                            onAddTask={actions.onAddTask}
                                            onEditTask={actions.onEditTask}
                                            onEditTaskList={actions.onEditTaskList}
                                        />
                                    );
                                })}
                            </SortableContext>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}

export function MilestoneBoardColumn({
    milestone,
    progress,
    lists,
    tasks,
    taskListProgress,
    isOverdue,
    TaskListComponent,
    ...actions
}: MilestoneItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: milestone.id,
        data: { milestone, type: "milestone" },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const isCompleted = milestone.status === "complete";

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex-shrink-0 w-80 flex flex-col h-full bg-gray-100/50 rounded-xl border border-gray-200 shadow-sm",
                isDragging && "opacity-50 ring-2 ring-primary"
            )}
        >
            <div className="p-3 border-b bg-white rounded-t-xl sticky top-0 z-10 group">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                        <button
                            {...attributes}
                            {...listeners}
                            className="cursor-grab hover:text-gray-700 opacity-50 group-hover:opacity-100 transition-opacity"
                        >
                            <GripVertical className="h-4 w-4" />
                        </button>
                        <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: milestone.color || "#3b82f6" }}
                        />
                        <h3 className="font-semibold text-sm truncate" title={milestone.name}>
                            {milestone.name}
                        </h3>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <MoreHorizontal className="h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => actions.onEditMilestone(milestone)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => actions.setCreatingTaskListFor(milestone.id)}>
                                <FolderPlus className="mr-2 h-4 w-4" /> Add List
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() =>
                                    actions.onUpdateMilestone(milestone.id, {
                                        status: isCompleted ? "incomplete" : "complete",
                                    })
                                }
                            >
                                {isCompleted ? "Mark Incomplete" : "Mark Complete"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => confirm("Delete milestone?") && actions.onDeleteMilestone(milestone.id)}
                            >
                                <Trash className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className={cn(isOverdue && !isCompleted && "text-red-600 font-medium")}>
                        {format(milestone.dueDate.toDate(), "MMM d")}
                    </span>
                    <Badge variant={isCompleted ? "default" : "secondary"} className="text-[10px] h-5 px-1.5">
                        {isCompleted ? "Done" : `${progress?.percent || 0}%`}
                    </Badge>
                </div>
                <Progress
                    value={isCompleted ? 100 : progress?.percent || 0}
                    className="h-1 mt-2"
                    style={{ "--progress-foreground": milestone.color || "#3b82f6" } as React.CSSProperties}
                />
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-3 min-h-0 scrollbar-thin scrollbar-thumb-gray-300">
                <SortableContext items={lists.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                    {lists.map((list) => {
                        const listProgress = taskListProgress[list.id] || {
                            completed: 0,
                            total: 0,
                            percent: 0,
                        };
                        const listTasks = tasks.filter((t) => t.taskListId === list.id);

                        return (
                            <TaskListComponent
                                key={list.id}
                                list={list}
                                listTasks={listTasks}
                                milestone={milestone}
                                taskListProgress={listProgress}
                                onDeleteTaskList={actions.onDeleteTaskList}
                                onToggleComplete={actions.onToggleTaskComplete}
                                onImportTasks={(listId: string) => actions.onImportTasks(listId, milestone.id)}
                                onAddTask={actions.onAddTask}
                                onEditTask={actions.onEditTask}
                                onEditTaskList={actions.onEditTaskList}
                            />
                        );
                    })}
                </SortableContext>

                <Button
                    variant="ghost"
                    className="w-full justify-start text-xs text-gray-500 hover:text-gray-900"
                    onClick={() => actions.setCreatingTaskListFor(milestone.id)}
                >
                    <Plus className="h-3 w-3 mr-1" /> Add List
                </Button>
            </div>
        </div>
    );
}
