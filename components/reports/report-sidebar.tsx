"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, DollarSign, PieChart, Briefcase, Users, FileText } from "lucide-react";
import { useReportPermissions } from "@/components/reports/use-report-permissions";

import { LucideIcon } from "lucide-react";

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

export function ReportSidebar() {
    const pathname = usePathname();
    const permissions = useReportPermissions();

    if (permissions.loading) {
        return <div className="w-64 bg-gray-50 border-r min-h-[calc(100vh-64px)] p-4 animate-pulse" />;
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
        <nav className="w-64 bg-gray-50 border-r min-h-[calc(100vh-64px)] p-4 space-y-6 hidden lg:block">
            {visibleNav.map((section, i) => (
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
            ))}
        </nav>
    );
}
