"use client";

import { useActivity, getActivityMeta, type ActivityType } from "@/lib/hooks/use-activity";
import { formatDistanceToNow } from "date-fns";
import { WidgetSkeleton } from "./WidgetSkeleton";
import type { WidgetSettings, DataDensity } from "@/lib/hooks/use-dashboard-layout";

interface ActivityWidgetProps {
    settings: WidgetSettings;
    density: DataDensity;
}

export function ActivityWidget({ settings, density }: ActivityWidgetProps) {
    const limit = settings.limit || 10;
    const { activities, loading } = useActivity({ limit });

    const formatTime = (timestamp: any) => {
        if (!timestamp) return "";
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return formatDistanceToNow(date, { addSuffix: true });
        } catch {
            return "";
        }
    };

    if (loading) {
        return <WidgetSkeleton variant="list" />;
    }

    if (activities.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                <div className="text-3xl mb-2">📋</div>
                <p>No recent activity</p>
                <p className="text-xs mt-1">Activity will appear here as you work</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 space-y-1 overflow-auto">
                {activities.map((activity) => {
                    const meta = getActivityMeta(activity.type);
                    return (
                        <div
                            key={activity.id}
                            className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <div className={`shrink-0 mt-0.5 text-lg ${meta.color}`}>{meta.icon}</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-700 line-clamp-2">{activity.message}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {activity.userName && (
                                        <span className="text-xs text-gray-500 font-medium truncate max-w-[80px]">
                                            {activity.userName}
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-400">{formatTime(activity.createdAt)}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
