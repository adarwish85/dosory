"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTasks } from "@/lib/hooks/use-projects";
import { useLead } from "@/lib/hooks/use-leads";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, CheckSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CreateTaskDialog } from "@/components/dashboard/tasks/create-task-dialog";
import { TaskStatus, TaskPriority } from "@/lib/types";

const statusColors: Record<TaskStatus, { bg: string; text: string; border: string }> = {
    to_do: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
    in_progress: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
    blocked: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
    done: { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
};

const statusLabels: Record<TaskStatus, string> = {
    to_do: "To Do",
    in_progress: "In Progress",
    blocked: "Blocked",
    done: "Done",
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

    // Fetch tasks related to this lead
    const { tasks, loading } = useTasks({
        relatedTo: { type: "lead", id: leadId }
    });

    const [isCreateOpen, setIsCreateOpen] = useState(false);

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
                <h2 className="text-xl font-bold">Tasks</h2>
                <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Create Task
                </Button>
            </div>

            <div className="border rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="font-semibold text-gray-900">Task</TableHead>
                            <TableHead className="font-semibold text-gray-900">Due Date</TableHead>
                            <TableHead className="font-semibold text-gray-900">Priority</TableHead>
                            <TableHead className="font-semibold text-gray-900">Status</TableHead>
                            <TableHead className="font-semibold text-gray-900">Assignees</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tasks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2">
                                        <CheckSquare className="h-8 w-8 text-gray-300" />
                                        <p>No tasks found for this lead.</p>
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
                                        <TableCell className={`capitalize font-medium ${priorityColor.text}`}>
                                            {task.priority}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`${statusColor.bg} ${statusColor.text} ${statusColor.border} border`}>
                                                {statusLabels[task.status] || task.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-gray-500 text-sm">
                                            {task.assignees?.length || 0} users
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
        </div>
    );
}
