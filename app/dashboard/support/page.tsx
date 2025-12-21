"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, RefreshCw, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useTickets } from "@/lib/hooks";
import type { TicketStatus, TicketPriority } from "@/lib/types";
import { format } from "date-fns";
import Link from "next/link";

const statusColors: Record<TicketStatus, { bg: string; text: string; border: string }> = {
    open: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
    in_progress: { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
    answered: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
    on_hold: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
    closed: { bg: "bg-sky-50", text: "text-sky-600", border: "border-sky-200" },
};

const statusLabels: Record<TicketStatus, string> = {
    open: "Open",
    in_progress: "In Progress",
    answered: "Answered",
    on_hold: "On Hold",
    closed: "Closed",
};

const priorityColors: Record<TicketPriority, { bg: string; text: string }> = {
    low: { bg: "bg-gray-100", text: "text-gray-600" },
    medium: { bg: "bg-blue-100", text: "text-blue-600" },
    high: { bg: "bg-red-100", text: "text-red-600" },
};

export default function SupportPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
    const { tickets, loading, ticketStats } = useTickets({ status: statusFilter });

    const filteredTickets = tickets.filter(ticket =>
        ticket.subject?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (timestamp: { toDate: () => Date } | null | undefined) => {
        if (!timestamp) return "-";
        try {
            return format(timestamp.toDate(), "dd/MM/yyyy HH:mm");
        } catch {
            return "-";
        }
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
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold text-gray-900">Support Tickets</h2>
                    </div>
                    <Button className="bg-gray-900 text-white hover:bg-gray-800 rounded-md">
                        <Plus className="mr-2 h-4 w-4" /> New Ticket
                    </Button>
                </div>

                {/* Status Tabs */}
                <div className="flex flex-wrap gap-2">
                    {(["open", "in_progress", "answered", "on_hold", "closed"] as TicketStatus[]).map(status => {
                        const colors = statusColors[status];
                        const count = ticketStats[status] || 0;
                        const isActive = statusFilter === status;
                        return (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(isActive ? "all" : status)}
                                className={`border rounded-full px-3 py-1 text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors
                                    ${isActive ? `${colors.bg} ${colors.text} ${colors.border}` : "bg-white text-gray-500 hover:bg-gray-50"}`}
                            >
                                <span className="font-bold text-gray-900">{count}</span> {statusLabels[status]}
                            </button>
                        );
                    })}
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
                                <TableHead className="w-12 text-center"><Checkbox /></TableHead>
                                <TableHead className="w-10 font-semibold text-gray-900">#</TableHead>
                                <TableHead className="font-semibold text-gray-900">Subject</TableHead>
                                <TableHead className="font-semibold text-gray-900">Status</TableHead>
                                <TableHead className="font-semibold text-gray-900">Priority</TableHead>
                                <TableHead className="font-semibold text-gray-900">Last Reply</TableHead>
                                <TableHead className="font-semibold text-gray-900">Created</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTickets.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                        {searchQuery ? "No tickets match your search." : "No tickets found."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTickets.map((ticket, index) => {
                                    const statusColor = statusColors[ticket.status];
                                    const priorityColor = priorityColors[ticket.priority];
                                    return (
                                        <TableRow key={ticket.id}>
                                            <TableCell className="text-center"><Checkbox /></TableCell>
                                            <TableCell className="font-medium text-gray-500">{index + 1}</TableCell>
                                            <TableCell className="font-medium">
                                                <Link href={`/dashboard/support/${ticket.id}`} className="text-blue-600 hover:underline">
                                                    {ticket.subject}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`${statusColor.bg} ${statusColor.text} ${statusColor.border} border`}>
                                                    {statusLabels[ticket.status]}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`${priorityColor.bg} ${priorityColor.text} border-0`}>
                                                    {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-gray-500">{formatDate(ticket.lastReply)}</TableCell>
                                            <TableCell className="text-gray-500">{formatDate(ticket.createdAt)}</TableCell>
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
