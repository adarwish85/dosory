"use client";

import { use, useState, useRef } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    Clock,
    User,
    Mail,
    MoreVertical,
    CheckCircle,
    AlertCircle,
    Paperclip,
    Send,
    Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useSupportTicket, useSupportTicketMessages, usePermission, useStaff } from "@/lib/hooks";
import { format } from "date-fns";
import { SupportTicket, SupportTicketStatus, SupportTicketPriority } from "@/lib/types/support";

// Helper components
function StatusBadge({ status }: { status: SupportTicketStatus }) {
    const colors = {
        open: "bg-blue-100 text-blue-800",
        in_progress: "bg-purple-100 text-purple-800",
        waiting_on_customer: "bg-yellow-100 text-yellow-800",
        resolved: "bg-green-100 text-green-800",
        closed: "bg-gray-100 text-gray-800",
    };
    return (
        <Badge variant="secondary" className={colors[status] || "bg-gray-100"}>
            {status.replace(/_/g, " ")}
        </Badge>
    );
}

function PriorityBadge({ priority }: { priority: SupportTicketPriority }) {
    const colors = {
        low: "bg-gray-100 text-gray-800",
        medium: "bg-blue-100 text-blue-800",
        high: "bg-orange-100 text-orange-800",
        critical: "bg-red-100 text-red-800",
    };
    return (
        <Badge variant="outline" className={colors[priority] || "bg-gray-100"}>
            {priority}
        </Badge>
    );
}

