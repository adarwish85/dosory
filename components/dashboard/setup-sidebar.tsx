"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { X, ChevronLeft } from "lucide-react";

interface SetupSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    topOffset: string; // e.g. "top-14"
}

export function SetupSidebar({ isOpen, onClose, topOffset }: SetupSidebarProps) {
    const pathname = usePathname();

    const items = [
        { label: "Staff", href: "/dashboard/setup/staff" },
        { label: "Join Requests", href: "/dashboard/setup/join-requests" },
        { label: "Roles", href: "/dashboard/setup/roles" },
        { label: "Customers", href: "/dashboard/setup/customers", hasSub: true },
        { label: "Support", href: "/dashboard/setup/support", hasSub: true },
        { label: "Leads", href: "/dashboard/setup/leads", hasSub: true },
        { label: "Finance", href: "/dashboard/setup/finance", hasSub: true },
        { label: "Contracts", href: "/dashboard/setup/contracts", hasSub: true },
        { label: "Estimate Request", href: "/dashboard/setup/estimate-request", hasSub: true },
        { label: "Modules", href: "/dashboard/setup/modules" },
        { label: "Email Templates", href: "/dashboard/setup/email-templates" },
        { label: "Custom Fields", href: "/dashboard/setup/custom-fields" },
        { label: "GDPR", href: "/dashboard/setup/gdpr" },
        { label: "Menu Setup", href: "/dashboard/setup/menu-setup", hasSub: true },
        { label: "Theme Style", href: "/dashboard/setup/theme-style" },
        { label: "Settings", href: "/dashboard/setup/settings" },
        { label: "Help", href: "/dashboard/setup/help" },
    ];

    return (
        <aside className={cn(
            "fixed left-0 z-[60] bottom-0 w-[260px] bg-[#F8F9FB] border-r border-gray-200 shadow-2xl transition-transform duration-300 flex flex-col",
            topOffset,
            isOpen ? "translate-x-0" : "-translate-x-full"
        )}>
            <div className="flex items-center justify-between px-4 py-4 border-b bg-white">
                <h2 className="font-bold text-lg text-gray-900">Setup</h2>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X className="h-5 w-5 text-gray-500" />
                </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-2 p-3 space-y-0.5">
                {items.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={cn(
                                "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-white text-[#0A66C2] shadow-sm ring-1 ring-gray-100"
                                    : "text-gray-700 hover:bg-white hover:text-gray-900 hover:shadow-sm"
                            )}
                        >
                            <span>{item.label}</span>
                            {item.hasSub && (
                                <ChevronLeft className="h-4 w-4 text-gray-400" />
                            )}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
