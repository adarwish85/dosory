"use client";

import { useCustomer } from "@/components/dashboard/customers/customer-context";
import { useTasks } from "@/lib/hooks/use-projects";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, RefreshCw, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";

export default function TasksPage() {
    const { customer, loading: customerLoading, customerId } = useCustomer();
    const { tasks, loading: tasksLoading } = useTasks({ customerId: customerId || undefined });

    if (customerLoading || tasksLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "-";
        try {
            const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
            return format(date, "dd/MM/yyyy");
        } catch {
            return "-";
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            not_started: "bg-gray-50 text-gray-600 border-gray-100",
            in_progress: "bg-blue-50 text-blue-600 border-blue-100",
            testing: "bg-purple-50 text-purple-600 border-purple-100",
            awaiting_feedback: "bg-orange-50 text-orange-600 border-orange-100",
            complete: "bg-green-50 text-green-600 border-green-100",
        };
        return styles[status] || "bg-gray-50 text-gray-600 border-gray-100";
    };

    const getPriorityBadge = (priority: string) => {
        const styles: Record<string, string> = {
            low: "bg-gray-50 text-gray-600 border-gray-100",
            medium: "bg-blue-50 text-blue-600 border-blue-100",
            high: "bg-orange-50 text-orange-600 border-orange-100",
            urgent: "bg-red-50 text-red-600 border-red-100",
        };
        return styles[priority] || "bg-gray-50 text-gray-600 border-gray-100";
    };

    const formatStatus = (status: string) => {
        return status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Tasks</h2>

            <Button className="bg-gray-900 text-white hover:bg-gray-800">
                <Plus className="mr-2 h-4 w-4" /> New Task
            </Button>

            <div className="space-y-4">
                <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Select defaultValue="25">
                            <SelectTrigger className="w-[70px]">
                                <SelectValue placeholder="25" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="25">25</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline">Export</Button>
                        <Button variant="outline" size="icon"><RefreshCw className="h-4 w-4" /></Button>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input placeholder="Search..." className="pl-9" />
                    </div>
                </div>

                <div className="border rounded-md bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">#</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Name</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Status</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Start Date</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Due Date</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Priority</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tasks.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                        No tasks found for {customer?.company || "this customer"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tasks.map((task, index) => (
                                    <TableRow key={task.id}>
                                        <TableCell className="text-gray-500">{index + 1}</TableCell>
                                        <TableCell className="font-medium text-blue-600 hover:underline cursor-pointer">
                                            <Link href={`/dashboard/tasks/${task.id}`}>
                                                {task.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`${getStatusBadge(task.status)} font-normal`}>
                                                {formatStatus(task.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{formatDate(task.startDate)}</TableCell>
                                        <TableCell>{formatDate(task.dueDate)}</TableCell>
                                        <TableCell>
                                            <Badge className={`${getPriorityBadge(task.priority)} font-normal`}>
                                                {formatStatus(task.priority)}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
