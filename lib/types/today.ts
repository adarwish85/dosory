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
    action: string; // e.g., "commented on", "updated"
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
