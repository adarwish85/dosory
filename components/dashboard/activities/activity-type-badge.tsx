"use client";

import { Badge } from "@/components/ui/badge";
import { Phone, Mail, Calendar, UserCheck } from "lucide-react";
import type { ActivityType } from "@/lib/types";
import { useTranslation } from "@/lib/i18n";

const typeConfig: Record<ActivityType, { icon: React.ElementType; bg: string; text: string; labelKey: string }> = {
    meeting: { icon: Calendar, bg: "bg-purple-100", text: "text-purple-700", labelKey: "activities.type.meeting" },
    call: { icon: Phone, bg: "bg-blue-100", text: "text-blue-700", labelKey: "activities.type.call" },
    follow_up: { icon: UserCheck, bg: "bg-amber-100", text: "text-amber-700", labelKey: "activities.type.followUp" },
    email: { icon: Mail, bg: "bg-green-100", text: "text-green-700", labelKey: "activities.type.email" },
};

interface ActivityTypeBadgeProps {
    type: ActivityType;
    showLabel?: boolean;
    size?: "sm" | "default";
}

export function ActivityTypeBadge({ type, showLabel = true, size = "default" }: ActivityTypeBadgeProps) {
    const { t } = useTranslation();
    const config = typeConfig[type];
    const Icon = config.icon;

    return (
        <Badge
            variant="outline"
            className={`${config.bg} ${config.text} border-0 gap-1.5 ${size === "sm" ? "text-xs px-1.5 py-0.5" : ""}`}
        >
            <Icon className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
            {showLabel && <span>{t(config.labelKey)}</span>}
        </Badge>
    );
}
