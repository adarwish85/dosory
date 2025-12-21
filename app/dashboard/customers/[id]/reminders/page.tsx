"use client";

import { useCustomer } from "@/components/dashboard/customers/customer-context";
import { useReminders } from "@/lib/hooks/use-customer-data";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, RefreshCw, Loader2, Bell, BellOff, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, isPast, isToday } from "date-fns";

export default function RemindersPage() {
    const { customer, loading: customerLoading, customerId } = useCustomer();
    const { reminders, loading: remindersLoading, deleteReminder } = useReminders({ customerId: customerId || undefined });

    if (customerLoading || remindersLoading) {
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
            return format(date, "dd/MM/yyyy HH:mm");
        } catch {
            return "-";
        }
    };

    const getDateStatus = (timestamp: any) => {
        if (!timestamp) return "upcoming";
        try {
            const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
            if (isPast(date) && !isToday(date)) return "overdue";
            if (isToday(date)) return "today";
            return "upcoming";
        } catch {
            return "upcoming";
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            overdue: "bg-red-50 text-red-600 border-red-100",
            today: "bg-orange-50 text-orange-600 border-orange-100",
            upcoming: "bg-blue-50 text-blue-600 border-blue-100",
        };
        return styles[status] || "bg-gray-50 text-gray-600 border-gray-100";
    };

    const formatStatus = (status: string) => {
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    // Sort reminders by date status
    const sortedReminders = [...reminders].sort((a, b) => {
        const statusOrder = { overdue: 0, today: 1, upcoming: 2 };
        const statusA = getDateStatus(a.date);
        const statusB = getDateStatus(b.date);
        return (statusOrder[statusA as keyof typeof statusOrder] || 2) - (statusOrder[statusB as keyof typeof statusOrder] || 2);
    });

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Reminders</h2>

            <Button className="bg-gray-900 text-white hover:bg-gray-800">
                <Plus className="mr-2 h-4 w-4" /> Set Reminder
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
                        <Button variant="outline" size="icon"><RefreshCw className="h-4 w-4" /></Button>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input placeholder="Search reminders..." className="pl-9" />
                    </div>
                </div>

                <div className="border rounded-md bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Title</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Description</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Date</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Status</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedReminders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        No reminders found for {customer?.company || "this customer"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedReminders.map((reminder) => {
                                    const dateStatus = getDateStatus(reminder.date);
                                    return (
                                        <TableRow key={reminder.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {reminder.isNotified ? (
                                                        <BellOff className="h-4 w-4 text-gray-400" />
                                                    ) : (
                                                        <Bell className="h-4 w-4 text-blue-500" />
                                                    )}
                                                    <span className="font-medium">{reminder.title}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-500 max-w-xs truncate">
                                                {reminder.description || "-"}
                                            </TableCell>
                                            <TableCell>{formatDate(reminder.date)}</TableCell>
                                            <TableCell>
                                                <Badge className={`${getStatusBadge(dateStatus)} font-normal`}>
                                                    {formatStatus(dateStatus)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => deleteReminder(reminder.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
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
