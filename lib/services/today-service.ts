import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { TodayDashboardData, TodayItem, MetricTile, AlertItem, ActivityFeedItem } from "@/lib/types/today";
import { Task, Ticket, Invoice } from "@/lib/types";

export class TodayService {
    async getDashboardData(userId: string, role: string, orgId: string): Promise<TodayDashboardData> {
        try {
            // 1. Fetch actionable items (Parallel)
            const [tasks, tickets, invoices] = await Promise.all([
                this.getTasks(userId, orgId),
                this.getTickets(userId, orgId),
                role === "admin" || role === "finance" ? this.getOverdueInvoices(orgId) : Promise.resolve([]),
            ]);

            const allItems = [...tasks, ...tickets, ...invoices];

            // 2. Sort & Prioritize
            const sortedItems = this.prioritizeItems(allItems);

            // 3. Split into Focus (Top 3) & Actions List
            const focusItems = sortedItems.slice(0, 3);
            const actionItems = sortedItems; // Full list for tabbed view

            // 4. Get Metrics & Alerts (Role-based)
            const metrics = await this.getMetrics(role, orgId, userId);
            const alerts = this.generateAlerts(allItems);

            // 5. Get Feed
            const feed = await this.getActivityFeed(orgId, userId);

            return {
                greeting: this.getGreeting(),
                focusItems,
                actionItems,
                metrics,
                alerts,
                feed,
            };
        } catch (error) {
            console.error("Error fetching Today View data:", error);
            return this.getEmptyState();
        }
    }

    private async getTasks(userId: string, orgId: string): Promise<TodayItem[]> {
        // Fetch tasks assigned to user that are NOT done
        const ref = collection(db, "tasks");
        const q = query(
            ref,
            where("orgId", "==", orgId),
            where("assignees", "array-contains", userId),
            where("status", "!=", "done")
        );

        try {
            const snap = await getDocs(q);
            return snap.docs.map((d) => {
                const t = d.data() as Task;
                const dueDate = t.dueDate?.toDate() || null;
                const isOverdue = dueDate ? dueDate < new Date() : false;
                const isToday = dueDate ? this.isDateToday(dueDate) : false;

                return {
                    id: d.id,
                    title: t.name,
                    type: "task",
                    priority: t.priority === "urgent" ? "critical" : t.priority === "high" ? "high" : "medium",
                    dueDate: t.dueDate || null,
                    status: isOverdue ? "overdue" : isToday ? "today" : "upcoming",
                    relatedEntity: t.customerId
                        ? { id: t.customerId, name: t.projectName || "Unknown", type: "project" }
                        : undefined, // Simplify mapping
                    actionUrl: `/dashboard/tasks/${d.id}`,
                };
            });
        } catch {
            console.error("Error fetching tasks");
            return [];
        }
    }

    private async getTickets(userId: string, orgId: string): Promise<TodayItem[]> {
        const ref = collection(db, "support_tickets");
        const q = query(
            ref,
            where("orgId", "==", orgId),
            where("assignedTo", "==", userId),
            where("status", "!=", "closed")
        );

        try {
            const snap = await getDocs(q);
            return snap.docs.map((d) => {
                const t = d.data() as Ticket;
                return {
                    id: d.id,
                    title: t.subject,
                    type: "ticket",
                    priority: t.priority === "high" ? "high" : "medium",
                    dueDate: null, // Tickets usually rely on SLA/Last Reply
                    status: "today", // Assume actionable if open
                    relatedEntity: t.customerId ? { id: t.customerId, name: "Customer", type: "customer" } : undefined,
                    actionUrl: `/dashboard/support/${d.id}`,
                };
            });
        } catch {
            return [];
        }
    }

    private async getOverdueInvoices(orgId: string): Promise<TodayItem[]> {
        const ref = collection(db, "invoices");
        const q = query(ref, where("orgId", "==", orgId), where("status", "==", "overdue"));

        try {
            const snap = await getDocs(q);
            return snap.docs.map((d) => {
                const inv = d.data() as Invoice;
                return {
                    id: d.id,
                    title: `Overdue Invoice #${inv.number}`,
                    type: "invoice",
                    priority: "high",
                    dueDate: inv.dueDate,
                    status: "overdue",
                    relatedEntity: { id: inv.customerId, name: inv.customerName, type: "customer" },
                    actionUrl: `/dashboard/invoices/${d.id}`,
                    meta: { amount: inv.amountDue },
                };
            });
        } catch {
            return [];
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private async getMetrics(role: string, orgId: string, userId: string): Promise<MetricTile[]> {
        // Mock metrics for now, would replace with real aggregation calls
        if (role === "admin") {
            return [
                { id: "1", label: "Revenue Today", value: "$3,450", trend: "up", trendValue: "+12%" },
                { id: "2", label: "New Leads", value: "12", trend: "up" },
                { id: "3", label: "Active Users", value: "45", trend: "neutral" },
            ];
        } else if (role === "sales") {
            return [
                { id: "1", label: "Calls Made", value: "18", trend: "up", trendValue: "Goal: 20" },
                { id: "2", label: "Meetings", value: "3", trend: "neutral" },
                { id: "3", label: "Deals Closed", value: "$0", trend: "neutral" },
            ];
        }
        return [];
    }

    private generateAlerts(items: TodayItem[]): AlertItem[] {
        const alerts: AlertItem[] = [];
        const overdueCount = items.filter((i) => i.status === "overdue").length;

        if (overdueCount > 0) {
            alerts.push({
                id: "alert-1",
                title: "Attention Needed",
                message: `You have ${overdueCount} overdue items that require attention.`,
                severity: "warning",
                actionUrl: "#actions",
                createdAt: Timestamp.now(),
            });
        }
        return alerts;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private async getActivityFeed(orgId: string, userId: string): Promise<ActivityFeedItem[]> {
        // Mock feed for now
        return [
            {
                id: "1",
                actorName: "System",
                action: "generated daily report",
                target: "Daily Summary",
                targetUrl: "#",
                timestamp: Timestamp.now(),
            },
        ];
    }

    private prioritizeItems(items: TodayItem[]): TodayItem[] {
        // 1. Overdue & Critical
        // 2. Today & High
        // 3. Others
        return items.sort((a, b) => {
            const scoreA = this.getItemScore(a);
            const scoreB = this.getItemScore(b);
            return scoreB - scoreA;
        });
    }

    private getItemScore(item: TodayItem): number {
        let score = 0;
        if (item.status === "overdue") score += 100;
        if (item.status === "today") score += 80;
        if (item.priority === "critical") score += 50;
        if (item.priority === "high") score += 30;
        return score;
    }

    private isDateToday(date: Date): boolean {
        const today = new Date();
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    }

    private getGreeting(): string {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    }

    private getEmptyState(): TodayDashboardData {
        return {
            greeting: "Hello",
            focusItems: [],
            actionItems: [],
            metrics: [],
            alerts: [],
            feed: [],
        };
    }
}

export const todayService = new TodayService();
