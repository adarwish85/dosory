"use client";

import { useState } from "react";
import { Bell, Check, Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { formatDistanceToNow } from "date-fns";

export function NotificationsPopover() {
    const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
    const [open, setOpen] = useState(false);

    const getIcon = (type: string) => {
        switch (type) {
            case "success": return <CheckCircle className="h-4 w-4 text-green-500" />;
            case "warning": return <AlertTriangle className="h-4 w-4 text-amber-500" />;
            case "error": return <XCircle className="h-4 w-4 text-red-500" />;
            default: return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    const handleMarkAsRead = async (id: string, link?: string) => {
        await markAsRead(id);
        if (link) {
            window.location.href = link;
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button size="icon" className="relative bg-[#E4E6EB] hover:bg-[#D8DADF] text-[#1c1e21] rounded-full h-10 w-10">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[1rem] px-1 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold shadow-sm border border-white">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 shadow-xl rounded-xl border-gray-200">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1 text-xs text-[#0A66C2] hover:text-[#004182] hover:bg-transparent"
                            onClick={() => markAllAsRead()}
                        >
                            Mark all as read
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-[350px]">
                    {loading ? (
                        <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500 gap-2">
                            <Bell className="h-8 w-8 opacity-20" />
                            <p className="text-sm">No notifications yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "flex gap-3 p-4 hover:bg-gray-50 transition-colors cursor-pointer relative",
                                        !notification.read && "bg-blue-50/50"
                                    )}
                                    onClick={() => handleMarkAsRead(notification.id, notification.link)}
                                >
                                    <div className="mt-1 shrink-0">
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className={cn("text-sm", !notification.read ? "font-semibold text-gray-900" : "text-gray-700")}>
                                            {notification.title}
                                        </p>
                                        <p className="text-xs text-gray-500 line-clamp-2">
                                            {notification.message}
                                        </p>
                                        <p className="text-[10px] text-gray-400">
                                            {notification.createdAt ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true }) : "Just now"}
                                        </p>
                                    </div>
                                    {!notification.read && (
                                        <div className="absolute right-4 top-4 h-2 w-2 bg-[#0A66C2] rounded-full" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                <div className="p-2 border-t border-gray-100">
                    <Button variant="ghost" size="sm" className="w-full text-xs text-gray-500 h-8">
                        View all
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
