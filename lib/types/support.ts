import { Timestamp } from "firebase/firestore";

// Status & Priority
export type SupportTicketPriority = "low" | "medium" | "high" | "critical";

export type SupportTicketStatus = "open" | "in_progress" | "waiting_on_customer" | "resolved" | "closed";

export type TicketSource = "manual" | "email" | "web_form";
export type TicketSlaStatus = "on_track" | "at_risk" | "breached";
export type MessageSenderType = "customer" | "agent" | "system";

// Core Ticket Type
export interface SupportTicket {
    id: string;
    tenantId: string;

    // Core Info
    subject: string;
    description: string;
    status: SupportTicketStatus;
    priority: SupportTicketPriority;
    category: string; // e.g., Billing, Technical, Feature Request
    source: "email" | "portal" | "phone" | "chat" | "manual";

    // Assignment
    assignedAgentId: string | null;
    customerId: string | null; // Optional link to CRM Customer

    // SLA Tracking
    slaResponseDueAt: Timestamp | null;
    slaResolutionDueAt: Timestamp | null;
    slaStatus: "on_track" | "at_risk" | "breached";

    // Metadata
    metadata?: Record<string, string | number | boolean | null>; // For linking to Invoice ID, Project ID, etc.

    // Timestamps
    createdAt: Timestamp;
    updatedAt: Timestamp;
    closedAt?: Timestamp;
}

export interface TicketMessage {
    id: string;
    ticketId: string;
    tenantId: string;
    senderType: MessageSenderType;
    senderId: string | null; // Null for system messages
    senderName?: string; // Cache for display
    senderAvatar?: string; // Cache for display

    body: string; // HTML supported
    isInternal: boolean;

    attachments?: Array<{
        name: string;
        url: string;
        type: string;
        size: number;
    }>;

    metadata?: {
        emailMessageId?: string;
        [key: string]: string | number | boolean | null | undefined;
    };

    createdAt: Timestamp;
}

export interface SupportSettings {
    id: string; // "support"
    tenantId: string;

    categories: string[];

    slaRules: {
        low: { responseHours: number; resolutionHours: number };
        medium: { responseHours: number; resolutionHours: number };
        high: { responseHours: number; resolutionHours: number };
        critical: { responseHours: number; resolutionHours: number };
    };

    autoAssignRules?: Array<{
        category: string;
        agentId: string;
    }>;

    cannedResponses?: Array<CannedResponse>;
}

export interface CannedResponse {
    id: string;
    title: string;
    body: string;
    category?: string;
    createdBy: string;
    createdAt: Timestamp;
}
