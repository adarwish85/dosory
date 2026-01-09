"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useTickets, useDepartments, useTicketReplies } from "@/lib/hooks";
import { useStaff } from "@/lib/hooks";
import { useProject } from "@/lib/hooks/use-projects";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, formatDistanceToNow } from "date-fns";
import { Plus, Loader2, Ticket, ArrowLeft, Send, MessageSquare, AlertCircle, CheckCircle2, Clock, User } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Ticket as TicketType, TicketStatus, TicketPriority } from "@/lib/types";

// Form schema for new ticket
const ticketFormSchema = z.object({
    subject: z.string().min(1, "Subject is required"),
    departmentId: z.string().min(1, "Department is required"),
    priority: z.enum(["low", "medium", "high"]),
    message: z.string().min(1, "Message is required"),
});

type TicketFormData = z.infer<typeof ticketFormSchema>;

// Status badge component
const StatusBadge = ({ status }: { status: TicketStatus }) => {
    const statusConfig: Record<TicketStatus, { label: string; className: string }> = {
        open: { label: "Open", className: "bg-blue-100 text-blue-700" },
        in_progress: { label: "In Progress", className: "bg-yellow-100 text-yellow-700" },
        answered: { label: "Answered", className: "bg-green-100 text-green-700" },
        on_hold: { label: "On Hold", className: "bg-orange-100 text-orange-700" },
        closed: { label: "Closed", className: "bg-gray-100 text-gray-700" },
    };
    const config = statusConfig[status] || statusConfig.open;
    return <Badge className={config.className}>{config.label}</Badge>;
};

// Priority badge component
const PriorityBadge = ({ priority }: { priority: TicketPriority }) => {
    const priorityConfig: Record<TicketPriority, { label: string; className: string }> = {
        low: { label: "Low", className: "bg-gray-100 text-gray-600" },
        medium: { label: "Medium", className: "bg-blue-100 text-blue-600" },
        high: { label: "High", className: "bg-red-100 text-red-600" },
    };
    const config = priorityConfig[priority] || priorityConfig.medium;
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
};