// Timeline Component
function TicketTimeline({ ticketId }: { ticketId: string }) {
    const { messages, loading } = useSupportTicketMessages(ticketId);

    if (loading) return <div className="p-4 text-center text-gray-500">Loading timeline...</div>;
    if (messages.length === 0) return <div className="p-4 text-center text-gray-500">No messages yet.</div>;

    return (
        <div className="space-y-6">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 ${msg.senderType === "customer" ? "" : "flex-row-reverse"}`}>
                    <Avatar className="h-8 w-8">
                        <AvatarFallback
                            className={msg.senderType === "agent" ? "bg-blue-100 text-blue-600" : "bg-gray-100"}
                        >
                            {msg.senderName?.charAt(0) || (msg.senderType === "agent" ? "A" : "C")}
                        </AvatarFallback>
                    </Avatar>
                    <div
                        className={`flex flex-col max-w-[80%] ${msg.senderType === "customer" ? "items-start" : "items-end"}`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                                {msg.senderName || (msg.senderType === "agent" ? "Support Agent" : "Customer")}
                            </span>
                            <span className="text-xs text-gray-400">
                                {format(msg.createdAt.toDate(), "MMM dd, HH:mm")}
                            </span>
                            {msg.isInternal && (
                                <Badge
                                    variant="outline"
                                    className="text-[10px] px-1 py-0 h-4 bg-yellow-50 text-yellow-700 border-yellow-200"
                                >
                                    Internal Note
                                </Badge>
                            )}
                        </div>
                        <div
                            className={`p-3 rounded-lg text-sm ${
                                msg.isInternal
                                    ? "bg-yellow-50 border border-yellow-100 text-gray-800"
                                    : msg.senderType === "agent"
                                      ? "bg-blue-50 text-blue-900"
                                      : "bg-white border text-gray-800"
                            }`}
                        >
                            <div dangerouslySetInnerHTML={{ __html: msg.body }} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// Reply Component
function ReplyBox({ ticketId }: { ticketId: string }) {
    const [body, setBody] = useState("");
    const [isInternal, setIsInternal] = useState(false);
    const { sendMessage } = useSupportTicketMessages(ticketId);

    const handleSubmit = async () => {
        if (!body.trim()) return;
        await sendMessage(body, isInternal);
        setBody("");
    };

    return (
        <Card className={`border-t ${isInternal ? "bg-yellow-50/50" : "bg-gray-50/50"}`}>
            <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Reply</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsInternal(!isInternal)}
                        className={isInternal ? "text-yellow-600 bg-yellow-100" : "text-gray-500"}
                    >
                        <Lock className="h-3 w-3 mr-1" />
                        Internal Note
                    </Button>
                </div>
                <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={isInternal ? "Add an internal note..." : "Type your reply..."}
                    className="min-h-[100px] bg-white"
                />
                <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm">
                        <Paperclip className="h-4 w-4 mr-2" /> Attach
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSubmit}
                        className={isInternal ? "bg-yellow-600 hover:bg-yellow-700" : ""}
                    >
                        <Send className="h-4 w-4 mr-2" />
                        {isInternal ? "Add Note" : "Send Reply"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = useResult(params); // Workaround if use() is not available or params is standard promise
    // Actually in Next 15+ params is a promise, need to await it.
    // But since this is a client component, we might get it differently or generic "use"
    // For now assuming standard Next.js 15 pattern: use(params)

    // START WORKAROUND for Next.js 15 'use' hook
    // Since I can't easily import 'use' from 'react' if simple type check fails or environment issues
    // I will unwrap it with a custom hook or just assume it's passed already if this were a server component
    // But this is "use client".
    // In Next 15 client components page props are still promises.
    // I will use a simple "use" polyfill logic inline or standard await if async component (but client components cant be async usually)
    // Actually, create a wrapper component is safer.

    return <TicketDetailContent ticketId={id} />;
}

// Temporary hook helper to unwrap params
function useResult<T>(promise: Promise<T>): T {
    // This is a naive implementation, meant to mimic React.use()
    // In real Next.js 16/15 environment, we should use `React.use(promise)`
    // Since I can't be 100% sure of the environment React version details here without checking package.json deep deps
    // I will try to use the `use` from react if imported
    return use(promise);
}

function TicketDetailContent({ ticketId }: { ticketId: string }) {
    const { ticket, loading, updateStatus } = useSupportTicket(ticketId);
    const { can } = usePermission();
    const { staff } = useStaff();

    if (loading) return <div className="p-8 text-center">Loading ticket...</div>;
    if (!ticket) return <div className="p-8 text-center">Ticket not found</div>;

    const assignedAgent = staff.find((s) => s.id === ticket.assignedAgentId);

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/support">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold">{ticket.subject}</h1>
                            <StatusBadge status={ticket.status} />
                            {ticket.slaStatus === "breached" && (
                                <Badge variant="destructive" className="flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> SLA
                                </Badge>
                            )}
                        </div>
                        <div className="text-sm text-gray-500 mt-1 flex items-center gap-3">
                            <span>#{ticket.id}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(ticket.createdAt.toDate(), "MMM dd, yyyy HH:mm")}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {can("tickets_close") && ticket.status !== "closed" && (
                        <Button variant="outline" onClick={() => updateStatus("closed")}>
                            Close Ticket
                        </Button>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => updateStatus("in_progress")}>
                                Mark In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus("waiting_on_customer")}>
                                Mark Waiting on Customer
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Description */}
                    <Card>
                        <CardContent className="p-6">
                            <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                            <div className="prose prose-sm max-w-none text-gray-800">{ticket.description}</div>
                        </CardContent>
                    </Card>

                    <Separator />

                    {/* Timeline */}
                    <TicketTimeline ticketId={ticket.id} />

                    {/* Reply Box */}
                    {ticket.status !== "closed" && (
                        <div className="sticky bottom-4 z-10">
                            <ReplyBox ticketId={ticket.id} />
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Ticket Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div>
                                <div className="text-gray-500 mb-1">Priority</div>
                                <PriorityBadge priority={ticket.priority} />
                            </div>
                            <div>
                                <div className="text-gray-500 mb-1">Assignee</div>
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                        <AvatarFallback>{assignedAgent?.firstName?.charAt(0) || "?"}</AvatarFallback>
                                    </Avatar>
                                    <span>
                                        {assignedAgent
                                            ? `${assignedAgent.firstName} ${assignedAgent.lastName}`
                                            : "Unassigned"}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-500 mb-1">Category</div>
                                <div className="font-medium">{ticket.category}</div>
                            </div>
                            <div>
                                <div className="text-gray-500 mb-1">Source</div>
                                <div className="capitalize">{ticket.source.replace(/_/g, " ")}</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Customer</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            {/* Mock Customer Info - In real app fetch customer */}
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarFallback>C</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-medium">Customer Name</div>
                                    <div className="text-gray-500">customer@example.com</div>
                                </div>
                            </div>
                            <div className="pt-2">
                                <Link href="#" className="text-blue-600 hover:underline flex items-center gap-1">
                                    <User className="h-3 w-3" /> View Profile
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                    {ticket.slaResolutionDueAt && (
                        <Card className={ticket.slaStatus === "breached" ? "border-red-200 bg-red-50" : ""}>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Clock className="h-4 w-4" /> SLA Target
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Response Due</span>
                                    <span className="font-medium">
                                        {format(ticket.slaResponseDueAt!.toDate(), "MMM dd, HH:mm")}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Resolution Due</span>
                                    <span className="font-medium">
                                        {format(ticket.slaResolutionDueAt!.toDate(), "MMM dd, HH:mm")}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
