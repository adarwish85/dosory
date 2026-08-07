"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
// MIGRATED 2026-08-07 (Sweep E): this tab used use-support's `useTickets`/`useTicketReplies`,
// which read `support_tickets`/`orgId` — a collection nothing has written since the support
// module moved to TicketService, so it could never show an app-created ticket. It now shares
// the `tickets`/`tenantId` collection, the canonical SupportTicket shape, and the same
// support.statuses.*/support.priorities.* vocabulary as the main support list.
import { useSupportTickets, useSupportTicketMessages } from "@/lib/hooks/use-tickets";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, formatDistanceToNow } from "date-fns";
import { Plus, Loader2, Ticket, ArrowLeft, Send, MessageSquare, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SupportTicket, SupportTicketStatus, SupportTicketPriority } from "@/lib/types/support";
import { useTranslation } from "@/lib/i18n";

// Categories must match the main new-ticket form (app/dashboard/support/new) — they are the
// dimension SupportSettings.autoAssignRules keys off. This replaced a department picker,
// which the canonical ticket shape has no field for.
const CATEGORIES = ["General", "Billing", "Technical", "Feature Request", "Bug"];

// Form schema for new ticket. Sweep B: every value rendered by a Select below is a member of
// the zod enum here, and every required field is rendered.
const ticketFormSchema = z.object({
    subject: z.string().min(1, "Subject is required"),
    category: z.string().min(1, "Category is required"),
    priority: z.enum(["low", "medium", "high", "critical"]),
    message: z.string().min(1, "Message is required"),
});

type TicketFormData = z.infer<typeof ticketFormSchema>;

// Status badge component
const StatusBadge = ({ status }: { status: SupportTicketStatus }) => {
    const { t } = useTranslation();
    const statusConfig: Record<SupportTicketStatus, string> = {
        open: "bg-blue-100 text-blue-700",
        in_progress: "bg-yellow-100 text-yellow-700",
        waiting_on_customer: "bg-orange-100 text-orange-700",
        resolved: "bg-green-100 text-green-700",
        closed: "bg-gray-100 text-gray-700",
    };
    return <Badge className={statusConfig[status] || statusConfig.open}>{t(`support.statuses.${status}`)}</Badge>;
};

// Priority badge component
const PriorityBadge = ({ priority }: { priority: SupportTicketPriority }) => {
    const { t } = useTranslation();
    const priorityConfig: Record<SupportTicketPriority, string> = {
        low: "bg-gray-100 text-gray-600",
        medium: "bg-blue-100 text-blue-600",
        high: "bg-orange-100 text-orange-600",
        critical: "bg-red-100 text-red-600",
    };
    return (
        <Badge variant="outline" className={priorityConfig[priority] || priorityConfig.medium}>
            {t(`support.priorities.${priority}`)}
        </Badge>
    );
};

