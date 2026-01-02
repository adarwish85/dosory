"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    DollarSign,
    PieChart,
    Briefcase,
    Users,
    FileText,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { useReportPermissions } from "@/components/reports/use-report-permissions";

import { LucideIcon } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { TooltipProvider } from "@/components/ui/tooltip";

// Types for navigation structure
interface NavItem {
    title: string;
    href: string;
    icon?: LucideIcon;
    permission?: string;
    children?: NavItem[];
}

// Exact tree requested by user
const reportNav: NavItem[] = [
    {
        title: "Overview",
        href: "/dashboard/reports/overview",
        icon: LayoutDashboard,
        children: [{ title: "Business Health", href: "/dashboard/reports/overview/business-health" }],
    },
    {
        title: "Sales Reports",
        href: "/dashboard/reports/sales",
        icon: DollarSign,
        permission: "reports.sales.view",
        children: [
            { title: "Pipeline", href: "/dashboard/reports/sales/pipeline" },
            { title: "Revenue Summary", href: "/dashboard/reports/sales/revenue-summary" },
            { title: "Invoices", href: "/dashboard/reports/sales/invoices" },
        ],
    },
    {
        title: "Marketing Reports",
        href: "/dashboard/reports/marketing",
        icon: PieChart,
        permission: "reports.marketing.view",
        children: [
            { title: "Campaign Performance", href: "/dashboard/reports/marketing/campaign-performance" },
            { title: "Lead Sources", href: "/dashboard/reports/marketing/lead-sources" },
        ],
    },
    {
        title: "Operations Reports",
        href: "/dashboard/reports/operations",
        icon: Briefcase,
        permission: "reports.operations.view",
        children: [
            { title: "Project Status", href: "/dashboard/reports/operations/project-status" },
            { title: "Resource Utilization", href: "/dashboard/reports/operations/resource-utilization" },
        ],
    },
    {
        title: "HR Reports",
        href: "/dashboard/reports/hr",
        icon: Users,
        permission: "reports.hr.view",
        children: [
            { title: "Headcount", href: "/dashboard/reports/hr/headcount" },
            { title: "Attendance", href: "/dashboard/reports/hr/attendance" },
            { title: "Payroll Summary", href: "/dashboard/reports/hr/payroll-summary" },
        ],
    },
    {
        title: "Accounting Reports",
        href: "/dashboard/reports/accounting",
        icon: FileText,
        permission: "reports.accounting.view",
        children: [
            { title: "Profit & Loss", href: "/dashboard/reports/accounting/profit-loss" },
            { title: "Balance Sheet", href: "/dashboard/reports/accounting/balance-sheet" },
            { title: "Cash Flow", href: "/dashboard/reports/accounting/cash-flow" },
        ],
    },
];

const SIDEBAR_KEY = "report_sidebar_collapsed";

export function ReportSidebar() {
    const pathname = usePathname();
    const permissions = useReportPermissions();
    const [collapsed, setCollapsed] = useState(false);

    // Load preference
    useEffect(() => {
        const saved = localStorage.getItem(SIDEBAR_KEY);
        if (saved !== null) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCollapsed(saved === "true");
        }
    }, []);

    const handleToggleCollapse = () => {
        const newValue = !collapsed;
        setCollapsed(newValue);
        localStorage.setItem(SIDEBAR_KEY, String(newValue));
    };

    if (permissions.loading) {
        return (
            <div className="w-64 bg-gray-50 border-r min-h-[calc(100vh-64px)] p-4 animate-pulse transition-all duration-300" />
        );
    }

    const visibleNav = reportNav.filter((section) => {
        if (!section.permission) return true;

        switch (section.permission) {
            case "reports.sales.view":
                return permissions.canViewSales;
            case "reports.marketing.view":
                return permissions.canViewMarketing;
            case "reports.operations.view":
                return permissions.canViewOperations;
            case "reports.hr.view":
                return permissions.canViewHR;
            case "reports.accounting.view":
                return permissions.canViewAccounting;
            default:
                return true;
        }
    });

    return (
        <TooltipProvider delayDuration={0}>
            <nav
                className={cn(
                    "bg-gray-50 border-r min-h-[calc(100vh-64px)] flex flex-col transition-all duration-300 relative group hidden lg:flex",
                    collapsed ? "w-16 items-center py-4" : "w-64 p-4 space-y-6"
                )}
            >
                {/* Toggle Button */}
                <button
                    onClick={handleToggleCollapse}
                    className={cn(
                        "absolute -right-3 top-16 z-10 h-6 w-6 bg-white border border-gray-200 rounded-md shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
                    )}
                >
                    {collapsed ? (
                        <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                    ) : (
                        <ChevronLeft className="h-3.5 w-3.5 text-gray-500" />
                    )}
                </button>

                {visibleNav.map((section, i) => {
                    const isActive =
                        section.children?.some((child) => pathname === child.href) || pathname === section.href;

                    if (collapsed) {
                        return (
                            <HoverCard key={i} openDelay={0} closeDelay={0}>
                                <HoverCardTrigger asChild>
                                    <div
                                        className={cn(
                                            "h-10 w-10 flex items-center justify-center rounded-md cursor-pointer transition-colors mb-2",
                                            isActive
                                                ? "bg-blue-50 text-blue-600"
                                                : "text-muted-foreground hover:bg-gray-200 hover:text-gray-900"
                                        )}
                                    >
                                        {section.icon && <section.icon className="h-5 w-5" />}
                                    </div>
                                </HoverCardTrigger>
                                <HoverCardContent side="right" className="w-56 p-2" align="start">
                                    <div className="font-semibold text-sm px-2 py-1.5 mb-1 border-b">
                                        {section.title}
                                    </div>
                                    <div className="space-y-1">
                                        {section.children?.map((item) => (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={cn(
                                                    "block px-2 py-1.5 text-sm rounded-md transition-colors hover:bg-gray-100",
                                                    pathname === item.href
                                                        ? "bg-gray-100 text-primary font-medium"
                                                        : "text-muted-foreground"
                                                )}
                                            >
                                                {item.title}
                                            </Link>
                                        ))}
                                    </div>
                                </HoverCardContent>
                            </HoverCard>
                        );
                    }

                    return (
                        <div key={i} className="space-y-1">
                            <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                                {section.icon && <section.icon className="h-4 w-4" />}
                                {section.title}
                            </div>
                            {section.children?.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "block px-8 py-1.5 text-sm rounded-md transition-colors hover:bg-white hover:text-primary",
                                        pathname === item.href
                                            ? "bg-white text-primary font-medium shadow-sm ring-1 ring-gray-200"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    {item.title}
                                </Link>
                            ))}
                        </div>
                    );
                })}
            </nav>
        </TooltipProvider>
    );
}
