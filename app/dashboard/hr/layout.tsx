"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
    Users,
    Clock,
    CalendarDays,
    DollarSign,
    Star,
    FileText,
    BarChart3,
    Settings,
} from "lucide-react";

const tabs = [
    { name: "Employees", href: "/dashboard/hr/employees", icon: Users },
    { name: "Attendance", href: "/dashboard/hr/attendance", icon: Clock },
    { name: "Leaves", href: "/dashboard/hr/leaves", icon: CalendarDays },
    { name: "Payroll", href: "/dashboard/hr/payroll", icon: DollarSign },
    { name: "Performance", href: "/dashboard/hr/performance", icon: Star },
    { name: "Documents", href: "/dashboard/hr/documents", icon: FileText },
    { name: "Reports", href: "/dashboard/hr/reports", icon: BarChart3 },
    { name: "Settings", href: "/dashboard/hr/settings", icon: Settings },
];

export default function HRLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">HR Management</h1>
                    <p className="text-gray-500 text-sm">Manage your workforce, attendance, leaves, and payroll</p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="HR Tabs">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");

                        return (
                            <Link
                                key={tab.name}
                                href={tab.href}
                                className={cn(
                                    "flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors",
                                    isActive
                                        ? "border-blue-500 text-blue-600"
                                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Content */}
            <div>{children}</div>
        </div>
    );
}
