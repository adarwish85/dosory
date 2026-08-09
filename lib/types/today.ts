import { Timestamp } from "firebase/firestore";

export type TodayItemType = "task" | "call" | "meeting" | "ticket" | "invoice" | "follow_up";
export type TodayItemPriority = "critical" | "high" | "medium" | "low";

export interface TodayItem {
    id: string;
    title: string;
    type: TodayItemType;
    priority: TodayItemPriority;
    dueDate: Timestamp | null;
    status: "pending" | "overdue" | "today" | "upcoming";
    relatedEntity?: {
        id: string;
        name: string;
        type: "customer" | "lead" | "project" | "ticket" | "invoice";
    };
    actionUrl: string;
    meta?: Record<string, string | number>;
}

export interface MetricTile {
    id: string;
    label: string;
    value: string | number;
    trend?: "up" | "down" | "neutral";
    trendValue?: string;
    color?: string;
    icon?: string;
    actionUrl?: string;
}

export interface AlertItem {
    id: string;
    title: string;
    message: string;
    severity: "critical" | "warning" | "info";
    actionUrl: string;
    createdAt: Timestamp;
}

export interface ActivityFeedItem {
    id: string;
    actorName: string;
    actorAvatar?: string;
    /**
     * Either a bare verb phrase ("commented on") that needs `target` to complete it, OR a
     * complete phrase that already names the entity ("created project Acme site"). The audit
     * log writes the latter, so `target` is empty for those rows.
     */
    action: string;
    /** The target's NAME. Empty when `action` is already a complete phrase — never a type noun. */
    target: string;
    targetUrl: string;
    timestamp: Timestamp;
}

export interface TodayDashboardData {
    greeting: string;
    focusItems: TodayItem[]; // Top 3
    actionItems: TodayItem[]; // List
    metrics: MetricTile[];
    alerts: AlertItem[];
    feed: ActivityFeedItem[];
}
