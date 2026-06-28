"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLead } from "./lead-context";
import {
    LayoutDashboard,
    User,
    StickyNote,
    CheckSquare,
    Calculator,
    Paperclip,
    Bell,
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Phone,
    Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useActivities } from "@/lib/hooks/use-activities";
import { useFiles } from "@/lib/hooks/use-files";
import { useTasks } from "@/lib/hooks/use-projects";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTranslation } from "@/lib/i18n";

const LEAD_SIDEBAR_KEY = "lead_sidebar_collapsed";

export function LeadSidebar() {
    const pathname = usePathname();
    const { leadId, lead } = useLead();
    const { profile } = useUserProfile();
    const { t } = useTranslation();
    const [collapsed, setCollapsed] = useState(true); // Default collapsed

    // Local state for counts of items not covered by standard hooks or that require specific sub-collections
    const [remindersCount, setRemindersCount] = useState(0);
    const [notesCount, setNotesCount] = useState(0);

    // Fetch counts using correct hook signatures
    const { activities } = useActivities({ relatedToType: "lead", relatedToId: leadId || "" });
    const { files } = useFiles({ relatedTo: { type: "lead", id: leadId || "" } });
    const { tasks } = useTasks({ relatedTo: { type: "lead", id: leadId || "" } });

    // Fetch reminders count (from leadReminders collection)
    useEffect(() => {
        if (!leadId || !profile?.orgId) return;

        const q = query(
            collection(db, "leadReminders"),
            where("leadId", "==", leadId),
            where("orgId", "==", profile.orgId)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                setRemindersCount(snapshot.docs.length);
            },
            (error) => {
                console.error("Error subscribing to leadReminders:", error);
            }
        );

        return () => unsubscribe();
    }, [leadId, profile?.orgId]);

    // Fetch notes count (from leadNotes collection)
    useEffect(() => {
        if (!leadId || !profile?.orgId) return;

        const q = query(
            collection(db, "leadNotes"),
            where("leadId", "==", leadId),
            where("orgId", "==", profile.orgId)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                setNotesCount(snapshot.docs.length);
            },
            (error) => {
                console.error("Error subscribing to leadNotes:", error);
            }
        );

        return () => unsubscribe();
    }, [leadId, profile?.orgId]);

    // Load preference from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(LEAD_SIDEBAR_KEY);
        if (saved !== null) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCollapsed(saved === "true");
        }
    }, []);

    // Save preference to localStorage when changed
    const handleToggleCollapse = () => {
        const newValue = !collapsed;
        setCollapsed(newValue);
        localStorage.setItem(LEAD_SIDEBAR_KEY, String(newValue));
    };

    const menuItems = [
        { icon: LayoutDashboard, label: t("leads.sidebar.overview"), href: `/dashboard/leads/${leadId}`, count: 0 },
        { icon: User, label: t("leads.sidebar.profile"), href: `/dashboard/leads/${leadId}/profile`, count: 0 },
        {
            icon: Phone,
            label: t("leads.sidebar.activities"),
            href: `/dashboard/leads/${leadId}/activities`,
            count: activities?.length || 0,
        },
        { icon: Briefcase, label: t("leads.sidebar.deal"), href: `/dashboard/leads/${leadId}/deal`, count: lead?.deal ? 1 : 0 },
        { icon: Calculator, label: t("leads.sidebar.estimates"), href: `/dashboard/leads/${leadId}/estimates`, count: 0 }, // Tasks: Estimates not yet implemented
        { icon: CheckSquare, label: t("leads.sidebar.tasks"), href: `/dashboard/leads/${leadId}/tasks`, count: tasks?.length || 0 },
        { icon: Bell, label: t("leads.sidebar.reminders"), href: `/dashboard/leads/${leadId}/reminders`, count: remindersCount },
        { icon: Paperclip, label: t("leads.sidebar.files"), href: `/dashboard/leads/${leadId}/files`, count: files?.length || 0 },
        { icon: StickyNote, label: t("leads.sidebar.notes"), href: `/dashboard/leads/${leadId}/notes`, count: notesCount },
    ];

    return (
        <TooltipProvider delayDuration={0}>
            <div
                className={cn(
                    "border-r bg-gray-50/50 h-full py-4 flex flex-col transition-all duration-300 relative",
                    collapsed ? "w-16" : "w-[200px]"
                )}
            >
                {/* Edge Toggle Button - Fixed Position */}
                <button
                    onClick={handleToggleCollapse}
                    className="absolute -right-3 top-16 z-10 h-6 w-6 bg-white border border-gray-200 rounded-md shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                    {collapsed ? (
                        <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                    ) : (
                        <ChevronLeft className="h-3.5 w-3.5 text-gray-500" />
                    )}
                </button>

                {/* Back Button */}
                <div className={cn("mb-2", collapsed ? "px-2" : "px-4")}>
                    {collapsed ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Link href="/dashboard/leads">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-gray-500 hover:text-gray-700 w-full"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent side="right">{t("leads.sidebar.backToLeads")}</TooltipContent>
                        </Tooltip>
                    ) : (
                        <Link href="/dashboard/leads">
                            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                {t("leads.sidebar.backToLeads")}
                            </Button>
                        </Link>
                    )}
                </div>

                {/* Navigation */}
                <nav className="space-y-1 flex-1 overflow-y-auto mt-4">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;

                        if (collapsed) {
                            return (
                                <Tooltip key={item.href}>
                                    <TooltipTrigger asChild>
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                "flex items-center justify-center py-3 transition-colors relative",
                                                isActive
                                                    ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                                                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-l-4 border-transparent"
                                            )}
                                        >
                                            <item.icon className="h-5 w-5" />
                                            {item.count > 0 && (
                                                <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                                                </span>
                                            )}
                                        </Link>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        {item.label} {item.count > 0 && `(${item.count})`}
                                    </TooltipContent>
                                </Tooltip>
                            );
                        }

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center justify-between px-4 py-2 text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-l-4 border-transparent"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                </div>
                                {item.count > 0 && (
                                    <Badge
                                        variant="secondary"
                                        className="text-[10px] h-5 px-1.5 min-w-[20px] justify-center"
                                    >
                                        {item.count}
                                    </Badge>
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </TooltipProvider>
    );
}
