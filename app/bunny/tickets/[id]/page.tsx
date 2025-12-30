"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Send, Paperclip, Building2, Clock, User, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
    useAllPlatformTickets,
    PlatformTicket,
    TICKET_CATEGORIES,
    TICKET_PRIORITIES,
    TICKET_STATUSES,
    TicketStatus,
    TicketPriority,
} from "@/lib/hooks/use-platform-tickets";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const { profile } = useUserProfile();
    const { tickets, loading, updateStatus, updatePriority, addAdminReply } = useAllPlatformTickets();
    const [ticket, setTicket] = useState<PlatformTicket | null>(null);
    const [replyMessage, setReplyMessage] = useState("");
    const [replying, setReplying] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [updatingPriority, setUpdatingPriority] = useState(false);

    // Find ticket from list
    useEffect(() => {
        if (!loading && tickets.length > 0) {
            const found = tickets.find((t) => t.id === resolvedParams.id);
            setTicket(found || null);
        }
    }, [tickets, loading, resolvedParams.id]);

    const handleStatusChange = async (newStatus: TicketStatus) => {
        if (!ticket) return;
        setUpdatingStatus(true);
        try {
            await updateStatus(ticket.id, newStatus);
            toast.success(`Status updated to ${TICKET_STATUSES.find((s) => s.value === newStatus)?.label}`);
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Failed to update status");
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handlePriorityChange = async (newPriority: TicketPriority) => {
        if (!ticket) return;
        setUpdatingPriority(true);
        try {
            await updatePriority(ticket.id, newPriority);
            toast.success(`Priority updated to ${TICKET_PRIORITIES.find((p) => p.value === newPriority)?.label}`);
        } catch (error) {
            console.error("Error updating priority:", error);
            toast.error("Failed to update priority");
        } finally {
            setUpdatingPriority(false);
        }
    };

    const handleReply = async () => {
        if (!ticket || !replyMessage.trim() || !profile) return;

        setReplying(true);
        try {
            await addAdminReply(ticket.id, replyMessage.trim(), {
                uid: profile.uid || "",
                name: `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "Super Admin",
            });
            setReplyMessage("");
            toast.success("Reply sent!");
        } catch (error) {
            console.error("Error sending reply:", error);
            toast.error("Failed to send reply");
        } finally {
            setReplying(false);
        }
    };

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

    if (!ticket) {
        return (
            <div className="space-y-6">
                <Link href="/bunny/tickets">
                    <Button variant="ghost" className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Tickets
                    </Button>
                </Link>
                <div className="bg-white rounded-lg border p-10 text-center">
                    <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Ticket not found</h3>
                    <p className="text-gray-500">This ticket may have been deleted or doesn't exist.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <Link href="/bunny/tickets">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">{ticket.subject}</h1>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" />
                                {ticket.orgName}
                            </span>
                            <span className="flex items-center gap-1">
                                <User className="h-3.5 w-3.5" />
                                {ticket.createdBy.name}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {format(ticket.createdAt, "MMM d, yyyy 'at' h:mm a")}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content - Conversation */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Original message */}
                    <div className="bg-white rounded-lg border p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-gray-200 text-gray-700">
                                    {ticket.createdBy.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="font-medium">{ticket.createdBy.name}</div>
                                <div className="text-sm text-gray-500">{ticket.createdBy.email}</div>
                            </div>
                            <div className="ml-auto text-sm text-gray-500">
                                {formatDistanceToNow(ticket.createdAt, { addSuffix: true })}
                            </div>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
                        {ticket.attachments && ticket.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                                {ticket.attachments.map((url, i) => (
                                    <a
                                        key={i}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline bg-blue-50 px-3 py-1.5 rounded"
                                    >
                                        <Paperclip className="h-3.5 w-3.5" />
                                        Attachment {i + 1}
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Replies */}
                    {ticket.replies.map((reply) => (
                        <div
                            key={reply.id}
                            className={cn(
                                "rounded-lg border p-5",
                                reply.author.isAdmin ? "bg-blue-50 border-blue-200" : "bg-white"
                            )}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarFallback
                                        className={cn(
                                            reply.author.isAdmin
                                                ? "bg-blue-200 text-blue-800"
                                                : "bg-gray-200 text-gray-700"
                                        )}
                                    >
                                        {reply.author.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{reply.author.name}</span>
                                        {reply.author.isAdmin && (
                                            <Badge className="bg-blue-600 text-white text-[10px]">Super Admin</Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="ml-auto text-sm text-gray-500">
                                    {formatDistanceToNow(reply.createdAt, { addSuffix: true })}
                                </div>
                            </div>
                            <p className="text-gray-700 whitespace-pre-wrap">{reply.message}</p>
                            {reply.attachments && reply.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                                    {reply.attachments.map((url, i) => (
                                        <a
                                            key={i}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                                        >
                                            <Paperclip className="h-3.5 w-3.5" />
                                            Attachment {i + 1}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Reply Form */}
                    <div className="bg-white rounded-lg border p-5">
                        <h3 className="font-medium mb-3">Reply to Ticket</h3>
                        <Textarea
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            placeholder="Write your response..."
                            rows={4}
                            className="mb-3"
                        />
                        <div className="flex justify-end">
                            <Button
                                onClick={handleReply}
                                disabled={replying || !replyMessage.trim()}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {replying ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="mr-2 h-4 w-4" />
                                )}
                                Send Reply
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Sidebar - Ticket Details */}
                <div className="space-y-4">
                    <div className="bg-white rounded-lg border p-5 space-y-4">
                        <h3 className="font-medium">Ticket Details</h3>

                        {/* Status */}
                        <div>
                            <label className="text-sm text-gray-500 block mb-1.5">Status</label>
                            <Select
                                value={ticket.status}
                                onValueChange={(v) => handleStatusChange(v as TicketStatus)}
                                disabled={updatingStatus}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TICKET_STATUSES.map((s) => (
                                        <SelectItem key={s.value} value={s.value}>
                                            {s.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Priority */}
                        <div>
                            <label className="text-sm text-gray-500 block mb-1.5">Priority</label>
                            <Select
                                value={ticket.priority}
                                onValueChange={(v) => handlePriorityChange(v as TicketPriority)}
                                disabled={updatingPriority}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TICKET_PRIORITIES.map((p) => (
                                        <SelectItem key={p.value} value={p.value}>
                                            {p.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Category */}
                        <div>
                            <label className="text-sm text-gray-500 block mb-1.5">Category</label>
                            <div className="text-sm font-medium">
                                {TICKET_CATEGORIES.find((c) => c.value === ticket.category)?.label}
                            </div>
                        </div>

                        {/* Created */}
                        <div>
                            <label className="text-sm text-gray-500 block mb-1.5">Created</label>
                            <div className="text-sm">{format(ticket.createdAt, "MMM d, yyyy 'at' h:mm a")}</div>
                        </div>

                        {/* Last Updated */}
                        <div>
                            <label className="text-sm text-gray-500 block mb-1.5">Last Updated</label>
                            <div className="text-sm">{formatDistanceToNow(ticket.updatedAt, { addSuffix: true })}</div>
                        </div>
                    </div>

                    {/* Submitter Info */}
                    <div className="bg-white rounded-lg border p-5 space-y-3">
                        <h3 className="font-medium">Submitter</h3>
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-gray-200 text-gray-700">
                                    {ticket.createdBy.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="font-medium text-sm">{ticket.createdBy.name}</div>
                                <div className="text-xs text-gray-500">{ticket.createdBy.email}</div>
                            </div>
                        </div>
                        <div className="pt-2 border-t">
                            <div className="text-sm text-gray-500">Organization</div>
                            <div className="text-sm font-medium flex items-center gap-1.5 mt-0.5">
                                <Building2 className="h-3.5 w-3.5" />
                                {ticket.orgName}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
