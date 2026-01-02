import {
    collection,
    doc,
    addDoc,
    updateDoc,
    serverTimestamp,
    query,
    where,
    orderBy,
    getDocs,
    getDoc,
    Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    SupportTicket,
    SupportTicketStatus,
    TicketMessage,
    SupportSettings,
    SupportTicketPriority,
} from "@/lib/types/support";

const TICKETS_COLLECTION = "tickets";
const TICKET_MESSAGES_COLLECTION = "messages";
const SETTINGS_COLLECTION = "settings";

export class TicketService {
    // --- SLA Config ---
    // (Default config, could be moved to DB)
    static DEFAULT_SLA: Record<SupportTicketPriority, { responseHours: number; resolutionHours: number }> = {
        low: { responseHours: 24, resolutionHours: 72 },
        medium: { responseHours: 8, resolutionHours: 48 },
        high: { responseHours: 4, resolutionHours: 24 },
        critical: { responseHours: 1, resolutionHours: 8 },
    };

    static calculateSlaDates(
        priority: SupportTicketPriority,
        settings?: SupportSettings
    ): { response: Date; resolution: Date } {
        const now = new Date();
        const rules = settings?.slaRules?.[priority] || this.getDefaultSlaRules(priority);

        const responseDue = new Date(now.getTime() + rules.responseHours * 60 * 60 * 1000);
        const resolutionDue = new Date(now.getTime() + rules.resolutionHours * 60 * 60 * 1000);

        return { response: responseDue, resolution: resolutionDue };
    }

    static getDefaultSlaRules(priority: SupportTicketPriority) {
        switch (priority) {
            case "critical":
                return { responseHours: 1, resolutionHours: 4 };
            case "high":
                return { responseHours: 4, resolutionHours: 24 };
            case "medium":
                return { responseHours: 8, resolutionHours: 48 };
            case "low":
                return { responseHours: 24, resolutionHours: 72 };
            default:
                return { responseHours: 24, resolutionHours: 72 };
        }
    }

    static getSlaStatus(ticket: SupportTicket): "on_track" | "at_risk" | "breached" {
        if (ticket.status === "closed" || ticket.status === "resolved") return "on_track";

        const now = new Date();
        if (ticket.slaResolutionDueAt && ticket.slaResolutionDueAt.toDate() < now) return "breached";

        // Define "at risk" as within 2 hours of breach
        const twoHours = 2 * 60 * 60 * 1000;
        if (ticket.slaResolutionDueAt && ticket.slaResolutionDueAt.toDate().getTime() - now.getTime() < twoHours) {
            return "at_risk";
        }

        return "on_track";
    }

    // --- Ticket Operations ---

    static async createTicket(
        data: Omit<
            SupportTicket,
            "id" | "createdAt" | "updatedAt" | "slaResponseDueAt" | "slaResolutionDueAt" | "slaStatus"
        >
    ) {
        // Calculate SLA
        const { response, resolution } = this.calculateSlaDates(data.priority);

        await addDoc(collection(db, TICKETS_COLLECTION), {
            ...data,
            slaResponseDueAt: Timestamp.fromDate(response),
            slaResolutionDueAt: Timestamp.fromDate(resolution),
            slaStatus: "on_track",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    }

    static async getTickets(
        tenantId: string,
        filters: {
            status?: SupportTicketStatus;
            priority?: SupportTicketPriority;
            agentId?: string;
            customerId?: string;
        } = {}
    ): Promise<SupportTicket[]> {
        let q = query(
            collection(db, TICKETS_COLLECTION),
            where("tenantId", "==", tenantId),
            orderBy("createdAt", "desc")
        );

        if (filters.status) {
            q = query(q, where("status", "==", filters.status));
        }
        if (filters.priority) {
            q = query(q, where("priority", "==", filters.priority));
        }
        if (filters.agentId) {
            q = query(q, where("assignedAgentId", "==", filters.agentId));
        }
        if (filters.customerId) {
            q = query(q, where("customerId", "==", filters.customerId));
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as SupportTicket);
    }

    static async getTicket(id: string): Promise<SupportTicket | null> {
        const docRef = await getDoc(doc(db, TICKETS_COLLECTION, id));
        if (!docRef.exists()) return null;
        return { id: docRef.id, ...docRef.data() } as SupportTicket;
    }

    static async updateTicket(id: string, updates: Partial<SupportTicket>) {
        const docRef = doc(db, TICKETS_COLLECTION, id);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        });
    }

    // --- Message Operations ---

    static async getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
        const q = query(
            collection(db, TICKETS_COLLECTION, ticketId, TICKET_MESSAGES_COLLECTION),
            orderBy("createdAt", "asc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as TicketMessage);
    }

    static async addMessage(ticketId: string, messageData: Omit<TicketMessage, "id" | "createdAt">) {
        const ticketRef = doc(db, TICKETS_COLLECTION, ticketId);

        // Add message
        await addDoc(collection(ticketRef, TICKET_MESSAGES_COLLECTION), {
            ...messageData,
            createdAt: serverTimestamp(),
        });

        // Auto-update ticket status based on logic
        let newStatus: SupportTicketStatus | undefined;

        if (messageData.senderType === "customer") {
            newStatus = "open"; // Re-open if customer replies
        } else if (messageData.senderType === "agent" && !messageData.isInternal) {
            newStatus = "waiting_on_customer"; // Wait for customer        // Update ticket last activity and status
        }

        // Update ticket last activity and status
        const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
        if (newStatus) {
            updates.status = newStatus;
        }

        await updateDoc(ticketRef, updates);
    }

    // --- Settings ---

    static async getSettings(tenantId: string): Promise<SupportSettings | undefined> {
        const docRef = doc(db, SETTINGS_COLLECTION, `${tenantId}_support`);
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) return undefined;
        return snapshot.data() as SupportSettings;
    }
}
