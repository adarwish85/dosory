"use client";

import { useCustomer } from "@/components/dashboard/customers/customer-context";
import { useTickets } from "@/lib/hooks/use-support";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, RefreshCw, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";

export default function TicketsPage() {
    const { customer, loading: customerLoading, customerId } = useCustomer();
    const { tickets, loading: ticketsLoading } = useTickets({ customerId: customerId || undefined });

    if (customerLoading || ticketsLoading) {
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

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            open: "bg-blue-50 text-blue-600 border-blue-100",
            in_progress: "bg-orange-50 text-orange-600 border-orange-100",
            answered: "bg-green-50 text-green-600 border-green-100",
            on_hold: "bg-yellow-50 text-yellow-600 border-yellow-100",
            closed: "bg-gray-50 text-gray-500 border-gray-100",
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
            <h2 className="text-xl font-bold text-gray-900">Tickets</h2>

            <Button className="bg-gray-900 text-white hover:bg-gray-800">
                <Plus className="mr-2 h-4 w-4" /> Open New Ticket
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
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Subject</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Department</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Priority</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Last Reply</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tickets.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                        No tickets found for {customer?.company || "this customer"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tickets.map((ticket) => (
                                    <TableRow key={ticket.id}>
                                        <TableCell className="text-gray-500">#{ticket.id.slice(-6).toUpperCase()}</TableCell>
                                        <TableCell className="font-medium text-blue-600 hover:underline cursor-pointer">
                                            <Link href={`/dashboard/support/${ticket.id}`}>
                                                {ticket.subject}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{ticket.departmentId || "-"}</TableCell>
                                        <TableCell>
                                            <Badge className={`${getPriorityBadge(ticket.priority)} font-normal`}>
                                                {formatStatus(ticket.priority)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{formatDate(ticket.lastReply)}</TableCell>
                                        <TableCell>
                                            <Badge className={`${getStatusBadge(ticket.status)} font-normal`}>
                                                {formatStatus(ticket.status)}
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
