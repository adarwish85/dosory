"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    HelpCircle,
    Plus,
    Loader2,
    Paperclip,
    Send,
    MessageSquare,
    Clock,
    ChevronRight,
    X,
    AlertCircle,
    CheckCircle2,
    ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import {
    usePlatformTickets,
    PlatformTicket,
    TICKET_CATEGORIES,
    TICKET_PRIORITIES,
    TICKET_STATUSES,
    TicketCategory,
    TicketPriority,
} from "@/lib/hooks/use-platform-tickets";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export default function HelpPage() {
    const { tickets, loading, createTicket, addReply } = usePlatformTickets();
    const [activeTab, setActiveTab] = useState("submit");
    const [selectedTicket, setSelectedTicket] = useState<PlatformTicket | null>(null);

    // Form state
    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState<TicketCategory>("general");
    const [priority, setPriority] = useState<TicketPriority>("medium");
    const [attachments, setAttachments] = useState<File[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Reply state
    const [replyMessage, setReplyMessage] = useState("");
    const [replying, setReplying] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !description.trim()) {
            toast.error("Please fill in all required fields");
            return;
        }

        setSubmitting(true);
        try {
            await createTicket({
                subject: subject.trim(),
                description: description.trim(),
                category,
                priority,
                attachments: attachments.length > 0 ? attachments : undefined,
            });
            toast.success("Ticket submitted successfully!");
            // Reset form
            setSubject("");
            setDescription("");
            setCategory("general");
            setPriority("medium");
            setAttachments([]);
            setActiveTab("my-tickets");
        } catch (error) {
            console.error("Error creating ticket:", error);
            toast.error("Failed to submit ticket");
        } finally {
            setSubmitting(false);
        }
    };

    const handleReply = async () => {
        if (!selectedTicket || !replyMessage.trim()) return;

        setReplying(true);
        try {
            await addReply(selectedTicket.id, replyMessage.trim());
            setReplyMessage("");
            toast.success("Reply sent!");
            // Refresh selected ticket from list
            const updated = tickets.find((t) => t.id === selectedTicket.id);
            if (updated) setSelectedTicket(updated);
        } catch (error) {
            console.error("Error sending reply:", error);
            toast.error("Failed to send reply");
        } finally {
            setReplying(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setAttachments((prev) => [...prev, ...files].slice(0, 5)); // Max 5 files
    };

    const removeAttachment = (index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    const getStatusBadge = (status: PlatformTicket["status"]) => {
        const config = TICKET_STATUSES.find((s) => s.value === status);
        return <Badge className={cn("font-normal", config?.color)}>{config?.label || status}</Badge>;
    };

    const getPriorityBadge = (priority: PlatformTicket["priority"]) => {
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
            <div className="flex items-center gap-3">
                <HelpCircle className="h-6 w-6 text-blue-600" />
                <h1 className="text-2xl font-semibold text-gray-900">Help & Support</h1>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="submit" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Submit Ticket
                    </TabsTrigger>
                    <TabsTrigger value="my-tickets" className="gap-2">
                        <MessageSquare className="h-4 w-4" />
                        My Tickets
                        {tickets.length > 0 && (
                            <Badge variant="secondary" className="ml-1">
                                {tickets.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* Submit Ticket Tab */}
                <TabsContent value="submit" className="mt-6">
                    <div className="bg-white rounded-lg border p-6 max-w-2xl">
                        <h2 className="text-lg font-semibold mb-4">Report an Issue</h2>
                        <p className="text-gray-500 text-sm mb-6">
                            Having trouble with the platform? Let us know and we&apos;ll help you out.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label className="text-red-500">* Subject</Label>
                                <Input
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="Brief description of your issue"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TICKET_CATEGORIES.map((c) => (
                                                <SelectItem key={c.value} value={c.value}>
                                                    {c.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Priority</Label>
                                    <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
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
                            </div>

                            <div className="space-y-2">
                                <Label className="text-red-500">* Description</Label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Please describe your issue in detail..."
                                    rows={5}
                                    required
                                />
                            </div>

                            {/* Attachments */}
                            <div className="space-y-2">
                                <Label>Attachments (optional)</Label>
                                <div className="flex flex-wrap gap-2">
                                    {attachments.map((file, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-2 bg-gray-100 rounded px-3 py-1.5 text-sm"
                                        >
                                            <Paperclip className="h-3 w-3" />
                                            <span className="truncate max-w-[150px]">{file.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeAttachment(i)}
                                                className="text-gray-500 hover:text-red-500"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                    {attachments.length < 5 && (
                                        <label className="flex items-center gap-2 px-3 py-1.5 border border-dashed rounded cursor-pointer hover:bg-gray-50 text-sm text-gray-600">
                                            <Plus className="h-3 w-3" />
                                            Add File
                                            <input
                                                type="file"
                                                className="hidden"
                                                onChange={handleFileChange}
                                                accept="image/*,.pdf,.doc,.docx,.txt"
                                            />
                                        </label>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500">Max 5 files. Supported: Images, PDF, DOC, TXT</p>
                            </div>

                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={submitting}>
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Submit Ticket
                            </Button>
                        </form>
                    </div>
                </TabsContent>

                {/* My Tickets Tab */}
                <TabsContent value="my-tickets" className="mt-6">
                    {tickets.length === 0 ? (
                        <div className="bg-white rounded-lg border p-10 text-center">
                            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets yet</h3>
                            <p className="text-gray-500 mb-4">You haven&apos;t submitted any support tickets.</p>
                            <Button onClick={() => setActiveTab("submit")}>
                                <Plus className="mr-2 h-4 w-4" />
                                Submit Ticket
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tickets.map((ticket) => (
                                <div
                                    key={ticket.id}
                                    className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => setSelectedTicket(ticket)}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                {getStatusBadge(ticket.status)}
                                                {getPriorityBadge(ticket.priority)}
                                                <Badge variant="outline" className="font-normal">
                                                    {TICKET_CATEGORIES.find((c) => c.value === ticket.category)?.label}
                                                </Badge>
                                            </div>
                                            <h3 className="font-medium text-gray-900 truncate">{ticket.subject}</h3>
                                            <p className="text-sm text-gray-500 line-clamp-1 mt-1">
                                                {ticket.description}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <div className="text-right text-xs text-gray-500">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDistanceToNow(ticket.createdAt, { addSuffix: true })}
                                                </div>
                                                {ticket.replies.length > 0 && (
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <MessageSquare className="h-3 w-3" />
                                                        {ticket.replies.length} replies
                                                    </div>
                                                )}
                                            </div>
                                            <ChevronRight className="h-5 w-5" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Ticket Detail Dialog */}
            <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
                    <DialogHeader className="px-6 py-4 border-b">
                        <div className="flex items-start gap-4">
                            <button
                                onClick={() => setSelectedTicket(null)}
                                className="mt-1 text-gray-400 hover:text-gray-600"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    {selectedTicket && getStatusBadge(selectedTicket.status)}
                                    {selectedTicket && getPriorityBadge(selectedTicket.priority)}
                                </div>
                                <DialogTitle className="text-lg">{selectedTicket?.subject}</DialogTitle>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {/* Original message */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                                        {selectedTicket?.createdBy.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-medium text-sm">{selectedTicket?.createdBy.name}</div>
                                    <div className="text-xs text-gray-500">
                                        {selectedTicket &&
                                            formatDistanceToNow(selectedTicket.createdAt, { addSuffix: true })}
                                    </div>
                                </div>
                            </div>
                            <p className="text-gray-700 whitespace-pre-wrap">{selectedTicket?.description}</p>
                            {selectedTicket?.attachments && selectedTicket.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {selectedTicket.attachments.map((url, i) => (
                                        <a
                                            key={i}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                        >
                                            <Paperclip className="h-3 w-3" />
                                            Attachment {i + 1}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Replies */}
                        {selectedTicket?.replies.map((reply) => (
                            <div
                                key={reply.id}
                                className={cn(
                                    "rounded-lg p-4",
                                    reply.author.isAdmin ? "bg-blue-50 ml-4" : "bg-gray-50"
                                )}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback
                                            className={cn(
                                                "text-xs",
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
                                            <span className="font-medium text-sm">{reply.author.name}</span>
                                            {reply.author.isAdmin && (
                                                <Badge className="text-[10px] py-0 bg-blue-600">Admin</Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {formatDistanceToNow(reply.createdAt, { addSuffix: true })}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-gray-700 whitespace-pre-wrap">{reply.message}</p>
                            </div>
                        ))}
                    </div>

                    {/* Reply Input */}
                    {selectedTicket && selectedTicket.status !== "closed" && (
                        <div className="border-t p-4">
                            <div className="flex gap-2">
                                <Textarea
                                    value={replyMessage}
                                    onChange={(e) => setReplyMessage(e.target.value)}
                                    placeholder="Write a reply..."
                                    rows={2}
                                    className="flex-1"
                                />
                                <Button
                                    onClick={handleReply}
                                    disabled={replying || !replyMessage.trim()}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {replying ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Closed ticket notice */}
                    {selectedTicket?.status === "closed" && (
                        <div className="border-t p-4 bg-gray-50 text-center text-sm text-gray-500">
                            This ticket is closed. Please submit a new ticket if you need further help.
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
