"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, RefreshCw, LayoutGrid, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useTasks } from "@/lib/hooks";
import type { TaskStatus, TaskPriority } from "@/lib/types";
import { format } from "date-fns";
import Link from "next/link";

const statusColors: Record<TaskStatus, { bg: string; text: string }> = {
    not_started: { bg: "bg-gray-100", text: "text-gray-700" },
    in_progress: { bg: "bg-blue-100", text: "text-blue-700" },
    testing: { bg: "bg-purple-100", text: "text-purple-700" },
    awaiting_feedback: { bg: "bg-orange-100", text: "text-orange-700" },
    completed: { bg: "bg-green-100", text: "text-green-700" },
};

const statusLabels: Record<TaskStatus, string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    testing: "Testing",
    awaiting_feedback: "Awaiting Feedback",
    completed: "Completed",
};

const priorityColors: Record<TaskPriority, { bg: string; text: string }> = {
    low: { bg: "bg-gray-100", text: "text-gray-600" },
    medium: { bg: "bg-blue-100", text: "text-blue-600" },
    high: { bg: "bg-orange-100", text: "text-orange-600" },
    urgent: { bg: "bg-red-100", text: "text-red-600" },
};

export default function TasksPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const { tasks, loading, taskStats, updateTaskStatus } = useTasks();

    const filteredTasks = tasks.filter(task =>
        task.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (timestamp: { toDate: () => Date } | null | undefined) => {
        if (!timestamp) return "-";
        try {
            return format(timestamp.toDate(), "dd/MM/yyyy");
        } catch {
            return "-";
        }
    };

    const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
        await updateTaskStatus(taskId, newStatus);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
                    <a href="#" className="text-sm text-blue-600 hover:underline">Tasks Overview →</a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {(["not_started", "in_progress", "testing", "awaiting_feedback", "completed"] as TaskStatus[]).map(status => {
                        const colors = statusColors[status];
                        const count = taskStats[status] || 0;
                        return (
                            <div key={status} className="bg-white p-4 rounded-md border shadow-sm">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-gray-900">{count}</span>
                                    <span className={`font-medium ${colors.text}`}>{statusLabels[status]}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/tasks/new">
                        <Button className="bg-gray-900 text-white hover:bg-gray-800 rounded-md">
                            <Plus className="mr-2 h-4 w-4" /> New Task
                        </Button>
                    </Link>
                    <div className="flex items-center border rounded-md bg-white">
                        <Button variant="ghost" size="icon" className="h-9 w-9 bg-gray-100 rounded-r-none border-r"><LayoutGrid className="h-4 w-4 text-gray-900" /></Button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="text-gray-700 bg-white">
                        <Filter className="mr-2 h-4 w-4" /> Not Assigned
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Select defaultValue="25">
                            <SelectTrigger className="w-[70px]">
                                <SelectValue placeholder="25" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline">Export</Button>
                        <Button variant="outline">Bulk Actions</Button>
                        <Button variant="outline" size="icon"><RefreshCw className="h-4 w-4" /></Button>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="border rounded-md bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                <TableHead className="w-12 text-center bg-gray-100/50"><Checkbox /></TableHead>
                                <TableHead className="w-10 text-gray-900 font-semibold bg-gray-100/50">#</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Name</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Status</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Start Date</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Due Date</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Priority</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTasks.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                        {searchQuery ? "No tasks match your search." : "No tasks found. Create your first one!"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTasks.map((task, index) => {
                                    const statusColor = statusColors[task.status];
                                    const priorityColor = priorityColors[task.priority];
                                    return (
                                        <TableRow key={task.id}>
                                            <TableCell className="text-center"><Checkbox /></TableCell>
                                            <TableCell className="font-medium text-gray-500">{index + 1}</TableCell>
                                            <TableCell className="font-medium text-gray-900">{task.name}</TableCell>
                                            <TableCell>
                                                <Select
                                                    value={task.status}
                                                    onValueChange={(value) => handleStatusChange(task.id, value as TaskStatus)}
                                                >
                                                    <SelectTrigger className="h-7 text-xs font-normal w-36">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="not_started">Not Started</SelectItem>
                                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                                        <SelectItem value="testing">Testing</SelectItem>
                                                        <SelectItem value="awaiting_feedback">Awaiting Feedback</SelectItem>
                                                        <SelectItem value="completed">Completed</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-gray-500">{formatDate(task.startDate)}</TableCell>
                                            <TableCell className="text-gray-500">{formatDate(task.dueDate)}</TableCell>
                                            <TableCell>
                                                <Badge className={`${priorityColor.bg} ${priorityColor.text} border-0`}>
                                                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
