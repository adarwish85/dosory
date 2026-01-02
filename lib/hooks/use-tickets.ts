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
}

export function useSupportTickets(options: UseTicketsOptions = {}) {
    const { profile, loading: profileLoading } = useUserProfile();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchTickets = useCallback(async () => {
        if (!profile?.orgId) return;

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
    }, [profile?.orgId, options.status, options.priority, options.agentId, options.customerId]);

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

    return {
        tickets,
        loading: loading || profileLoading,
        error,
        refresh: fetchTickets,
        createTicket,
    };
}

export function useSupportTicket(id: string) {
    const { profile, loading: profileLoading } = useUserProfile();
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
