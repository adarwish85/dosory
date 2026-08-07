import { useState, useEffect, useCallback } from "react";
import { SupportTicket, SupportTicketStatus, SupportTicketPriority } from "@/lib/types/support";
import { TicketService } from "@/lib/services/ticket-service";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { TicketMessage } from "@/lib/types/support";

interface UseTicketsOptions {
    status?: SupportTicketStatus;
    priority?: SupportTicketPriority;
    agentId?: string;
    customerId?: string;
    projectId?: string;
}

export function useSupportTickets(options: UseTicketsOptions = {}) {
    const { profile, loading: profileLoading } = useUserProfile();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchTickets = useCallback(async () => {
        if (!profile?.orgId) {
            // Must clear `loading`, not just bail: consumers gate their whole page on it, so
            // returning early with loading still true leaves them on a spinner forever.
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const data = await TicketService.getTickets(profile.orgId, options);
            // Client-side SLA status calc (since it depends on current time)
            const ticketsWithSla = data.map((t) => ({
                ...t,
                slaStatus: TicketService.getSlaStatus(t),
            }));
            setTickets(ticketsWithSla);
            setError(null);
        } catch (err) {
            console.error("Error fetching tickets:", err);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
        // options is a fresh object literal on every render, so it must NOT be a dep —
        // only the primitive filters are (Sweep A: never depend on an unstable identity).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.orgId, options.status, options.priority, options.agentId, options.customerId, options.projectId]);

    useEffect(() => {
        if (!profileLoading && profile?.orgId) {
            fetchTickets();
        }
    }, [profileLoading, profile?.orgId, fetchTickets]);

    const createTicket = async (
        data: Omit<
            SupportTicket,
            | "id"
            | "createdAt"
            | "updatedAt"
            | "closedAt"
            | "tenantId"
            | "slaResponseDueAt"
            | "slaResolutionDueAt"
            | "slaStatus"
        >
    ) => {
        if (!profile?.orgId) throw new Error("No organization");

        await TicketService.createTicket({
            ...data,
            tenantId: profile.orgId,
        });
        await fetchTickets();
    };

    const updateTicketStatus = useCallback(
        async (id: string, status: SupportTicketStatus) => {
            await TicketService.updateTicket(id, { status });
            await fetchTickets();
        },
        [fetchTickets]
    );

    const assignTicket = useCallback(
        async (id: string, agentId: string) => {
            await TicketService.updateTicket(id, { assignedAgentId: agentId, status: "in_progress" });
            await fetchTickets();
        },
        [fetchTickets]
    );

    // Counts keyed by status + `priority_<p>` + total, matching the shape the customer and
    // project ticket tabs render. Derived from the loaded page, not a separate aggregation.
    const ticketStats = tickets.reduce(
        (acc, ticket) => {
            acc[ticket.status] = (acc[ticket.status] || 0) + 1;
            acc[`priority_${ticket.priority}`] = (acc[`priority_${ticket.priority}`] || 0) + 1;
            acc.total++;
            return acc;
        },
        { total: 0 } as Record<string, number>
    );

    return {
        tickets,
        loading: loading || profileLoading,
        error,
        ticketStats,
        refresh: fetchTickets,
        createTicket,
        updateTicketStatus,
        assignTicket,
    };
}

export function useSupportTicket(id: string) {
    const { loading: profileLoading } = useUserProfile();
    const [ticket, setTicket] = useState<SupportTicket | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchTicket = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await TicketService.getTicket(id);
            if (data) {
                const ticketWithSla = {
                    ...data,
                    slaStatus: TicketService.getSlaStatus(data),
                };
                setTicket(ticketWithSla);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (!profileLoading) fetchTicket();
    }, [profileLoading, fetchTicket]);

    const updateStatus = async (status: SupportTicketStatus) => {
        if (!ticket) return;
        await TicketService.updateTicket(ticket.id, { status });
        fetchTicket();
    };

    return { ticket, loading, updateStatus, refresh: fetchTicket };
}

export function useSupportTicketMessages(ticketId: string) {
    const { profile } = useUserProfile();
    const [messages, setMessages] = useState<TicketMessage[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMessages = useCallback(async () => {
        if (!ticketId) return;
        setLoading(true);
        try {
            const data = await TicketService.getTicketMessages(ticketId);
            setMessages(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [ticketId]);

    useEffect(() => {
        fetchMessages();
        // In a real app, this should be a real-time listener
        // Since TicketService uses getDocs, we stick to polling or manual refresh for V1
        // unless we update TicketService to use onSnapshot
    }, [fetchMessages]);

    const sendMessage = async (body: string, isInternal: boolean) => {
        if (!profile) return;

        await TicketService.addMessage(ticketId, {
            ticketId,
            tenantId: profile.orgId,
            senderType: "agent",
            senderId: profile.uid,
            senderName: `${profile.firstName} ${profile.lastName}`,
            body,
            isInternal,
        });
        fetchMessages();
    };

    return { messages, loading, sendMessage, refresh: fetchMessages };
}