export default function ProjectTicketsPage() {
    const params = useParams();
    const projectId = params.id as string;
    const { project } = useProject(projectId);
    const { tickets, loading, createTicket, updateTicketStatus, assignTicket, ticketStats } = useTickets({ projectId });
    const { departments } = useDepartments();
    const { staff } = useStaff();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
    const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");

    // Staff map for name lookup
    const staffMap = useMemo(() => {
        const map = new Map<string, string>();
        staff.forEach(s => map.set(s.id, `${s.firstName} ${s.lastName}`));
        return map;
    }, [staff]);

    // Department map for name lookup
    const deptMap = useMemo(() => {
        const map = new Map<string, string>();
        departments.forEach(d => map.set(d.id, d.name));
        return map;
    }, [departments]);

    // Filter tickets by status
    const filteredTickets = useMemo(() => {
        if (statusFilter === "all") return tickets;
        return tickets.filter(t => t.status === statusFilter);
    }, [tickets, statusFilter]);

    const form = useForm<TicketFormData>({
        resolver: zodResolver(ticketFormSchema) as any,
        defaultValues: {
            subject: "",
            departmentId: "",
            priority: "medium",
            message: "",
        },
    });

    const onSubmit = async (data: TicketFormData) => {
        try {
            await createTicket({
                subject: data.subject,
                departmentId: data.departmentId,
                priority: data.priority,
                projectId: projectId,
                customerId: project?.customerId,
                customerName: project?.customerName,
            } as any);
            toast.success("Ticket created successfully");
            setDialogOpen(false);
            form.reset();
        } catch (error) {
            console.error(error);
            toast.error("Failed to create ticket");
        }
    };

    if (loading) {
        return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;
    }

    // Ticket Detail View
    if (selectedTicket) {
        return (
            <TicketDetailView
                ticket={selectedTicket}
                onBack={() => setSelectedTicket(null)}
                staffMap={staffMap}
                deptMap={deptMap}
                updateTicketStatus={updateTicketStatus}
                assignTicket={assignTicket}
                staff={staff}
            />
        );
    }

    // Tickets List View
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Project Tickets</h2>
                    <p className="text-muted-foreground text-sm">Support tickets related to this project.</p>
                </div>
                <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TicketStatus | "all")}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Filter status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Tickets</SelectItem>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="answered">Answered</SelectItem>
                            <SelectItem value="on_hold">On Hold</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                    </Select>

                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> New Ticket
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Create Support Ticket</DialogTitle>
                                <DialogDescription>Create a new support ticket for this project.</DialogDescription>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="subject"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Subject</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Brief description of the issue" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="departmentId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Department</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select department" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {departments.map(dept => (
                                                                <SelectItem key={dept.id} value={dept.id}>
                                                                    {dept.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="priority"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Priority</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select priority" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="low">Low</SelectItem>
                                                            <SelectItem value="medium">Medium</SelectItem>
                                                            <SelectItem value="high">High</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="message"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Message</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Describe the issue in detail..."
                                                        className="min-h-[100px]"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <DialogFooter>
                                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={form.formState.isSubmitting}>
                                            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Create Ticket
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("all")}>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <Ticket className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-muted-foreground">Total</span>
                        </div>
                        <p className="text-2xl font-bold mt-1">{ticketStats.total}</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("open")}>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-blue-500" />
                            <span className="text-sm text-muted-foreground">Open</span>
                        </div>
                        <p className="text-2xl font-bold mt-1 text-blue-600">{ticketStats.open || 0}</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("in_progress")}>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm text-muted-foreground">In Progress</span>
                        </div>
                        <p className="text-2xl font-bold mt-1 text-yellow-600">{ticketStats.in_progress || 0}</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("answered")}>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-muted-foreground">Answered</span>
                        </div>
                        <p className="text-2xl font-bold mt-1 text-green-600">{ticketStats.answered || 0}</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("closed")}>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-muted-foreground">Closed</span>
                        </div>
                        <p className="text-2xl font-bold mt-1 text-gray-600">{ticketStats.closed || 0}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tickets Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Subject</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Assigned To</TableHead>
                            <TableHead>Last Reply</TableHead>
                            <TableHead>Created</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTickets.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                    <Ticket className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                    <p>No tickets found for this project.</p>
                                    <Button variant="link" onClick={() => setDialogOpen(true)} className="mt-2">
                                        Create the first ticket
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredTickets.map((ticket) => (
                                <TableRow
                                    key={ticket.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => setSelectedTicket(ticket)}
                                >
                                    <TableCell className="font-medium max-w-[250px]">
                                        <div className="flex items-center gap-2">
                                            {!ticket.lastReplyByStaff && ticket.status !== "closed" && (
                                                <span className="h-2 w-2 rounded-full bg-blue-500" />
                                            )}
                                            <span className="truncate">{ticket.subject}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{deptMap.get(ticket.departmentId) || "-"}</TableCell>
                                    <TableCell><StatusBadge status={ticket.status} /></TableCell>
                                    <TableCell><PriorityBadge priority={ticket.priority} /></TableCell>
                                    <TableCell>
                                        {ticket.assignedTo ? (
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarFallback className="text-xs">
                                                        {(staffMap.get(ticket.assignedTo) || "U").charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm">{staffMap.get(ticket.assignedTo) || "Unknown"}</span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">Unassigned</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {ticket.lastReply
                                            ? formatDistanceToNow(ticket.lastReply.toDate(), { addSuffix: true })
                                            : "-"
                                        }
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {ticket.createdAt && format(ticket.createdAt.toDate(), "MMM d, yyyy")}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}

// Ticket Detail View Component
function TicketDetailView({
    ticket,
    onBack,
    staffMap,
    deptMap,
    updateTicketStatus,
    assignTicket,
    staff,
}: {
    ticket: TicketType;
    onBack: () => void;
    staffMap: Map<string, string>;
    deptMap: Map<string, string>;
    updateTicketStatus: (id: string, status: TicketStatus) => Promise<void>;
    assignTicket: (id: string, staffId: string) => Promise<void>;
    staff: any[];
}) {
    const { replies, loading: repliesLoading, addReply } = useTicketReplies(ticket.id);
    const [replyText, setReplyText] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleAddReply = async () => {
        if (!replyText.trim()) return;
        setSubmitting(true);
        try {
            await addReply({
                ticketId: ticket.id,
                message: replyText.trim(),
            });
            setReplyText("");
            toast.success("Reply sent");
        } catch (error) {
            toast.error("Failed to send reply");
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (newStatus: TicketStatus) => {
        try {
            await updateTicketStatus(ticket.id, newStatus);
            toast.success(`Status updated to ${newStatus}`);
        } catch {
            toast.error("Failed to update status");
        }
    };

    const handleAssign = async (staffId: string) => {
        try {
            await assignTicket(ticket.id, staffId);
            toast.success("Ticket assigned");
        } catch {
            toast.error("Failed to assign ticket");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <button
                        onClick={onBack}
                        className="mt-1 p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-500" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold">{ticket.subject}</h2>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span>{deptMap.get(ticket.departmentId) || "Unknown Department"}</span>
                            <span>•</span>
                            <span>Created {ticket.createdAt && formatDistanceToNow(ticket.createdAt.toDate(), { addSuffix: true })}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <StatusBadge status={ticket.status} />
                    <PriorityBadge priority={ticket.priority} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content - Replies */}
                <div className="lg:col-span-2 space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" />
                                Conversation ({replies.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {repliesLoading ? (
                                <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
                            ) : replies.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    <p>No messages yet. Start the conversation!</p>
                                </div>
                            ) : (
                                <ScrollArea className="max-h-[400px] pr-4">
                                    <div className="space-y-4">
                                        {replies.map((reply) => (
                                            <div
                                                key={reply.id}
                                                className={`flex gap-3 ${reply.isStaffReply ? "flex-row-reverse" : ""}`}
                                            >
                                                <Avatar className="h-8 w-8 shrink-0">
                                                    <AvatarFallback className={reply.isStaffReply ? "bg-blue-100 text-blue-700" : "bg-gray-100"}>
                                                        {reply.isStaffReply ? "S" : "C"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className={`flex-1 ${reply.isStaffReply ? "text-right" : ""}`}>
                                                    <div
                                                        className={`inline-block p-3 rounded-lg max-w-[80%] ${reply.isStaffReply
                                                                ? "bg-blue-50 text-left"
                                                                : "bg-gray-50"
                                                            }`}
                                                    >
                                                        <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {reply.isStaffReply ? "Staff" : "Customer"} • {reply.createdAt && formatDistanceToNow(reply.createdAt.toDate(), { addSuffix: true })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}

                            {/* Reply Input */}
                            <div className="flex gap-2 mt-4 pt-4 border-t">
                                <Textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Write a reply..."
                                    className="flex-1 min-h-[80px]"
                                />
                                <Button
                                    onClick={handleAddReply}
                                    disabled={!replyText.trim() || submitting}
                                    className="self-end"
                                >
                                    {submitting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar - Ticket Details */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Ticket Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-xs text-muted-foreground">Status</label>
                                <Select value={ticket.status} onValueChange={handleStatusChange}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="open">Open</SelectItem>
                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                        <SelectItem value="answered">Answered</SelectItem>
                                        <SelectItem value="on_hold">On Hold</SelectItem>
                                        <SelectItem value="closed">Closed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">Assigned To</label>
                                <Select value={ticket.assignedTo || ""} onValueChange={handleAssign}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Unassigned" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {staff.map(s => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.firstName} {s.lastName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">Priority</label>
                                <div className="mt-1"><PriorityBadge priority={ticket.priority} /></div>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">Department</label>
                                <p className="text-sm font-medium mt-1">{deptMap.get(ticket.departmentId) || "-"}</p>
                            </div>
                            {ticket.customerName && (
                                <div>
                                    <label className="text-xs text-muted-foreground">Customer</label>
                                    <p className="text-sm font-medium mt-1">{ticket.customerName}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