export default function ProjectTicketsPage() {
    const { t } = useTranslation();
    const params = useParams();
    const projectId = params.id as string;
    const { project } = useProject(projectId);
    const { tickets, loading, error, createTicket, updateTicketStatus, assignTicket, ticketStats, refresh } =
        useSupportTickets({ projectId });
    const { staff } = useStaff();
    const [dialogOpen, setDialogOpen] = useState(false);
    // Only the ID is held in state. Holding the whole ticket object meant that changing its
    // status or assignee — which refetches the list — left the detail pane rendering the
    // stale pre-change copy, so the update looked like it had silently reverted.
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const selectedTicket = selectedTicketId ? (tickets.find((t) => t.id === selectedTicketId) ?? null) : null;
    const [statusFilter, setStatusFilter] = useState<SupportTicketStatus | "all">("all");

    // Staff map for name lookup
    const staffMap = useMemo(() => {
        const map = new Map<string, string>();
        staff.forEach((s) => map.set(s.id, `${s.firstName} ${s.lastName}`));
        return map;
    }, [staff]);

    // Filter tickets by status
    const filteredTickets = useMemo(() => {
        if (statusFilter === "all") return tickets;
        return tickets.filter((t) => t.status === statusFilter);
    }, [tickets, statusFilter]);

    const form = useForm<TicketFormData>({
        resolver: zodResolver(ticketFormSchema),
        defaultValues: {
            subject: "",
            category: "General",
            priority: "medium",
            message: "",
        },
    });

    const onSubmit = async (data: TicketFormData) => {
        try {
            await createTicket({
                subject: data.subject,
                // The message field was collected and then DROPPED by the pre-migration call
                // (it passed departmentId/customerName and never a body). It is the ticket
                // description on the canonical shape.
                description: data.message,
                category: data.category,
                priority: data.priority,
                status: "open",
                source: "manual",
                assignedAgentId: null,
                projectId,
                customerId: project?.customerId ?? null,
                metadata: {},
            });
            toast.success(t("projects.tickets.createdToast"));
            setDialogOpen(false);
            form.reset();
        } catch (error) {
            console.error(error);
            toast.error(t("projects.tickets.createFailedToast"));
        }
    };

    // Sweep B: handleSubmit without an onInvalid silently no-ops when validation fails.
    const onInvalid = (errors: Record<string, { message?: string }>) => {
        const first = Object.values(errors)[0];
        toast.error(first?.message || t("projects.tickets.createFailedToast"));
    };

    // Ticket Detail View — checked BEFORE the loading gate. useSupportTickets sets loading
    // back to true on every refetch, and status/assign changes refetch; with the gate first,
    // each change tore the detail pane down and dropped the user back to the list.
    if (selectedTicket) {
        return (
            <TicketDetailView
                ticket={selectedTicket}
                onBack={() => setSelectedTicketId(null)}
                // SupportTicket carries customerId, not a denormalised customerName — take
                // the name from the project this tab is already scoped to.
                customerName={project?.customerName}
                updateTicketStatus={updateTicketStatus}
                assignTicket={assignTicket}
                onTicketChanged={refresh}
                staff={staff}
            />
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center p-10">
                <Loader2 className="animate-spin" />
            </div>
        );
    }

    // A failed query leaves `tickets` empty, which is indistinguishable from "this project
    // has no tickets" unless we say so. Silent-empty is the exact failure mode this whole
    // migration exists to remove — see CLAUDE.md Sweep E.
    if (error) {
        return (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <p className="font-medium">{t("projects.tickets.loadFailed")}</p>
                <p className="text-sm text-muted-foreground">{error.message}</p>
                <Button variant="outline" onClick={() => refresh()}>
                    {t("common.retry")}
                </Button>
            </div>
        );
    }

    // Tickets List View
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">{t("projects.tickets.title")}</h2>
                    <p className="text-muted-foreground text-sm">{t("projects.tickets.subtitle")}</p>
                </div>
                <div className="flex gap-2">
                    <Select
                        value={statusFilter}
                        onValueChange={(v) => setStatusFilter(v as SupportTicketStatus | "all")}
                    >
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder={t("projects.tickets.filterStatus")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t("projects.tickets.allTickets")}</SelectItem>
                            <SelectItem value="open">{t("support.statuses.open")}</SelectItem>
                            <SelectItem value="in_progress">{t("support.statuses.in_progress")}</SelectItem>
                            <SelectItem value="waiting_on_customer">
                                {t("support.statuses.waiting_on_customer")}
                            </SelectItem>
                            <SelectItem value="resolved">{t("support.statuses.resolved")}</SelectItem>
                            <SelectItem value="closed">{t("support.statuses.closed")}</SelectItem>
                        </SelectContent>
                    </Select>

                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> {t("projects.tickets.new")}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle>{t("projects.tickets.dialogTitle")}</DialogTitle>
                                <DialogDescription>{t("projects.tickets.dialogDescription")}</DialogDescription>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="subject"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("projects.tickets.subject")}</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder={t("projects.tickets.subjectPlaceholder")}
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="category"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("support.category")}</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue
                                                                    placeholder={t("support.new.selectCategory")}
                                                                />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {CATEGORIES.map((c) => (
                                                                <SelectItem key={c} value={c}>
                                                                    {t(`support.categories.${c}`)}
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
                                                    <FormLabel>{t("projects.tickets.priorityLabel")}</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue
                                                                    placeholder={t("projects.tickets.selectPriority")}
                                                                />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="low">
                                                                {t("support.priorities.low")}
                                                            </SelectItem>
                                                            <SelectItem value="medium">
                                                                {t("support.priorities.medium")}
                                                            </SelectItem>
                                                            <SelectItem value="high">
                                                                {t("support.priorities.high")}
                                                            </SelectItem>
                                                            <SelectItem value="critical">
                                                                {t("support.priorities.critical")}
                                                            </SelectItem>
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
                                                <FormLabel>{t("projects.tickets.message")}</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder={t("projects.tickets.messagePlaceholder")}
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
                                            {t("common.cancel")}
                                        </Button>
                                        <Button type="submit" disabled={form.formState.isSubmitting}>
                                            {form.formState.isSubmitting && (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            )}
                                            {t("projects.tickets.createButton")}
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
                <Card
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setStatusFilter("all")}
                >
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <Ticket className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-muted-foreground">{t("projects.tickets.statTotal")}</span>
                        </div>
                        <p className="text-2xl font-bold mt-1">{ticketStats.total}</p>
                    </CardContent>
                </Card>
                <Card
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setStatusFilter("open")}
                >
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-blue-500" />
                            <span className="text-sm text-muted-foreground">{t("support.statuses.open")}</span>
                        </div>
                        <p className="text-2xl font-bold mt-1 text-blue-600">{ticketStats.open || 0}</p>
                    </CardContent>
                </Card>
                <Card
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setStatusFilter("in_progress")}
                >
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm text-muted-foreground">{t("support.statuses.in_progress")}</span>
                        </div>
                        <p className="text-2xl font-bold mt-1 text-yellow-600">{ticketStats.in_progress || 0}</p>
                    </CardContent>
                </Card>
                <Card
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setStatusFilter("resolved")}
                >
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-muted-foreground">{t("support.statuses.resolved")}</span>
                        </div>
                        <p className="text-2xl font-bold mt-1 text-green-600">{ticketStats.resolved || 0}</p>
                    </CardContent>
                </Card>
                <Card
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setStatusFilter("closed")}
                >
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-muted-foreground">{t("support.statuses.closed")}</span>
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
                            <TableHead>{t("projects.tickets.subject")}</TableHead>
                            <TableHead>{t("support.category")}</TableHead>
                            <TableHead>{t("common.status")}</TableHead>
                            <TableHead>{t("projects.tickets.priorityLabel")}</TableHead>
                            <TableHead>{t("projects.tickets.assignedTo")}</TableHead>
                            <TableHead>{t("customers.tickets.columns.lastActivity")}</TableHead>
                            <TableHead>{t("projects.tickets.created")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTickets.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                    <Ticket className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                    <p>{t("projects.tickets.empty")}</p>
                                    <Button variant="link" onClick={() => setDialogOpen(true)} className="mt-2">
                                        {t("projects.tickets.createFirst")}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredTickets.map((ticket) => (
                                <TableRow
                                    key={ticket.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => setSelectedTicketId(ticket.id)}
                                >
                                    <TableCell className="font-medium max-w-[250px]">
                                        <div className="flex items-center gap-2">
                                            {ticket.status === "open" && (
                                                <span className="h-2 w-2 rounded-full bg-blue-500" />
                                            )}
                                            <span className="truncate">{ticket.subject}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{ticket.category || "-"}</TableCell>
                                    <TableCell>
                                        <StatusBadge status={ticket.status} />
                                    </TableCell>
                                    <TableCell>
                                        <PriorityBadge priority={ticket.priority} />
                                    </TableCell>
                                    <TableCell>
                                        {ticket.assignedAgentId ? (
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarFallback className="text-xs">
                                                        {(staffMap.get(ticket.assignedAgentId) || "U").charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm">
                                                    {staffMap.get(ticket.assignedAgentId) || t("common.unknown")}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">
                                                {t("projects.tickets.unassigned")}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {ticket.updatedAt?.toDate
                                            ? formatDistanceToNow(ticket.updatedAt.toDate(), { addSuffix: true })
                                            : "-"}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {ticket.createdAt?.toDate && format(ticket.createdAt.toDate(), "MMM d, yyyy")}
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
    customerName,
    updateTicketStatus,
    assignTicket,
    onTicketChanged,
    staff,
}: {
    ticket: SupportTicket;
    onBack: () => void;
    customerName?: string;
    updateTicketStatus: (id: string, status: SupportTicketStatus) => Promise<void>;
    assignTicket: (id: string, staffId: string) => Promise<void>;
    onTicketChanged: () => Promise<void> | void;
    staff: Array<{ id: string; firstName: string; lastName: string }>;
}) {
    const { t } = useTranslation();
    // Canonical thread: tickets/{id}/messages (TicketMessage), not support_tickets/{id}/messages.
    const { messages, loading: repliesLoading, sendMessage } = useSupportTicketMessages(ticket.id);
    const [replyText, setReplyText] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleAddReply = async () => {
        if (!replyText.trim()) return;
        setSubmitting(true);
        try {
            await sendMessage(replyText.trim(), false);
            // TicketService.addMessage also flips the ticket to "waiting_on_customer" and
            // bumps updatedAt. Without this refetch the status badge, the list row and the
            // stat cards keep showing the pre-reply state until a full reload.
            await onTicketChanged();
            setReplyText("");
            toast.success(t("projects.tickets.replySentToast"));
        } catch {
            toast.error(t("projects.tickets.replyFailedToast"));
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (newStatus: SupportTicketStatus) => {
        try {
            await updateTicketStatus(ticket.id, newStatus);
            toast.success(t("projects.tickets.statusUpdatedToast", { status: t(`support.statuses.${newStatus}`) }));
        } catch {
            toast.error(t("projects.tickets.statusUpdateFailedToast"));
        }
    };

    const handleAssign = async (staffId: string) => {
        try {
            await assignTicket(ticket.id, staffId);
            toast.success(t("projects.tickets.assignedToast"));
        } catch {
            toast.error(t("projects.tickets.assignFailedToast"));
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <button onClick={onBack} className="mt-1 p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="h-5 w-5 text-gray-500" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold">{ticket.subject}</h2>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span>{ticket.category || "-"}</span>
                            <span>•</span>
                            <span>
                                {t("projects.tickets.createdPrefix")}{" "}
                                {ticket.createdAt?.toDate &&
                                    formatDistanceToNow(ticket.createdAt.toDate(), { addSuffix: true })}
                            </span>
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
                    {/* The body typed into the New Ticket dialog is stored as `description`.
                        Nothing rendered it, so the reporter's own text was invisible to the
                        agent reading the ticket — it lives above the reply thread now. */}
                    {ticket.description && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium">{t("projects.tickets.message")}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
                            </CardContent>
                        </Card>
                    )}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" />
                                {t("projects.tickets.conversation", { count: messages.length })}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {repliesLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="animate-spin" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    <p>{t("projects.tickets.noMessages")}</p>
                                </div>
                            ) : (
                                <ScrollArea className="max-h-[400px] pr-4">
                                    <div className="space-y-4">
                                        {messages.map((message) => {
                                            const fromStaff = message.senderType !== "customer";
                                            return (
                                                <div
                                                    key={message.id}
                                                    className={`flex gap-3 ${fromStaff ? "flex-row-reverse" : ""}`}
                                                >
                                                    <Avatar className="h-8 w-8 shrink-0">
                                                        <AvatarFallback
                                                            className={
                                                                fromStaff ? "bg-blue-100 text-blue-700" : "bg-gray-100"
                                                            }
                                                        >
                                                            {fromStaff ? "S" : "C"}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className={`flex-1 ${fromStaff ? "text-right" : ""}`}>
                                                        <div
                                                            className={`inline-block p-3 rounded-lg max-w-[80%] ${
                                                                fromStaff ? "bg-blue-50 text-left" : "bg-gray-50"
                                                            }`}
                                                        >
                                                            <p className="text-sm whitespace-pre-wrap">
                                                                {message.body}
                                                            </p>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {fromStaff
                                                                ? t("projects.tickets.staff")
                                                                : t("projects.tickets.customer")}{" "}
                                                            •{" "}
                                                            {message.createdAt?.toDate &&
                                                                formatDistanceToNow(message.createdAt.toDate(), {
                                                                    addSuffix: true,
                                                                })}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            )}

                            {/* Reply Input */}
                            <div className="flex gap-2 mt-4 pt-4 border-t">
                                <Textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder={t("projects.tickets.replyPlaceholder")}
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
                            <CardTitle className="text-sm font-medium">{t("projects.tickets.detailsTitle")}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-xs text-muted-foreground">{t("common.status")}</label>
                                <Select value={ticket.status} onValueChange={handleStatusChange}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="open">{t("support.statuses.open")}</SelectItem>
                                        <SelectItem value="in_progress">{t("support.statuses.in_progress")}</SelectItem>
                                        <SelectItem value="waiting_on_customer">
                                            {t("support.statuses.waiting_on_customer")}
                                        </SelectItem>
                                        <SelectItem value="resolved">{t("support.statuses.resolved")}</SelectItem>
                                        <SelectItem value="closed">{t("support.statuses.closed")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">
                                    {t("projects.tickets.assignedTo")}
                                </label>
                                <Select value={ticket.assignedAgentId || ""} onValueChange={handleAssign}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder={t("projects.tickets.unassigned")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {staff.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.firstName} {s.lastName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">
                                    {t("projects.tickets.priorityLabel")}
                                </label>
                                <div className="mt-1">
                                    <PriorityBadge priority={ticket.priority} />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">{t("support.category")}</label>
                                <p className="text-sm font-medium mt-1">{ticket.category || "-"}</p>
                            </div>
                            {customerName && (
                                <div>
                                    <label className="text-xs text-muted-foreground">
                                        {t("projects.tickets.customer")}
                                    </label>
                                    <p className="text-sm font-medium mt-1">{customerName}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
