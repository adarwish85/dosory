"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
    Plus,
    Search,
    Filter,
    RefreshCw,
    MoreVertical,
    Download,
    Clock,
    AlertCircle,
    CheckCircle,
    MessageSquare,
    User,
    BarChart3,
    BookOpen,
    Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useSupportTickets, usePermission, useStaff } from "@/lib/hooks";
import { SupportTicket, SupportTicketStatus, SupportTicketPriority } from "@/lib/types/support";
import { format } from "date-fns";
import { TableSkeleton } from "@/components/ui/skeleton-loaders";

const STATUS_COLORS: Record<SupportTicketStatus, string> = {
    open: "bg-blue-100 text-blue-800",
    in_progress: "bg-purple-100 text-purple-800",
    waiting_on_customer: "bg-yellow-100 text-yellow-800",
    resolved: "bg-green-100 text-green-800",
    closed: "bg-gray-100 text-gray-800",
};

const PRIORITY_ICONS: Record<SupportTicketPriority, React.ReactNode> = {
    low: <div className="h-2 w-2 rounded-full bg-gray-400" />,
    medium: <div className="h-2 w-2 rounded-full bg-blue-500" />,
    high: <div className="h-2 w-2 rounded-full bg-orange-500" />,
    critical: <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />,
};

export default function SupportPage() {
    const { can } = usePermission();
    const { staff } = useStaff();

    // Filters
    const [status, setStatus] = useState<SupportTicketStatus | "all">("all");
    const [priority, setPriority] = useState<SupportTicketPriority | "all">("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Data
    const { tickets, loading, refresh } = useSupportTickets({
        status: status === "all" ? undefined : status,
        priority: priority === "all" ? undefined : priority,
    });

    // Client-side search & filtering
    const filteredTickets = useMemo(() => {
        return tickets.filter((t) => {
            const matchesSearch =
                t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.id.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
        });
    }, [tickets, searchQuery]);

    // Formatters
    const formatDate = (date: { toDate: () => Date } | null | undefined) => {
        if (!date) return "-";
        try {
            return format(date.toDate(), "MMM dd, HH:mm");
        } catch (e) {
            return "-";
        }
    };

    const getAgentName = (id: string | null) => {
        if (!id) return "Unassigned";
        const agent = staff.find((s) => s.id === id);
        return agent ? `${agent.firstName} ${agent.lastName}` : "Unknown";
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h1 className="text-2xl font-bold tracking-tight">Support Tickets</h1>
                <div className="flex items-center gap-2">
                    {can("tickets_create") && (
                        <Link href="/dashboard/support/new">
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> New Ticket
                            </Button>
                        </Link>
                    )}
                    <Link href="/dashboard/support/reports">
                        <Button variant="outline">
                            <BarChart3 className="mr-2 h-4 w-4" /> Reports
                        </Button>
                    </Link>
                    <Link href="/dashboard/support/kb">
                        <Button variant="outline">
                            <BookOpen className="mr-2 h-4 w-4" /> Knowledge Base
                        </Button>
                    </Link>
                    <Link href="/dashboard/setup/support">
                        <Button variant="ghost" size="icon">
                            <Settings className="h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Cards (Simple V1) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="text-sm font-medium text-gray-500">Open Tickets</div>
                    <div className="text-2xl font-bold">{tickets.filter((t) => t.status === "open").length}</div>
                </div>
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="text-sm font-medium text-gray-500">My Tickets</div>
                    <div className="text-2xl font-bold">-</div>
                    {/* Simplified for now, would need userId filtering */}
                </div>
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="text-sm font-medium text-gray-500">SLA Breached</div>
                    <div className="text-2xl font-bold text-red-600">
                        {tickets.filter((t) => t.slaStatus === "breached").length}
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="text-sm font-medium text-gray-500">Avg Response</div>
                    <div className="text-2xl font-bold">4.2h</div>
                    {/* Placeholder for reports */}
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2 flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search tickets..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Select value={status} onValueChange={(v) => setStatus(v as SupportTicketStatus | "all")}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="waiting_on_customer">Waiting on Customer</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={priority} onValueChange={(v) => setPriority(v as SupportTicketPriority | "all")}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Priorities</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => refresh()}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>

                {/* Table */}
                <div className="rounded-md border bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">ID</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Assignee</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7}>
                                        <TableSkeleton rows={5} columns={7} />
                                    </TableCell>
                                </TableRow>
                            ) : filteredTickets.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                        No tickets found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTickets.map((ticket: SupportTicket) => (
                                    <TableRow key={ticket.id} className="hover:bg-muted/50">
                                        <TableCell className="font-medium text-xs text-muted-foreground">
                                            {ticket.id.slice(0, 8)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{ticket.subject}</span>
                                                {ticket.slaStatus === "breached" && (
                                                    <span className="text-xs text-red-600 font-medium">
                                                        SLA Breached
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={STATUS_COLORS[ticket.status]}>
                                                {ticket.status.replace(/_/g, " ")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {PRIORITY_ICONS[ticket.priority]}
                                                <span className="capitalize">{ticket.priority}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                                                    {staff.find(
                                                        (s: { id: string; firstName?: string }) =>
                                                            s.id === ticket.assignedAgentId
                                                    )?.firstName?.[0] || "?"}
                                                </div>
                                                <span>
                                                    {staff.find(
                                                        (s: { id: string; firstName?: string }) =>
                                                            s.id === ticket.assignedAgentId
                                                    )?.firstName || "Unassigned"}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {format(ticket.createdAt.toDate(), "MMM d, h:mm a")}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <Link href={`/dashboard/support/${ticket.id}`}>
                                                        <DropdownMenuItem>View Details</DropdownMenuItem>
                                                    </Link>
                                                    {can("tickets_edit") && (
                                                        <DropdownMenuItem>Edit Properties</DropdownMenuItem>
                                                    )}
                                                    {can("tickets_close") && ticket.status !== "closed" && (
                                                        <DropdownMenuItem className="text-red-600">
                                                            Close Ticket
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
