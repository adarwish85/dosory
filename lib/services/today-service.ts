import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp, orderBy, limit } from "firebase/firestore";
import { TodayDashboardData, TodayItem, MetricTile, AlertItem, ActivityFeedItem } from "@/lib/types/today";
import { Task, Invoice } from "@/lib/types";
import { SupportTicket } from "@/lib/types/support";
// Shared with the notification bell and any other reader of an assignee-style
// reference field — see the lesson-4 note in that file (Sweep E).
import { identityKeysFor } from "@/lib/utils/identity-keys";

export class TodayService {
    async getDashboardData(
        userId: string,
        role: string,
        orgId: string,
        userEmail?: string
    ): Promise<TodayDashboardData> {
        try {
            const assigneeIds = identityKeysFor(userId, userEmail);

            // 1. Fetch actionable items (Parallel)
            const [tasks, tickets, invoices] = await Promise.all([
                this.getTasks(assigneeIds, orgId),
                this.getTickets(assigneeIds, orgId),
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

    private async getTasks(assigneeIds: string[], orgId: string): Promise<TodayItem[]> {
        // Fetch tasks assigned to this user that are NOT done.
        // `status` is filtered in memory rather than with where("status","!=","done"):
        // Firestore rejects a second disjunctive clause alongside array-contains-any, and a
        // `!=` filter also silently drops documents that have no `status` field at all.
        const ref = collection(db, "tasks");
        const q = query(ref, where("orgId", "==", orgId), where("assignees", "array-contains-any", assigneeIds));

        try {
            const snap = await getDocs(q);
            return snap.docs
                .filter((d) => d.data().status !== "done")
                .map((d) => {
                    const t = d.data() as Task;
                    const dueDate = t.dueDate?.toDate?.() || null;
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
        } catch (error) {
            // Was `catch { console.error("Error fetching tasks") }` — the bare catch discarded
            // the error object, so the dashboard logged a bare string every load with nothing
            // to diagnose. The underlying failure was a missing composite index for
            // tasks(orgId, assignees ARRAY_CONTAINS, status): a FAILED_PRECONDITION is
            // invisible from the UI and only names the index it needs in the error itself.
            console.error("Error fetching tasks for Today view:", error);
            return [];
        }
    }

    private async getTickets(assigneeIds: string[], orgId: string): Promise<TodayItem[]> {
        // Reads `tickets`/`tenantId` — the collection the support UI actually writes.
        // Until 2026-08-07 this read `support_tickets`/`orgId`, which no write path had
        // targeted since the support module moved to TicketService: the query always
        // returned zero rows, so the dashboard rendered "All Caught Up!" while open tickets
        // existed. Silent because the catch below swallowed everything. See CLAUDE.md Sweep E.
        // Status is filtered in memory for the same reason as getTasks above.
        const ref = collection(db, "tickets");
        const q = query(ref, where("tenantId", "==", orgId), where("assignedAgentId", "in", assigneeIds));

        try {
            const snap = await getDocs(q);
            return snap.docs
                .filter((d) => {
                    const status = d.data().status;
                    return status !== "closed" && status !== "resolved";
                })
                .map((d) => {
                    const t = d.data() as SupportTicket;
                    return {
                        id: d.id,
                        title: t.subject,
                        type: "ticket",
                        priority: t.priority === "critical" ? "critical" : t.priority === "high" ? "high" : "medium",
                        dueDate: null, // Tickets usually rely on SLA/Last Reply
                        status: "today", // Assume actionable if open
                        relatedEntity: t.customerId
                            ? { id: t.customerId, name: "Customer", type: "customer" }
                            : undefined,
                        actionUrl: `/dashboard/support/${d.id}`,
                    };
                });
        } catch (error) {
            console.error("Error fetching tickets for Today view:", error);
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
        } catch (error) {
            // Sweep E: a catch that returns a default IS the bug. Its two siblings in this
            // file were repaired earlier; this one still reported a failed query as
            // "no overdue invoices", which is indistinguishable from good news.
            console.error("Error fetching overdue invoices for Today view:", error);
            return [];
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private async getMetrics(role: string, orgId: string, userId: string): Promise<MetricTile[]> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const startOfDay = Timestamp.fromDate(today);
        const endOfDay = Timestamp.fromDate(tomorrow);

        if (role === "admin") {
            try {
                // 1. Revenue Today
                const paymentsRef = collection(db, "payments");
                const paymentsQuery = query(
                    paymentsRef,
                    where("orgId", "==", orgId),
                    where("date", ">=", startOfDay),
                    where("date", "<", endOfDay)
                );
                const paymentsSnap = await getDocs(paymentsQuery);
                const revenueToday = paymentsSnap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

                // 2. New Leads Today
                const leadsRef = collection(db, "leads");
                const leadsQuery = query(leadsRef, where("orgId", "==", orgId), where("createdAt", ">=", startOfDay));
                const leadsSnap = await getDocs(leadsQuery); // In production, use count() aggregation
                const leadsCount = leadsSnap.size;

                // 3. Active Users
                const staffRef = collection(db, "staff");
                const staffQuery = query(staffRef, where("orgId", "==", orgId), where("status", "==", "active"));
                const staffSnap = await getDocs(staffQuery); // In production, use count() aggregation
                const staffCount = staffSnap.size;

                return [
                    {
                        id: "1",
                        label: "Revenue Today",
                        value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                            revenueToday
                        ),
                        trend: "neutral",
                    },
                    {
                        id: "2",
                        label: "New Leads",
                        value: leadsCount.toString(),
                        trend: leadsCount > 0 ? "up" : "neutral",
                    },
                    {
                        id: "3",
                        label: "Active Users",
                        value: staffCount.toString(),
                        trend: "neutral",
                    },
                ];
            } catch (error) {
                console.error("Error fetching metrics:", error);
                return [
                    { id: "1", label: "Revenue Today", value: "$0.00", trend: "neutral" },
                    { id: "2", label: "New Leads", value: "0", trend: "neutral" },
                    { id: "3", label: "Active Users", value: "-", trend: "neutral" },
                ];
            }
        } else if (role === "sales") {
            // Placeholder: Implement Sales metrics (Calls, Meetings) via helper or real collections
            return [
                { id: "1", label: "Calls Made", value: "0", trend: "neutral" },
                { id: "2", label: "Meetings", value: "0", trend: "neutral" },
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
        try {
            const ref = collection(db, "activities");
            const q = query(ref, where("orgId", "==", orgId), orderBy("createdAt", "desc"), limit(5));

            const snap = await getDocs(q);
            if (snap.empty) return [];

            return snap.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    actorName: data.actorName || "User",
                    action: data.action || "performed action",
                    target: data.targetName || data.targetId || "item",
                    targetUrl: "#", // Could be dynamic based on targetType
                    timestamp: data.createdAt as Timestamp,
                };
            });
        } catch (error) {
            console.warn("Failed to fetch activity feed:", error);
            return [];
        }
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
