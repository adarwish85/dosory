"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    LifeBuoy,
    Search,
    RefreshCw,
    Loader2,
    ExternalLink,
    MessageSquare,
    Building2,
    Clock,
    AlertCircle,
} from "lucide-react";
import {
    useAllPlatformTickets,
    TICKET_CATEGORIES,
    TICKET_PRIORITIES,
    TICKET_STATUSES,
    TicketStatus,
    TicketPriority,
    TicketCategory,
} from "@/lib/hooks/use-platform-tickets";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export default function PlatformTicketsPage() {
    const { tickets, loading, getStatusCounts } = useAllPlatformTickets();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
    const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");
    const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "all">("all");

    const statusCounts = getStatusCounts();

    const filteredTickets = useMemo(() => {
        return tickets.filter((ticket) => {
            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesSearch =
                    ticket.subject.toLowerCase().includes(query) ||
                    ticket.description.toLowerCase().includes(query) ||
                    ticket.orgName.toLowerCase().includes(query) ||
                    ticket.createdBy.name.toLowerCase().includes(query);
                if (!matchesSearch) return false;
            }

            // Status filter
            if (statusFilter !== "all" && ticket.status !== statusFilter) return false;

            // Priority filter
            if (priorityFilter !== "all" && ticket.priority !== priorityFilter) return false;

            // Category filter
            if (categoryFilter !== "all" && ticket.category !== categoryFilter) return false;

            return true;
        });
    }, [tickets, searchQuery, statusFilter, priorityFilter, categoryFilter]);

    const getStatusBadge = (status: TicketStatus) => {
        const config = TICKET_STATUSES.find((s) => s.value === status);
        return <Badge className={cn("font-normal", config?.color)}>{config?.label || status}</Badge>;
    };

    const getPriorityBadge = (priority: TicketPriority) => {
        const config = TICKET_PRIORITIES.find((p) => p.value === priority);
        return (
            <Badge variant="outline" className={cn("font-normal", config?.color)}>
                {config?.label || priority}
            </Badge>
        );
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
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <LifeBuoy className="h-6 w-6 text-blue-600" />
                    <h1 className="text-2xl font-semibold text-gray-900">Platform Tickets</h1>
                </div>
            </div>

            {/* Status Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div
                    className={cn(
                        "bg-white rounded-lg border p-4 cursor-pointer transition-shadow hover:shadow-md",
                        statusFilter === "all" && "ring-2 ring-blue-500"
                    )}
                    onClick={() => setStatusFilter("all")}
                >
                    <div className="text-2xl font-bold text-gray-900">{statusCounts.total}</div>
                    <div className="text-sm text-gray-500">Total Tickets</div>
                </div>
                <div
                    className={cn(
                        "bg-white rounded-lg border p-4 cursor-pointer transition-shadow hover:shadow-md",
                        statusFilter === "open" && "ring-2 ring-blue-500"
                    )}
                    onClick={() => setStatusFilter("open")}
                >
                    <div className="text-2xl font-bold text-blue-600">{statusCounts.open}</div>
                    <div className="text-sm text-gray-500">Open</div>
                </div>
                <div
                    className={cn(
                        "bg-white rounded-lg border p-4 cursor-pointer transition-shadow hover:shadow-md",
                        statusFilter === "in_progress" && "ring-2 ring-blue-500"
                    )}
                    onClick={() => setStatusFilter("in_progress")}
                >
                    <div className="text-2xl font-bold text-purple-600">{statusCounts.in_progress}</div>
                    <div className="text-sm text-gray-500">In Progress</div>
                </div>
                <div
                    className={cn(
                        "bg-white rounded-lg border p-4 cursor-pointer transition-shadow hover:shadow-md",
                        statusFilter === "resolved" && "ring-2 ring-blue-500"
                    )}
                    onClick={() => setStatusFilter("resolved")}
                >
                    <div className="text-2xl font-bold text-green-600">{statusCounts.resolved}</div>
                    <div className="text-sm text-gray-500">Resolved</div>
                </div>
                <div
                    className={cn(
                        "bg-white rounded-lg border p-4 cursor-pointer transition-shadow hover:shadow-md",
                        statusFilter === "closed" && "ring-2 ring-blue-500"
                    )}
                    onClick={() => setStatusFilter("closed")}
                >
                    <div className="text-2xl font-bold text-gray-600">{statusCounts.closed}</div>
                    <div className="text-sm text-gray-500">Closed</div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search tickets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as TicketPriority | "all")}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        {TICKET_PRIORITIES.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                                {p.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as TicketCategory | "all")}>
                    <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {TICKET_CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                                {c.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => window.location.reload()}>
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>

            {/* Tickets Table */}
            {filteredTickets.length === 0 ? (
                <div className="bg-white rounded-lg border p-10 text-center">
                    <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {tickets.length === 0 ? "No tickets yet" : "No matching tickets"}
                    </h3>
                    <p className="text-gray-500">
                        {tickets.length === 0
                            ? "When tenants submit support tickets, they'll appear here."
                            : "Try adjusting your filters or search query."}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-lg border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50">
                                <TableHead className="w-[300px]">Subject</TableHead>
                                <TableHead>Tenant</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Replies</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTickets.map((ticket) => (
                                <TableRow key={ticket.id} className="hover:bg-gray-50">
                                    <TableCell>
                                        <div className="font-medium text-gray-900 truncate max-w-[280px]">
                                            {ticket.subject}
                                        </div>
                                        <div className="text-sm text-gray-500 truncate max-w-[280px]">
                                            {ticket.createdBy.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                            <Building2 className="h-3.5 w-3.5" />
                                            {ticket.orgName}
                                        </div>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                                    <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                                    <TableCell>
                                        <span className="text-sm text-gray-600">
                                            {TICKET_CATEGORIES.find((c) => c.value === ticket.category)?.label}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {ticket.replies.length > 0 ? (
                                            <div className="flex items-center gap-1 text-sm text-gray-600">
                                                <MessageSquare className="h-3.5 w-3.5" />
                                                {ticket.replies.length}
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-sm text-gray-500">
                                            <Clock className="h-3.5 w-3.5" />
                                            {formatDistanceToNow(ticket.createdAt, { addSuffix: true })}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Link href={`/bunny/tickets/${ticket.id}`}>
                                            <Button variant="ghost" size="sm">
                                                <ExternalLink className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
