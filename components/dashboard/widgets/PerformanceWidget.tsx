"use client";

import { Trophy, Medal, Award } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { WidgetSettings, DataDensity } from "@/lib/hooks/use-dashboard-layout";

interface PerformanceWidgetProps {
    settings: WidgetSettings;
    density: DataDensity;
}

// Mock leaderboard data - in real app, calculate from invoices/leads
const LEADERBOARD = [
    { id: "1", name: "Ahmed Hassan", avatar: "AH", score: 47 },
    { id: "2", name: "Sara Mohamed", avatar: "SM", score: 42 },
    { id: "3", name: "Omar Ali", avatar: "OA", score: 38 },
    { id: "4", name: "Fatima Nour", avatar: "FN", score: 31 },
    { id: "5", name: "Youssef Karim", avatar: "YK", score: 28 },
];

const RANK_ICONS = [
    { icon: Trophy, color: "text-amber-500" },
    { icon: Medal, color: "text-gray-400" },
    { icon: Award, color: "text-amber-700" },
];

export function PerformanceWidget({ settings, density }: PerformanceWidgetProps) {
    const { t } = useTranslation();
    const limit = settings.limit || 5;
    const users = LEADERBOARD.slice(0, limit);

    return (
        <div className="h-full flex flex-col">
            <div className="text-xs font-medium text-gray-500 uppercase mb-3">{t("dashboard.performance.topPerformers")}</div>

            <div className="flex-1 space-y-2 overflow-auto">
                {users.map((user, index) => {
                    const RankIcon = RANK_ICONS[index]?.icon;
                    const rankColor = RANK_ICONS[index]?.color;

                    return (
                        <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                            {/* Rank */}
                            <div className="w-6 flex items-center justify-center">
                                {RankIcon ? (
                                    <RankIcon className={`h-5 w-5 ${rankColor}`} />
                                ) : (
                                    <span className="text-sm font-medium text-gray-400">{index + 1}</span>
                                )}
                            </div>

                            {/* Avatar */}
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {user.avatar}
                            </div>

                            {/* Name */}
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{user.name}</div>
                            </div>

                            {/* Score */}
                            <div className="text-right">
                                <div className="text-sm font-bold text-gray-900">{user.score}</div>
                                <div className="text-xs text-gray-400">{t("dashboard.performance.dealsClosed")}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
