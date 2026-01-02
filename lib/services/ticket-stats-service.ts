import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SupportTicket } from "@/lib/types/support";

export interface TicketStats {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    slaCompliance: {
        breached: number;
        atRisk: number;
        onTrack: number;
    };
    avgResponseHours: number; // Placeholder for V1
    avgResolutionHours: number; // Placeholder for V1
}

export class TicketStatsService {
    static async getStats(tenantId: string): Promise<TicketStats> {
        // Fetch all tickets for tenant (V1: simplified sans date range)
        // In V2: implement date range filters and server-side aggregation if possible
        const q = query(collection(db, "tickets"), where("tenantId", "==", tenantId));

        const snapshot = await getDocs(q);
        const tickets = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as SupportTicket);

        const stats: TicketStats = {
            total: tickets.length,
            byStatus: {},
            byPriority: {},
            slaCompliance: { breached: 0, atRisk: 0, onTrack: 0 },
            avgResponseHours: 0,
            avgResolutionHours: 0,
        };

        const now = new Date();

        tickets.forEach((t) => {
            // Status count
            stats.byStatus[t.status] = (stats.byStatus[t.status] || 0) + 1;

            // Priority count
            stats.byPriority[t.priority] = (stats.byPriority[t.priority] || 0) + 1;

            // SLA (Simplified, calculating live instead of stored field to be safe for V1)
            const slaStatus = t.slaStatus;

            // Recalculate generic status if null/outdated just for reporting (optional)
            // Using stored 'slaStatus' which we populate on create/update

            if (slaStatus === "breached") stats.slaCompliance.breached++;
            else if (slaStatus === "at_risk") stats.slaCompliance.atRisk++;
            else stats.slaCompliance.onTrack++;
        });

        return stats;
    }
}
