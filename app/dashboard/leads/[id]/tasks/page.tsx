"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTasks } from "@/lib/hooks/use-projects";
import { useLead } from "@/lib/hooks/use-leads";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, CheckSquare, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CreateTaskDialog } from "@/components/dashboard/tasks/create-task-dialog";
import { TaskStatus, TaskPriority, Task } from "@/lib/types";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

const statusColors: Record<TaskStatus, { bg: string; text: string; border: string }> = {
    to_do: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
    in_progress: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
    blocked: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
    done: { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
};

const priorityColors: Record<TaskPriority, { text: string }> = {
    low: { text: "text-gray-500" },
    medium: { text: "text-blue-500" },
    high: { text: "text-orange-500" },
    urgent: { text: "text-red-500" },
};

export default function LeadTasksPage() {
    const params = useParams();
    const leadId = params?.id as string;
    const { lead } = useLead(leadId);
    const { t } = useTranslation();

    // Fetch tasks related to this lead
    const { tasks, loading, deleteTask, updateTask } = useTasks({
        relatedTo: { type: "lead", id: leadId }
    });

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "-";
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return format(date, "dd/MM/yyyy");
        } catch {
            return "-";
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">{t("leads.tasks.title")}</h2>
                <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> {t("leads.tasks.createTask")}
                </Button>
            </div>

            <div className="border rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="font-semibold text-gray-900">{t("leads.tasks.table.task")}</TableHead>
                            <TableHead className="font-semibold text-gray-900">{t("leads.tasks.table.dueDate")}</TableHead>
                            <TableHead className="font-semibold text-gray-900">{t("leads.tasks.table.priority")}</TableHead>
                            <TableHead className="font-semibold text-gray-900">{t("leads.tasks.table.status")}</TableHead>
                            <TableHead className="font-semibold text-gray-900">{t("leads.tasks.table.assignees")}</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tasks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2">
                                        <CheckSquare className="h-8 w-8 text-gray-300" />
                                        <p>{t("leads.tasks.empty")}</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            tasks.map((task) => {
                                const statusColor = statusColors[task.status] || statusColors.to_do;
                                const priorityColor = priorityColors[task.priority] || priorityColors.medium;

                                return (
                                    <TableRow key={task.id} className="group hover:bg-gray-50">
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span className="text-gray-900">{task.name}</span>
                                                {task.description && (
                                                    <span className="text-xs text-gray-500 truncate max-w-[200px]">
                                                        {task.description}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-500">{formatDate(task.dueDate)}</TableCell>
                                        <TableCell className={`font-medium ${priorityColor.text}`}>
                                            {t(`leads.tasks.priority.${task.priority}`)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`${statusColor.bg} ${statusColor.text} ${statusColor.border} border`}>
                                                {t(`leads.tasks.status.${task.status}`)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-gray-500 text-sm">
                                            {t("leads.tasks.usersCount", { count: task.assignees?.length || 0 })}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => setEditingTask(task)}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        {t("common.edit")}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-red-600"
                                                        onClick={() => setDeletingTaskId(task.id)}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        {t("common.delete")}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <CreateTaskDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                leadId={leadId}
                leadName={lead?.name}
            />

            {/* Edit Task Dialog */}
            {editingTask && (
                <CreateTaskDialog
                    open={!!editingTask}
                    onOpenChange={(open) => !open && setEditingTask(null)}
                    leadId={leadId}
                    leadName={lead?.name}
                    initialData={editingTask}
                    taskId={editingTask.id}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletingTaskId} onOpenChange={(open) => !open && setDeletingTaskId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("leads.tasks.deleteTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("leads.tasks.deleteDescription")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={async () => {
                                if (deletingTaskId) {
                                    try {
                                        await deleteTask(deletingTaskId);
                                        toast.success(t("leads.tasks.deleteSuccess"));
                                        setDeletingTaskId(null);
                                    } catch (error: any) {
                                        toast.error(t("leads.tasks.deleteError"), { description: error.message });
                                    }
                                }
                            }}
                        >
                            {t("common.delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
