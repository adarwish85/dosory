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

const LEAD_SIDEBAR_KEY = "lead_sidebar_collapsed";

export function LeadSidebar() {
    const pathname = usePathname();
    const { leadId } = useLead();
    const [collapsed, setCollapsed] = useState(true); // Default collapsed

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
        { icon: LayoutDashboard, label: "Overview", href: `/dashboard/leads/${leadId}` },
        { icon: User, label: "Profile", href: `/dashboard/leads/${leadId}/profile` },
        { icon: Phone, label: "Activities", href: `/dashboard/leads/${leadId}/activities` },
        { icon: Briefcase, label: "Deal", href: `/dashboard/leads/${leadId}/deal` },
        { icon: Calculator, label: "Estimates", href: `/dashboard/leads/${leadId}/estimates` },
        { icon: CheckSquare, label: "Tasks", href: `/dashboard/leads/${leadId}/tasks` },
        { icon: Bell, label: "Reminders", href: `/dashboard/leads/${leadId}/reminders` },
        { icon: Paperclip, label: "Files", href: `/dashboard/leads/${leadId}/files` },
        { icon: StickyNote, label: "Notes", href: `/dashboard/leads/${leadId}/notes` },
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
                            <TooltipContent side="right">Back to Leads</TooltipContent>
                        </Tooltip>
                    ) : (
                        <Link href="/dashboard/leads">
                            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Leads
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
                                <Tooltip key={item.label}>
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
                                        </Link>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">{item.label}</TooltipContent>
                                </Tooltip>
                            );
                        }

                        return (
                            <Link
                                key={item.label}
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
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </TooltipProvider>
    );
}
