"use client";

import { MessageCircle, UserPlus, FileText, CheckCircle2 } from "lucide-react";
import type { WidgetSettings, DataDensity } from "@/lib/hooks/use-dashboard-layout";

interface ActivityWidgetProps {
    settings: WidgetSettings;
    density: DataDensity;
}

// Mock activity data - in real app, fetch from Firestore
const MOCK_ACTIVITIES = [
    { id: "1", type: "invoice", message: "Invoice #INV-001 was paid", time: "2 min ago", icon: CheckCircle2, color: "text-green-500" },
    { id: "2", type: "customer", message: "New customer: Acme Corp", time: "15 min ago", icon: UserPlus, color: "text-blue-500" },
    { id: "3", type: "note", message: "Note added to Project Alpha", time: "1 hour ago", icon: MessageCircle, color: "text-purple-500" },
    { id: "4", type: "proposal", message: "Proposal sent to TechStart", time: "2 hours ago", icon: FileText, color: "text-amber-500" },
    { id: "5", type: "task", message: "Task 'Update pricing' completed", time: "3 hours ago", icon: CheckCircle2, color: "text-green-500" },
    { id: "6", type: "customer", message: "New lead: Digital Agency", time: "4 hours ago", icon: UserPlus, color: "text-blue-500" },
];

export function ActivityWidget({ settings, density }: ActivityWidgetProps) {
    const limit = settings.limit || 10;
    const activities = MOCK_ACTIVITIES.slice(0, limit);

    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 space-y-1 overflow-auto">
                {activities.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                        No recent activity
                    </div>
                ) : (
                    activities.map((activity) => {
                        const Icon = activity.icon;
                        return (
                            <div
                                key={activity.id}
                                className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50"
                            >
                                <div className={`shrink-0 mt-0.5 ${activity.color}`}>
                                    <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-700 truncate">{activity.message}</p>
                                    <p className="text-xs text-gray-400">{activity.time}</p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
