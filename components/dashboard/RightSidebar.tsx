"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    Calendar, Clock, FolderKanban, CheckSquare, LifeBuoy,
    Plus, FileText, Users, DollarSign, Briefcase, Zap,
    FileSignature, Receipt, LayoutTemplate
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStickyNotes } from "@/lib/hooks/use-sticky-notes";

interface RightSidebarProps {
    isOpen: boolean;
    topOffset: string;
}

export function RightSidebar({ isOpen, topOffset }: RightSidebarProps) {
    const pathname = usePathname();
    const { notes, addNote, toggleNoteOpen } = useStickyNotes();
    const minimizedNotes = notes.filter(n => !n.isOpen);

    // Define context-aware actions
    const quickActions = useMemo(() => {
        // Default actions
        const defaults = [
            { label: "New Project", href: "/dashboard/projects/new", icon: FolderKanban },
            { label: "New Task", href: "/dashboard/tasks/new", icon: CheckSquare },
            { label: "Support Ticket", href: "/dashboard/support/new", icon: LifeBuoy },
        ];

        // Route-specific overrides
        if (pathname.includes("/dashboard/customers")) {
            return [
                { label: "Add Customer", href: "/dashboard/customers/new", icon: Users },
                { label: "Import Customers", href: "/dashboard/customers/import", icon: FileText },
                ...defaults.slice(0, 1) // Keep "New Project" as backup
            ];
        }

        if (pathname.includes("/dashboard/invoices") || pathname.includes("/dashboard/sales/estimates")) {
            return [
                { label: "New Invoice", href: "/dashboard/invoices/new", icon: Receipt },
                { label: "New Estimate", href: "/dashboard/sales/estimates/new", icon: FileSignature },
                { label: "Record Payment", href: "/dashboard/payments/new", icon: DollarSign },
            ];
        }

        if (pathname.includes("/dashboard/projects") || pathname.includes("/dashboard/tasks")) {
            return [
                { label: "New Project", href: "/dashboard/projects/new", icon: FolderKanban },
                { label: "New Task", href: "/dashboard/tasks/new", icon: CheckSquare },
                { label: "Log Time", href: "/dashboard/timesheets/new", icon: Clock },
            ];
        }

        if (pathname.includes("/dashboard/leads")) {
            return [
                { label: "Add Lead", href: "/dashboard/leads/new", icon: Zap },
                { label: "Import Leads", href: "/dashboard/leads/import", icon: FileText },
            ];
        }

        return defaults;
    }, [pathname]);

    return (
        <aside className={cn(
            `hidden lg:block w-[220px] fixed right-0 bottom-0 overflow-y-auto px-2 py-3 transition-transform duration-300 bg-[#F3F2EF] ${topOffset}`,
            isOpen ? "translate-x-0" : "translate-x-full"
        )}>
            {/* Context-Aware Quick Actions */}
            <div className="mb-4">
                <h3 className="text-[#65676B] font-semibold text-xs mb-2 px-2 uppercase tracking-wider">Quick Actions</h3>
                <div className="space-y-2">
                    {quickActions.map((action, index) => {
                        const Icon = action.icon;
                        return (
                            <Link key={index} href={action.href}>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start gap-2 bg-white hover:bg-gray-50 text-[#1c1e21] border-[#E0E0E0]"
                                >
                                    <Icon className="h-4 w-4 text-[#0A66C2]" />
                                    <span>{action.label}</span>
                                </Button>
                            </Link>
                        );
                    })}
                </div>
            </div>
            {/* Sticky Notes */}
            <div className="mb-4">
                <div className="flex items-center justify-between px-2 mb-2">
                    <h3 className="text-[#65676B] font-semibold text-xs uppercase tracking-wider">Sticky Notes</h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 hover:bg-black/5"
                        onClick={() => addNote()}
                    >
                        <Plus className="h-3 w-3 text-[#65676B]" />
                    </Button>
                </div>
                <div className="flex flex-wrap gap-2 px-2">
                    {minimizedNotes.map(note => {
                        const colorClass = {
                            yellow: "bg-yellow-400",
                            blue: "bg-blue-400",
                            green: "bg-green-400",
                            pink: "bg-pink-400",
                            purple: "bg-purple-400",
                            orange: "bg-orange-400",
                        }[note.color] || "bg-yellow-400";

                        return (
                            <button
                                key={note.id}
                                className={cn("w-6 h-6 rounded-full border border-black/10 hover:ring-2 ring-black/20 hover:scale-110 transition-all", colorClass)}
                                onClick={() => toggleNoteOpen(note.id, true)}
                                title="Show Note"
                            />
                        );
                    })}
                    {minimizedNotes.length === 0 && (
                        <span className="text-xs text-gray-400 italic">No minimized notes</span>
                    )}
                </div>
            </div>
        </aside>
    );
}
