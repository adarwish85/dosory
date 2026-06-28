"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Bell,
    Check,
    CheckCheck,
    Loader2,
    FileText,
    DollarSign,
    FolderKanban,
    Target,
    LifeBuoy,
    Users,
    Megaphone,
    Clock,
} from "lucide-react";
import { useNotifications, NotificationType } from "@/lib/hooks/use-notifications";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "@/lib/i18n";

// Icon mapping for notification types
const getNotificationIcon = (type: NotificationType) => {
    if (type.startsWith("invoice")) return <DollarSign className="h-5 w-5 text-green-600" />;
    if (type.startsWith("estimate")) return <FileText className="h-5 w-5 text-blue-600" />;
    if (type.startsWith("task") || type.startsWith("project"))
        return <FolderKanban className="h-5 w-5 text-purple-600" />;
    if (type.startsWith("lead")) return <Target className="h-5 w-5 text-orange-600" />;
    if (type.startsWith("ticket") || type.startsWith("platform_ticket"))
        return <LifeBuoy className="h-5 w-5 text-cyan-600" />;
    if (type.startsWith("staff")) return <Users className="h-5 w-5 text-indigo-600" />;
    if (type.startsWith("system")) return <Megaphone className="h-5 w-5 text-gray-600" />;
    return <Bell className="h-5 w-5 text-gray-600" />;
};

export default function NotificationsPage() {
    const { t } = useTranslation();
    const { notifications, loading, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
    const [markingAll, setMarkingAll] = useState(false);

    const filteredNotifications = activeTab === "unread" ? notifications.filter((n) => !n.read) : notifications;

    const handleMarkAllRead = async () => {
        setMarkingAll(true);
        try {
            await markAllAsRead();
        } finally {
            setMarkingAll(false);
        }
    };

    const handleNotificationClick = async (notification: (typeof notifications)[0]) => {
        if (!notification.read) {
            await markAsRead(notification.id);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Bell className="h-6 w-6 text-blue-600" />
                    <h1 className="text-2xl font-semibold text-gray-900">{t("notifications.title")}</h1>
                    {unreadCount > 0 && (
                        <Badge className="bg-red-500 text-white">{t("notifications.newCount", { count: unreadCount })}</Badge>
                    )}
                </div>
                {unreadCount > 0 && (
                    <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={markingAll}>
                        {markingAll ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <CheckCheck className="mr-2 h-4 w-4" />
                        )}
                        {t("notifications.markAllAsRead")}
                    </Button>
                )}
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "unread")}>
                <TabsList>
                    <TabsTrigger value="all">{t("notifications.tabAll")}</TabsTrigger>
                    <TabsTrigger value="unread" className="gap-1">
                        {t("notifications.tabUnread")}
                        {unreadCount > 0 && (
                            <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5">
                                {unreadCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                    {filteredNotifications.length === 0 ? (
                        <div className="bg-white rounded-lg border p-10 text-center">
                            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                {activeTab === "unread"
                                    ? t("notifications.emptyUnreadTitle")
                                    : t("notifications.emptyAllTitle")}
                            </h3>
                            <p className="text-gray-500">
                                {activeTab === "unread"
                                    ? t("notifications.emptyUnreadDescription")
                                    : t("notifications.emptyAllDescription")}
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg border divide-y">
                            {filteredNotifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "p-4 hover:bg-gray-50 transition-colors cursor-pointer",
                                        !notification.read && "bg-blue-50/50"
                                    )}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    {notification.link ? (
                                        <Link href={notification.link} className="flex items-start gap-4">
                                            <NotificationContent notification={notification} />
                                        </Link>
                                    ) : (
                                        <div className="flex items-start gap-4">
                                            <NotificationContent notification={notification} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function NotificationContent({ notification }: { notification: any }) {
    return (
        <>
            <div className="flex-shrink-0 mt-0.5">
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                    {getNotificationIcon(notification.type)}
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <p className={cn("text-sm", !notification.read && "font-semibold")}>{notification.title}</p>
                        <p className="text-sm text-gray-600 mt-0.5">{notification.message}</p>
                    </div>
                    {!notification.read && (
                        <div className="flex-shrink-0">
                            <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                </div>
            </div>
        </>
    );
}
